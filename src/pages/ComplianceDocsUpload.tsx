import { useState } from 'react';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import FileDropzone from '@/components/wizard/FileDropzone';
import RequiredLabel from '@/components/wizard/RequiredLabel';
import { submitComplianceDocs } from '@/lib/apiClient';

const ACCEPTED = 'image/jpeg,image/png,image/gif,application/pdf';

const ComplianceDocsUpload = () => {
  const [email, setEmail] = useState('');
  const [nbi, setNbi] = useState<File | null>(null);
  const [nbiValidity, setNbiValidity] = useState('');
  const [police, setPolice] = useState<File | null>(null);
  const [policeValidity, setPoliceValidity] = useState('');
  const [coe, setCoe] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email.');
      return;
    }
    setSubmitting(true);
    try {
      await submitComplianceDocs({
        email,
        nbiClearance: nbi,
        nbiValidity,
        policeClearance: police,
        policeValidity,
        coe,
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-muted">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl shadow-xl">
            <div className="relative h-24 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent" />
              <div className="absolute inset-0 bg-gradient-to-bl from-transparent to-primary-foreground/10" />
            </div>
            <div className="bg-card px-6 sm:px-8 pb-10 pt-8 relative text-center">
              <div className="mb-6 flex justify-center">
                <Logo className="h-16 w-auto" variant="black" />
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary mb-4">
                Thank you for submitting your compliance documents!
              </h2>
              <p className="text-sm text-foreground leading-relaxed max-w-sm mx-auto">
                Our team will review your documents and reach out to you shortly.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-8 py-10">
        <div className="mb-6 flex justify-center">
          <Logo className="h-12 w-auto" variant="black" />
        </div>
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Submit Your Compliance Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Use the form below to upload your NBI Clearance, Police Clearance, and Certificate of Employment.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <RequiredLabel>Email</RequiredLabel>
            <input
              type="email"
              required
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-3 border border-border rounded-xl p-4">
            <label className="form-label">NBI Clearance</label>
            <FileDropzone
              label="docs-nbi"
              imagesOnly={false}
              multiple={false}
              maxFiles={1}
              accept={ACCEPTED}
              onFilesSelected={(files) => setNbi(files[0] ?? null)}
            />
            <div>
              <label className="form-label">Valid Until</label>
              <input
                type="date"
                className="form-input"
                value={nbiValidity}
                onChange={(e) => setNbiValidity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 border border-border rounded-xl p-4">
            <label className="form-label">Police Clearance</label>
            <FileDropzone
              label="docs-police"
              imagesOnly={false}
              multiple={false}
              maxFiles={1}
              accept={ACCEPTED}
              onFilesSelected={(files) => setPolice(files[0] ?? null)}
            />
            <div>
              <label className="form-label">Valid Until</label>
              <input
                type="date"
                className="form-input"
                value={policeValidity}
                onChange={(e) => setPoliceValidity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 border border-border rounded-xl p-4">
            <label className="form-label">Certificate of Employment (COE)</label>
            <FileDropzone
              label="docs-coe"
              imagesOnly={false}
              multiple={false}
              maxFiles={1}
              accept={ACCEPTED}
              onFilesSelected={(files) => setCoe(files[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, or PDF.</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit Documents'}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default ComplianceDocsUpload;
