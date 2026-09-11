# Fix Compliance lock after skipped sections + "Not Found" upload failures

## Problem 1 — Compliance stays locked when optional sections were skipped

Dashboard sections unlock in order. A section counts as passed when it has data, or when the applicant answered "No" to its Yes/No question (Work Experience, Tools, Skills, Portfolio, Certifications).

Those Yes/No answers are kept in `sessionStorage` only (`cb_skip_*`). So on a new sign-in, a returning applicant who previously skipped Tools or Portfolio has neither data nor an answer for that section, and every section after it — including Compliance — stays locked. Typing anything into the skipped section unlocks the chain again, which matches what's being reported.

There is already a bypass for this ("if a later section has data, don't block"), but Compliance is the last section in the order, so nothing comes after it and the bypass never applies.

### Fix

In `src/pages/Dashboard.tsx`:

- Change the unlock rule so only *required* sections can block: Personal Information, Education, Professional Background, Value Proposition, Work Setup. The optional five never lock anything behind them; their own Yes/No prompt still appears inside the section.
- Keep the existing "a later section already has data" bypass, and extend it so the section being checked also unlocks when Work Setup already holds saved data (covers Compliance, the last item).
- Persist the Yes/No answers per applicant in `localStorage` keyed by profile ID (`src/lib/skipAnswers.ts`), so a "No" answer survives signing out and back in instead of being lost with the session.

Result: an applicant whose Work Setup is filled from the backend can always reach Compliance, whether or not they skipped optional sections.

## Problem 2 — "Not Found" on file upload, then the save fails

The toast text comes straight from the server: the request returns HTTP 404 and the app shows the `detail` message, so the save is being rejected before it reaches the save handler.

The most likely trigger is payload size. Every uploaded file is currently sent three times inside the same JSON body — as `content_base64`, `base64`, and `data_url`. Base64 already inflates a file by ~33%, so a single 10 MB attachment becomes roughly 40 MB of JSON, and the Compliance save can carry four attachments at once. Gateways in front of the API commonly reject oversized bodies with a generic 404/HTML page, which surfaces here as "Not Found".

### Fix

In `src/lib/apiClient.ts`:

- Send each file's base64 content once. Keep `file_name`, `filename`, `content_type`, `mime_type`, `size`, and `content_base64`; drop the duplicate `base64` and `data_url` copies. This cuts the request body to about a third.
- Add a guard before sending: if the total encoded payload exceeds a safe threshold (about 15 MB), stop with a clear message naming the files to shrink, instead of letting the server reject it.
- Improve the error text so a 404/HTML response reads as "Upload failed — the file may be too large or the server is unavailable" rather than a bare "Not Found", and include the failing action in the message.

In the Compliance section (`src/pages/Dashboard.tsx`), when a save fails, keep the applicant in edit mode with their selections intact so nothing is lost on retry.

### Needs your confirmation

Dropping `base64` and `data_url` assumes the backend reads `content_base64`. If the backend actually reads one of the other two, tell me which and I'll keep that single field instead.  
  
the back end runs on this code   
  


