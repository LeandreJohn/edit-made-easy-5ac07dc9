/**
 * Applicant-facing notifications driven by the backend `tag[]` array.
 * Tags not listed here are ignored (e.g. "profile-builder").
 */
export interface TagNotification {
  tag: string;
  message: string;
  /** Optional inline link rendered in place of the "click here" text. */
  linkLabel?: string;
  linkUrl?: string;
}

export const TAG_NOTIFICATIONS: TagNotification[] = [
  {
    tag: 'NR - NBI Processing',
    message:
      'We received your NBI application receipt. Please upload your official NBI Clearance once it has been released.',
  },
  {
    tag: 'NR - No NBI',
    message: 'Please upload your valid NBI Clearance.',
  },
  {
    tag: 'NR - Police Processing',
    message:
      'We received your Police Clearance application receipt. Please upload your official Police Clearance once it has been released.',
  },
  {
    tag: 'NR - No Police',
    message: 'Please upload your valid Police Clearance.',
  },
  {
    tag: 'NR - Blurred Document',
    message:
      'The document you uploaded is blurred and cannot be reviewed. Please upload a clear, readable image of the entire document.',
  },
  {
    tag: 'NR - Cropped Document',
    message:
      'The uploaded document is cropped. Please upload a complete image showing the entire document, including all corners and information.',
  },
  {
    tag: 'NR - Poor Upload Quality',
    message:
      "We couldn't review your document because the upload quality is too low. Please upload a higher-quality image with good lighting and ensure all details are clearly visible.",
  },
  {
    tag: 'NR - Invalid ID',
    message:
      'Please upload a valid government-issued ID. To view the list of accepted IDs, click here. Ensure your ID is clear, complete, and not expired.',
    linkLabel: 'click here',
    linkUrl: 'https://cyberbackercareers.com/faq/',
  },
  {
    tag: 'NR - Primary Device Specs Missing',
    message:
      'Please upload a screenshot of your primary device specifications showing your processor, RAM, and operating system.',
  },
  {
    tag: 'NR - Primary Speedtest Invalid',
    message:
      'Your uploaded Speedtest result could not be verified. Please run a new Speedtest and submit the shareable Speedtest link.',
  },
];

const BY_TAG = new Map(TAG_NOTIFICATIONS.map((n) => [n.tag.toLowerCase(), n]));

/** Resolve backend tags to their applicant notification, preserving order. */
export function notificationsForTags(tags: unknown): TagNotification[] {
  if (!Array.isArray(tags)) return [];
  const out: TagNotification[] = [];
  for (const t of tags) {
    if (typeof t !== 'string') continue;
    const hit = BY_TAG.get(t.trim().toLowerCase());
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}
