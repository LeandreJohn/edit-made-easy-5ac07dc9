import { useState } from 'react';
import { toast } from 'sonner';
import FileDropzone from '@/components/wizard/FileDropzone';
import RequiredLabel from '@/components/wizard/RequiredLabel';
import SampleDocumentModal from '@/components/common/SampleDocumentModal';
import { Eye, Pencil } from 'lucide-react';
import nbiSample from '@/assets/nbi-sample.png';
import policeSample from '@/assets/police-sample.png';

export interface ComplianceFormData {
  authorized: boolean;
  validId?: File | null;
  nbiClearance?: File | null;
  policeClearance?: File | null;
  proofOfSeparation?: File | null;
  nbiValidity: string;
  policeValidity: string;
  canSubmitNbiPolice?: 'yes' | 'no' | '';
  canSubmitCoe?: 'yes' | 'no' | '';
}

export const emptyCompliance: ComplianceFormData = {
  authorized: false,
  validId: null,
  nbiClearance: null,
  policeClearance: null,
  proofOfSeparation: null,
  nbiValidity: '',
  policeValidity: '',
  canSubmitNbiPolice: '',
  canSubmitCoe: '',
};


interface ComplianceStepProps {
  data?: ComplianceFormData;
  onChange?: (data: ComplianceFormData) => void;
}

const PROOF_ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

