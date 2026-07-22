import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Link as LinkIcon } from 'lucide-react';
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
    portfolioLink: string;
    portfolioFiles: Array<{ name: string; url: string }>;
    workSetupPrimary: string[];
    workSetupSecondary: string[];
    compliance: { validId?: string; nbi?: string; police?: string; coe?: string };
  };
  onSaved?: () => void;
}

const ManageDocumentsModal = ({ open, onOpenChange, contactId, existing, onSaved }: Props) => {
  const [tab, setTab] = useState<'portfolio' | 'workSetup' | 'compliance'>('portfolio');

  // Portfolio state
  const [pLink, setPLink] = useState(existing.portfolioLink);
  const [pFiles, setPFiles] = useState<File[]>([]);
  const [pSaving, setPSaving] = useState(false);

  // Work setup state
  const [wsPrimary, setWsPrimary] = useState<File[]>([]);
  const [wsSecondary, setWsSecondary] = useState<File[]>([]);
  const [wsPrimarySpeed, setWsPrimarySpeed] = useState<File[]>([]);
  const [wsSecondarySpeed, setWsSecondarySpeed] = useState<File[]>([]);
  const [wsSaving, setWsSaving] = useState(false);

  // Compliance state
  const [validId, setValidId] = useState<File[]>([]);
  const [nbi, setNbi] = useState<File[]>([]);
  const [police, setPolice] = useState<File[]>([]);
  const [coe, setCoe] = useState<File[]>([]);
  const [cSaving, setCSaving] = useState(false);

  const requireCid = () => {
    if (!contactId) { toast.error('Not signed in.'); return false; }
    return true;
  };

  const savePortfolio = async () => {
    if (!requireCid()) return;
    setPSaving(true);
    try {
      await updatePortfolioFiles(contactId!, pLink, pFiles);
      toast.success('Portfolio updated.');
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
        primaryIspSpeedtest: wsPrimarySpeed[0] ?? null,
        secondaryIspSpeedtest: wsSecondarySpeed[0] ?? null,
      });
      toast.success('Work setup files updated.');
      setWsPrimary([]); setWsSecondary([]); setWsPrimarySpeed([]); setWsSecondarySpeed([]);
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
        policeClearance: police[0] ?? null,
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
            <div>
              <label className="form-label">Portfolio Link</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="url" className="form-input pl-9" placeholder="https://your-portfolio.com" value={pLink} onChange={(e) => setPLink(e.target.value)} />
              </div>
            </div>
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
              <FileDropzone onFilesSelected={setPFiles} label="portfolio" imagesOnly maxFiles={10} />
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={savePortfolio} disabled={pSaving} className="btn-primary inline-flex items-center gap-2">
                {pSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {pSaving ? 'Saving...' : 'Save Portfolio'}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="workSetup" className="space-y-4 pt-4">
            {existing.workSetupPrimary.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Existing Primary Device Screenshots</p>
                <div className="flex flex-wrap gap-2">{existing.workSetupPrimary.map((u, i) => <FilePreviewLink key={i} url={u} />)}</div>
              </div>
            )}
            <div>
              <label className="form-label">Primary Device Screenshots</label>
              <FileDropzone onFilesSelected={setWsPrimary} label="primary device screenshots" imagesOnly maxFiles={5} />
            </div>
            {existing.workSetupSecondary.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Existing Secondary Device Screenshots</p>
                <div className="flex flex-wrap gap-2">{existing.workSetupSecondary.map((u, i) => <FilePreviewLink key={i} url={u} />)}</div>
              </div>
            )}
            <div>
              <label className="form-label">Secondary Device Screenshots</label>
              <FileDropzone onFilesSelected={setWsSecondary} label="secondary device screenshots" imagesOnly maxFiles={5} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Primary ISP Speedtest</label>
                <FileDropzone onFilesSelected={setWsPrimarySpeed} label="primary speedtest" imagesOnly maxFiles={1} />
              </div>
              <div>
                <label className="form-label">Secondary ISP Speedtest</label>
                <FileDropzone onFilesSelected={setWsSecondarySpeed} label="secondary speedtest" imagesOnly maxFiles={1} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={saveWorkSetup} disabled={wsSaving} className="btn-primary inline-flex items-center gap-2">
                {wsSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {wsSaving ? 'Saving...' : 'Save Work Setup'}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Valid ID</label>
                {existing.compliance.validId && <div className="mb-2"><FilePreviewLink url={existing.compliance.validId} label="Existing Valid ID" /></div>}
                <FileDropzone onFilesSelected={setValidId} label="valid id" maxFiles={1} />
              </div>
              <div>
                <label className="form-label">NBI Clearance</label>
                {existing.compliance.nbi && <div className="mb-2"><FilePreviewLink url={existing.compliance.nbi} label="Existing NBI" /></div>}
                <FileDropzone onFilesSelected={setNbi} label="nbi clearance" maxFiles={1} />
              </div>
              <div>
                <label className="form-label">Police Clearance</label>
                {existing.compliance.police && <div className="mb-2"><FilePreviewLink url={existing.compliance.police} label="Existing Police" /></div>}
                <FileDropzone onFilesSelected={setPolice} label="police clearance" maxFiles={1} />
              </div>
              <div>
                <label className="form-label">Proof of Separation / COE</label>
                {existing.compliance.coe && <div className="mb-2"><FilePreviewLink url={existing.compliance.coe} label="Existing COE" /></div>}
                <FileDropzone onFilesSelected={setCoe} label="proof of separation" maxFiles={1} />
              </div>
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