```python
router.put("/compliance")
async def update_compliance(payload: ComplianceInfo):

    try:

        uploaded = {
            "nbi": [],
            "police": [],
            "valid_id": [],
            "proof_of_separation": []
        }

        # =====================================================
        # SAFE FIELD ACCESS (DICT OR PYDANTIC)
        # =====================================================
        def get_field(obj, key: str):
            if isinstance(obj, dict):
                return obj.get(key)
            return getattr(obj, key, None)

        # =====================================================
        # BASE64 CLEANUP
        # =====================================================
        def strip_base64(data: str | None) -> str | None:
            if not data:
                return None

            if isinstance(data, str) and "base64," in data:
                return data.split("base64,", 1)[1]

            return data

        # =====================================================
        # UPLOAD GROUP (FIXED)
        # =====================================================
        def upload_group(files, prefix: str):
            urls = []

            if not files:
                return urls

            if not isinstance(files, list):
                files = [files]

            for file_obj in files:

                try:
                    if not file_obj:
                        continue

                    base64_content = (
                        get_field(file_obj, "content_base64")
                        or get_field(file_obj, "base64")
                        or get_field(file_obj, "data_url")
                    )

                    filename = (
                        get_field(file_obj, "file_name")
                        or get_field(file_obj, "filename")
                        or f"{prefix}.jpg"
                    )

                    content_type = (
                        get_field(file_obj, "mime_type")
                        or get_field(file_obj, "content_type")
                        or "image/jpeg"
                    )

                    base64_content = strip_base64(base64_content)

                    if not base64_content:

                        continue

                    file_bytes = normalize_to_bytes(base64_content)

                    if not isinstance(file_bytes, (bytes, bytearray)):
                        raise ValueError(
                            f"Invalid bytes type: {type(file_bytes)}"
                        )


                    # =====================================================
                    # DIRECT AZURE UPLOAD (FIXED SIGNATURE)
                    # =====================================================
                    url = upload_file_to_azure(
                        file_bytes=file_bytes,
                        filename=filename,
                        content_type=content_type,
                        folder="compliance-files"
                    )

                    if url:
                        urls.append(url)


                except Exception:

                    traceback.print_exc()

            return urls

        # =====================================================
        # UPLOAD FILE GROUPS
        # =====================================================
        uploaded["nbi"] = upload_group(
            payload.nbi_clearance,
            "nbi"
        )

        uploaded["police"] = upload_group(
            payload.police_clearance,
            "police"
        )

        uploaded["valid_id"] = upload_group(
            payload.valid_id,
            "valid_id"
        )

        uploaded["proof_of_separation"] = upload_group(
            payload.proof_of_separation,
            "proof_of_separation"
        )

        # =====================================================
        # FALLBACK URLS
        # =====================================================
        nbi_urls = uploaded["nbi"] or payload.nbi_clearance_urls
        police_urls = uploaded["police"] or payload.police_clearance_urls
        valid_id_urls = uploaded["valid_id"] or payload.valid_id_urls
        proof_of_separation_urls = (
            uploaded["proof_of_separation"]
            or payload.proof_of_separation_urls
        )

        # =====================================================
        # CUSTOM FIELD BUILDER
        # =====================================================
        def cf(name: str, value):
            field_id = CUSTOM_FIELD_DICT.get(name)
            if not field_id:

                return None

            return {
                "id": field_id,
                "value": value
            }

        custom_fields = []

        custom_fields.append(
            cf(
                "I Authorize Cyberbacker to Conduct a Background Check",
                "Yes" if payload.background_check_authorized else "No"
            )
        )

        if valid_id_urls:
            custom_fields.append(
                cf("Valid ID File", json.dumps(valid_id_urls))
            )

        if nbi_urls:
            custom_fields.append(
                cf("NBI Files", json.dumps(nbi_urls))
            )

        if police_urls:
            custom_fields.append(
                cf("Police Clearance Files", json.dumps(police_urls))
            )

        if proof_of_separation_urls:
            custom_fields.append(
                cf(
                    "Proof of Separation Files",
                    json.dumps(proof_of_separation_urls)
                )
            )

        if payload.nbi_validity:
            custom_fields.append(
                cf("NBI Clearance Valid Until", payload.nbi_validity)
            )

        if payload.police_validity:
            custom_fields.append(
                cf("Police Clearance Valid Until", payload.police_validity)
            )

        custom_fields.extend([
            cf(
                "Compliance Date Change",
                datetime.now().isoformat()
            ),
            cf("Last Update Change", datetime.now().isoformat()),]
        )

        custom_fields = [
            f for f in custom_fields if f is not None
        ]


        # =====================================================
        # UPDATE GHL
        # =====================================================
        career_ghl.update_contact(
            payload.contact_id,
            {
                "customFields": custom_fields
            }
        )

        return {
            "success": True,
            "uploaded": uploaded,
            "custom_fields_sent": custom_fields
        }

    except Exception as e:
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Compliance update failed: {str(e)}"
        )
```

## Verification

- Build passes.
- With a profile that has Work Setup data and skipped optional sections, Compliance is reachable.
- Uploading a document in Compliance saves; an oversized file gives a clear size message instead of "Not Found".