const ComplianceStep = ({ data, onChange }: ComplianceStepProps) => {
  const [internal, setInternal] = useState<ComplianceFormData>(emptyCompliance);
  const [sampleOpen, setSampleOpen] = useState<null | 'nbi' | 'police'>(null);
  const value = data ?? internal;
  const canSubmitNbiPolice = value.canSubmitNbiPolice ?? '';
  const canSubmitCoe = value.canSubmitCoe ?? '';
  const update = <K extends keyof ComplianceFormData>(field: K, v: ComplianceFormData[K]) => {
    const next = { ...value, [field]: v };
    if (onChange) onChange(next);
    else setInternal(next);
  };
  const setCanSubmitNbiPolice = (v: 'yes' | 'no' | '') => update('canSubmitNbiPolice', v);
  const setCanSubmitCoe = (v: 'yes' | 'no' | '') => update('canSubmitCoe', v);


  const handleProofSelected = (files: File[]) => {
    const file = files[0];
    if (!file) {
      update('proofOfSeparation', null);
      return;
    }
    if (!PROOF_ACCEPTED.includes(file.type)) {
      toast.error('Proof of Separation must be a JPG, PNG, or PDF file.');
      return;
    }
    update('proofOfSeparation', file);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-foreground">Reminder</p>
        <p className="text-sm text-muted-foreground mt-1">
          Please submit complete and accurate documents. Candidates who provide everything upfront move through the process much more quickly.
        </p>
      </div>
      {/* Authorization checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.authorized}
          onChange={(e) => update('authorized', e.target.checked)}
          className="w-5 h-5 text-primary border-border rounded mt-0.5"
        />
        <span className="text-sm text-foreground font-medium">
          I authorize Cyberbacker to conduct a background check.
        </span>
      </label>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">We Prioritize the Prepared</p>
        <p>Opportunity doesn't wait — and neither do our clients.</p>
        <p>By completing your documentation within your profile, you demonstrate professionalism, readiness, and commitment to becoming part of the Cyberbacker community.</p>
        <p>This step ensures your profile is fully verified and client-ready from the start — helping you move faster from creation to potential placement.</p>
        <p>Upload clear and valid (not expired) documents.</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>
            Valid ID —{' '}
            <a
              href="https://cyberbackercareers.com/accepted-ids/"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2 font-medium inline-flex items-center gap-1 hover:no-underline"
            >
              Click on this link to see the list of accepted IDs
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </li>
          <li>NBI Clearance</li>
          <li>Police Clearance</li>
          <li>Proof of Separation / Certificate of Employment</li>
        </ul>
      </div>

      <div className="space-y-2">
        <RequiredLabel>Valid ID</RequiredLabel>
        <FileDropzone label="valid-id" imagesOnly multiple={false} maxFiles={1} initialFiles={value.validId ? [value.validId] : []} onFilesSelected={(files) => update('validId', files[0] ?? null)} />
      </div>

      {/* NBI + Police gate — hides once answered */}
      {canSubmitNbiPolice === '' ? (
        <div className="border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Are you able to submit your NBI Clearance and Police Clearance at this time?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setCanSubmitNbiPolice('yes')}
              className="btn-outline px-6"
            >
              Yes, I can submit now
            </button>
            <button
              type="button"
              onClick={() => setCanSubmitNbiPolice('no')}
              className="btn-outline px-6"
            >
              No, I'll submit later
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCanSubmitNbiPolice('')}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Change answer for NBI &amp; Police Clearance
          </button>
        </div>
      )}

      {canSubmitNbiPolice === 'yes' && (
        <>
          <div className="space-y-3 border border-border rounded-xl p-4">
            <RequiredLabel>NBI Clearance</RequiredLabel>
            <p className="text-xs text-muted-foreground">
              Please ensure that the document submitted is clear, authentic, valid, and verifiable through the official{' '}
              <a href="https://verification.nbi-clearance.io/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                NBI Clearance
              </a>{' '}
              verification portal prior to uploading.
            </p>
            <button
              type="button"
              onClick={() => setSampleOpen('nbi')}
              className="btn-outline text-xs px-3 py-1.5 inline-flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5" /> See example of document
            </button>
            <FileDropzone label="nbi-clearance" imagesOnly multiple={false} maxFiles={1} initialFiles={value.nbiClearance ? [value.nbiClearance] : []} onFilesSelected={(files) => update('nbiClearance', files[0] ?? null)} />
            <div>
              <RequiredLabel>Valid Until</RequiredLabel>
              <input
                type="date"
                className="form-input"
                value={value.nbiValidity}
                onChange={(e) => update('nbiValidity', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Indicate the validity date shown on the document.</p>
            </div>
          </div>

          <div className="space-y-3 border border-border rounded-xl p-4">
            <RequiredLabel>Police Clearance</RequiredLabel>
            <p className="text-xs text-muted-foreground">
              Please ensure that the document submitted is clear, authentic, valid, and verifiable through the official{' '}
              <a href="https://pnpclearance.ph/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Police Clearance
              </a>{' '}
              verification portal prior to uploading.
            </p>
            <button
              type="button"
              onClick={() => setSampleOpen('police')}
              className="btn-outline text-xs px-3 py-1.5 inline-flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5" /> See example of document
            </button>
            <FileDropzone label="police-clearance" imagesOnly multiple={false} maxFiles={1} initialFiles={value.policeClearance ? [value.policeClearance] : []} onFilesSelected={(files) => update('policeClearance', files[0] ?? null)} />
            <div>
              <RequiredLabel>Valid Until</RequiredLabel>
              <input
                type="date"
                className="form-input"
                value={value.policeValidity}
                onChange={(e) => update('policeValidity', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Indicate the validity date shown on the document.</p>
            </div>
          </div>
        </>
      )}

      {canSubmitNbiPolice === 'no' && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">No problem — submit them later</p>
          <p className="text-sm text-muted-foreground">
            You can submit your NBI Clearance and Police Clearance anytime through our compliance documents portal.
          </p>
          <a
            href="/compliance-docs-u"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-semibold text-primary hover:underline"
          >
            Open Compliance Documents Portal →
          </a>
        </div>
      )}

      {/* COE gate — hides once answered */}
      {canSubmitCoe === '' ? (
        <div className="border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Are you able to submit your Certificate of Employment (COE) at this time?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setCanSubmitCoe('yes')}
              className="btn-outline px-6"
            >
              Yes, I can submit now
            </button>
            <button
              type="button"
              onClick={() => setCanSubmitCoe('no')}
              className="btn-outline px-6"
            >
              No, I'll submit later
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCanSubmitCoe('')}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Change answer for Certificate of Employment
          </button>
        </div>
      )}

      {canSubmitCoe === 'yes' && (
        <div className="space-y-3 border border-border rounded-xl p-4">
          <RequiredLabel>Proof of Separation / Certificate of Employment</RequiredLabel>
          <FileDropzone
            label="proof-of-separation"
            imagesOnly={false}
            multiple={false}
            maxFiles={1}
            accept="image/jpeg,image/png,application/pdf"
            initialFiles={value.proofOfSeparation ? [value.proofOfSeparation] : []}
            onFilesSelected={handleProofSelected}
          />

          <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, or PDF. Only one file allowed.</p>
        </div>
      )}

      {canSubmitCoe === 'no' && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">No problem — submit it later</p>
          <p className="text-sm text-muted-foreground">
            You can submit your Certificate of Employment anytime through our compliance documents portal.
          </p>
          <a
            href="/compliance-docs-u"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-semibold text-primary hover:underline"
          >
            Open Compliance Documents Portal →
          </a>
        </div>
      )}

      <SampleDocumentModal
        open={sampleOpen === 'nbi'}
        onOpenChange={(o) => setSampleOpen(o ? 'nbi' : null)}
        src={nbiSample}
        title="Sample NBI Clearance"
        description="Reference only — please upload your own valid document."
      />
      <SampleDocumentModal
        open={sampleOpen === 'police'}
        onOpenChange={(o) => setSampleOpen(o ? 'police' : null)}
        src={policeSample}
        title="Sample Police Clearance"
        description="Reference only — please upload your own valid document."
      />
    </div>
  );
};

export default ComplianceStep;
