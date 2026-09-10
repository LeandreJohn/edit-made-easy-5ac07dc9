import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileDropzone from '@/components/wizard/FileDropzone';
import FilePreviewLink from '@/components/common/FilePreviewLink';
import {
  updatePortfolioFiles, updateWorkSetupFiles, updateComplianceFiles,
} from '@/lib/apiClient';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contactId: string | null;
  existing: {
    portfolioFiles: Array<{ name: string; url: string }>;
    workSetupPrimary: string[];
    workSetupSecondary: string[];
    compliance: {
      validIdFiles?: string[];
      nbiFiles?: string[];
      policeFiles?: string[];
      coeFiles?: string[];
      nbiValidity?: string;
      policeValidity?: string;
    };
  };
  onSaved?: () => void;
}

/** Renders every already-uploaded file for a document slot. */
const ExistingFiles = ({ urls, label }: { urls?: string[]; label: string }) => {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((u, i) => (
        <FilePreviewLink key={i} url={u} label={urls.length > 1 ? `${label} ${i + 1}` : `Existing ${label}`} />
      ))}
    </div>
  );
};

const ManageDocumentsModal = ({ open, onOpenChange, contactId, existing, onSaved }: Props) => {
  const [tab, setTab] = useState<'portfolio' | 'workSetup' | 'compliance'>('portfolio');

  // Portfolio
  const [pFiles, setPFiles] = useState<File[]>([]);
  const [pSaving, setPSaving] = useState(false);

  // Work setup
  const [wsPrimary, setWsPrimary] = useState<File[]>([]);
  const [wsSecondary, setWsSecondary] = useState<File[]>([]);
  const [wsSaving, setWsSaving] = useState(false);

  // Compliance
  const [validId, setValidId] = useState<File[]>([]);
  const [nbi, setNbi] = useState<File[]>([]);
  const [nbiValidity, setNbiValidity] = useState(existing.compliance.nbiValidity ?? '');
  const [police, setPolice] = useState<File[]>([]);
  const [policeValidity, setPoliceValidity] = useState(existing.compliance.policeValidity ?? '');
  const [coe, setCoe] = useState<File[]>([]);
  const [cSaving, setCSaving] = useState(false);

  // Keep the validity dates in sync with freshly loaded profile data.
  useEffect(() => {
    if (!open) return;
    setNbiValidity(existing.compliance.nbiValidity ?? '');
    setPoliceValidity(existing.compliance.policeValidity ?? '');
  }, [open, existing.compliance.nbiValidity, existing.compliance.policeValidity]);


  const requireCid = () => {
    if (!contactId) { toast.error('Not signed in.'); return false; }
    return true;
  };

  const savePortfolio = async () => {
    if (!requireCid()) return;
    setPSaving(true);
    try {
      await updatePortfolioFiles(contactId!, '', pFiles);
      toast.success('Portfolio files updated.');
      setPFiles([]);
      onSaved?.();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save portfolio.'); }
    finally { setPSaving(false); }
  };

  const saveWorkSetup = async () => {
    if (!requireCid()) return;
    setWsSaving(true);
    try {
      await updateWorkSetupFiles(contactId!, {
        primaryDeviceScreenshots: wsPrimary,
        secondaryDeviceScreenshots: wsSecondary,
      });
      toast.success('Work setup files updated.');
      setWsPrimary([]); setWsSecondary([]);
      onSaved?.();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save work setup files.'); }
    finally { setWsSaving(false); }
  };

  const saveCompliance = async () => {
    if (!requireCid()) return;
    setCSaving(true);
    try {
      await updateComplianceFiles(contactId!, {
        validId: validId[0] ?? null,
        nbiClearance: nbi[0] ?? null,
        nbiValidity,
        policeClearance: police[0] ?? null,
        policeValidity,
        proofOfSeparation: coe[0] ?? null,
      });
      toast.success('Compliance files updated.');
      setValidId([]); setNbi([]); setPolice([]); setCoe([]);
      onSaved?.();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to save compliance files.'); }
    finally { setCSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Documents</DialogTitle>
          <DialogDescription>Update your uploaded files. Each tab saves independently.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="workSetup">Work Setup</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-4 pt-4">
            {existing.portfolioFiles.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Existing files</p>
                <div className="flex flex-wrap gap-2">
                  {existing.portfolioFiles.map((f, i) => <FilePreviewLink key={i} url={f.url} name={f.name} />)}
                </div>
              </div>
            )}
            <div>
              <label className="form-label">Add / Replace Files</label>
              <FileDropzone onFilesSelected={setPFiles} label="portfolio" imagesOnly={false} maxFiles={10} />
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={savePortfolio} disabled={pSaving} className="btn-primary inline-flex items-center gap-2">
                {pSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {pSaving ? 'Saving...' : 'Save Portfolio'}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="workSetup" className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="form-label">Primary Device Screenshots</label>
              {existing.workSetupPrimary.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {existing.workSetupPrimary.map((u, i) => <FilePreviewLink key={i} url={u} />)}
                </div>
              )}
              <FileDropzone onFilesSelected={setWsPrimary} label="primary device screenshots" imagesOnly maxFiles={5} />
            </div>
            <div className="space-y-2">
              <label className="form-label">Secondary Device Screenshots</label>
              {existing.workSetupSecondary.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {existing.workSetupSecondary.map((u, i) => <FilePreviewLink key={i} url={u} />)}
                </div>
              )}
              <FileDropzone onFilesSelected={setWsSecondary} label="secondary device screenshots" imagesOnly maxFiles={5} />
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={saveWorkSetup} disabled={wsSaving} className="btn-primary inline-flex items-center gap-2">
                {wsSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {wsSaving ? 'Saving...' : 'Save Work Setup'}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="form-label">Valid ID</label>
              <ExistingFiles urls={existing.compliance.validIdFiles} label="Valid ID" />
              <FileDropzone onFilesSelected={setValidId} label="valid id" imagesOnly={false} maxFiles={1} />
            </div>

            <div className="space-y-2">
              <label className="form-label">NBI Clearance</label>
              <ExistingFiles urls={existing.compliance.nbiFiles} label="NBI Clearance" />
              <FileDropzone onFilesSelected={setNbi} label="nbi clearance" imagesOnly={false} maxFiles={1} />
              <div>
                <label className="form-label mt-2">Valid Until</label>
                <input type="date" className="form-input" value={nbiValidity} onChange={(e) => setNbiValidity(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="form-label">Police Clearance</label>
              <ExistingFiles urls={existing.compliance.policeFiles} label="Police Clearance" />
              <FileDropzone onFilesSelected={setPolice} label="police clearance" imagesOnly={false} maxFiles={1} />
              <div>
                <label className="form-label mt-2">Valid Until</label>
                <input type="date" className="form-input" value={policeValidity} onChange={(e) => setPoliceValidity(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="form-label">Proof of Separation / COE</label>
              <ExistingFiles urls={existing.compliance.coeFiles} label="COE" />
              <FileDropzone onFilesSelected={setCoe} label="proof of separation" imagesOnly={false} maxFiles={1} />
            </div>


            <div className="flex justify-end pt-2">
              <button onClick={saveCompliance} disabled={cSaving} className="btn-primary inline-flex items-center gap-2">
                {cSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {cSaving ? 'Saving...' : 'Save Compliance'}
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ManageDocumentsModal;
