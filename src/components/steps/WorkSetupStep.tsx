import { useState, forwardRef, useImperativeHandle } from 'react';
import FileDropzone from '@/components/wizard/FileDropzone';
import RequiredLabel from '@/components/wizard/RequiredLabel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cpu, Loader2, Eye, X, Monitor, Laptop } from 'lucide-react';
import { toast } from 'sonner';
import { isSpeedtestUrl } from '@/lib/validation/stepValidation';
import windowsSampleImg from '@/assets/device-sample-windows.png';
import macSampleImg from '@/assets/device-sample-mac.png';





export interface DetectedSpecs {
  cpu: string;
  ram: string;
  storage: string;
  source: 'detected' | 'denied' | 'mobile' | '';
}

export interface WorkSetupData {
  primaryDevice: string;
  headset: boolean;
  webcam: boolean;
  secondaryDevice: string;
  primaryISP: string;
  secondaryISP: string;
  primaryISPSpeedtest?: string;
  secondaryISPSpeedtest?: string;
  deviceScreenshots?: File[];
  secondaryDeviceScreenshots?: File[];
  detectedSpecs?: DetectedSpecs;
  activeTab?: 'device' | 'isp';
  consent?: boolean;
}

export const emptyWorkSetup: WorkSetupData = {
  primaryDevice: '',
  headset: false,
  webcam: false,
  secondaryDevice: '',
  primaryISP: '',
  secondaryISP: '',
  primaryISPSpeedtest: '',
  secondaryISPSpeedtest: '',
  activeTab: 'device',
  consent: false,
};

interface WorkSetupStepProps {
  data?: WorkSetupData;
  onChange?: (data: WorkSetupData) => void;
}


export interface WorkSetupStepHandle {
  /** Returns true if the wizard may advance to the next step, false if the step handled it internally (e.g. switched tabs). */
  tryAdvance: () => boolean;
}

function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

interface UADataValues {
  architecture?: string;
  bitness?: string;
  model?: string;
  platform?: string;
  platformVersion?: string;
}

interface UAData {
  getHighEntropyValues?: (hints: string[]) => Promise<UADataValues>;
}




/** Snap an approximate disk size to the nearest common SSD/HDD capacity so
 * the output reads like a real spec (e.g. 256/512/1024 GB) instead of an
 * odd extrapolated value. */
function snapToCommonCapacity(gb: number): number {
  const buckets = [128, 240, 256, 480, 500, 512, 750, 1000, 1024, 2000, 2048, 4000, 4096, 8000, 8192];
  let best = buckets[0];
  let bestDiff = Math.abs(gb - best);
  for (const b of buckets) {
    const d = Math.abs(gb - b);
    if (d < bestDiff) { best = b; bestDiff = d; }
  }
  return best;
}

function probeGpuRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return '';
    const r = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return typeof r === 'string' ? r : '';
  } catch { return ''; }
}

/** Best-effort processor label. Browsers do not expose the exact CPU brand
 * (e.g. "AMD Ryzen 5 5600"), so we combine UA-CH high-entropy hints with the
 * WebGL renderer vendor string and core count. The field stays editable so
 * the user can correct it to match their System ▸ About page. */
function buildProcessorLabel(uaModel: string, platform: string, arch: string, gpu: string, cores: number): string {
  if (uaModel) return uaModel;

  const vendorMatch = gpu.match(/\b(Intel|AMD|Apple|Qualcomm|Snapdragon)\b/i);
  let vendor = vendorMatch ? vendorMatch[0] : '';

  const ua = navigator.userAgent || '';
  if (!vendor) {
    if (/Mac OS X|Macintosh/i.test(ua)) {
      vendor = /arm/i.test(arch) || /ARM64/i.test(ua) ? 'Apple Silicon' : 'Intel';
    } else if (/Win|Linux/i.test(platform || ua)) {
      vendor = 'x86-64';
    } else {
      vendor = 'Unknown';
    }
  }

  const coresLabel = cores ? `${cores}-Core Processor` : 'Processor';
  return `${vendor} ${coresLabel}`;
}

async function detectSystemSpecs(): Promise<DetectedSpecs> {
  if (isMobile()) {
    return { cpu: 'Applied using phone', ram: 'Applied using phone', storage: 'Applied using phone', source: 'mobile' };
  }
  try {
    const cores = navigator.hardwareConcurrency || 0;
    let arch = '';
    let platform = '';
    let model = '';

    const uaData = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
    if (uaData?.getHighEntropyValues) {
      try {
        const hv = await uaData.getHighEntropyValues(['architecture', 'bitness', 'platform', 'model']);
        arch = hv.architecture || '';
        platform = hv.platform || '';
        model = hv.model || '';
      } catch {
        /* ignore */
      }
    }

    const gpu = probeGpuRenderer();
    const cpu = buildProcessorLabel(model, platform, arch, gpu, cores);

    // Total installed RAM. Note: browsers cap navigator.deviceMemory at 8 GB
    // for fingerprinting protection, so we suffix "+" when we hit the cap.
    const ramGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    let ram = '';
    if (ramGb) ram = ramGb >= 8 ? `${ramGb}+ GB` : `${ramGb} GB`;

    // Total SSD/HDD capacity — derived from the StorageManager quota (≈60%
    // of free disk per spec), then snapped to the nearest common drive size.
    let storage = '';
    if ('storage' in navigator && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      const quota = est.quota ?? 0;
      if (quota > 0) {
        const approxTotalGb = (quota / 0.6) / 1024 / 1024 / 1024;
        storage = `${snapToCommonCapacity(approxTotalGb)} GB`;
      }
    }
    return { cpu, ram, storage, source: 'detected' };
  } catch {
    return { cpu: '', ram: '', storage: '', source: 'denied' };
  }
}



const WorkSetupStep = forwardRef<WorkSetupStepHandle, WorkSetupStepProps>(({ data, onChange }, ref) => {
  const [internal, setInternal] = useState<WorkSetupData>(emptyWorkSetup);
  const [detecting, setDetecting] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [speedtestErrors, setSpeedtestErrors] = useState<{ primary?: string; secondary?: string }>({});
  const value = data ?? internal;
  const tab: 'device' | 'isp' = value.activeTab ?? 'device';
  const consent = value.consent ?? false;

  useImperativeHandle(ref, () => ({
    tryAdvance: () => {
      if (tab === 'device') {
        const next = { ...value, activeTab: 'isp' as const };
        if (onChange) onChange(next); else setInternal(next);
        return false;
      }
      const errors: { primary?: string; secondary?: string } = {};
      const primary = (value.primaryISPSpeedtest ?? '').trim();
      const secondary = (value.secondaryISPSpeedtest ?? '').trim();
      if (primary && !isSpeedtestUrl(primary)) {
        errors.primary = 'Enter a valid speedtest.net result link (e.g. https://www.speedtest.net/result/...)';
      }
      if (secondary && !isSpeedtestUrl(secondary)) {
        errors.secondary = 'Enter a valid speedtest.net result link';
      }
      setSpeedtestErrors(errors);
      if (errors.primary || errors.secondary) {
        toast.error('Please use a valid speedtest.net link for your speed test result.');
        return false;
      }
      return true;
    },
  }), [tab, value, onChange]);



  const update = <K extends keyof WorkSetupData>(field: K, v: WorkSetupData[K]) => {
    const next = { ...value, [field]: v };
    if (onChange) onChange(next);
    else setInternal(next);
  };


  const handleDetect = async () => {
    setDetecting(true);
    try {
      const specs = await detectSystemSpecs();
      update('detectedSpecs', specs);
      if (specs.source === 'mobile') toast.info('Mobile device detected — submitted as "Applied using phone".');
      else if (specs.cpu || specs.ram || specs.storage) toast.success('System specs detected.');
      else toast.warning('Could not detect specs — submitted blank.');
    } finally {
      setDetecting(false);
    }
  };


  return (
    <div className="animate-fade-in">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Please provide accurate details about your work setup. Clients want to ensure that you have a stable and professional environment to support their business.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => update('activeTab', v as 'device' | 'isp')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="device">Device Specification</TabsTrigger>
          <TabsTrigger value="isp">ISP Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="device" className="space-y-6 animate-fade-in mt-0">


          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Required Equipment:</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>Computer (Laptop/Desktop)</li>
                <li>Noise-cancelling headset</li>
                <li>HD webcam</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground">Device Specification:</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>Intel Core i3 (6th gen and above), i5, i7 or AMD equivalent is highly required</li>
                <li>Operating System: Windows or Mac</li>
                <li>At least 8GB of RAM with 60 GB of free hard disk space available</li>
              </ul>
            </div>
          </div>

          <div>
            <RequiredLabel>Primary Device</RequiredLabel>
            <div className="flex gap-4 mt-2">
              {['Desktop', 'Laptop'].map((d) => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="primaryDevice" value={d} checked={value.primaryDevice === d} onChange={(e) => update('primaryDevice', e.target.value)} className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              { key: 'headset' as const, label: 'Do you have a noise-cancelling headset?' },
              { key: 'webcam' as const, label: 'Do you have an HD webcam?' },
            ]).map(({ key, label }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                <div className="flex gap-4 mt-2">
                  {[{ t: 'Yes', v: true }, { t: 'No', v: false }].map(({ t, v }) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={key}
                        checked={value[key] === v}
                        onChange={() => update(key, v)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm text-foreground">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="form-label">Secondary Device</label>
            <div className="flex gap-4 mt-2">
              {['Desktop', 'Laptop'].map((d) => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="secondaryDevice" value={d} checked={value.secondaryDevice === d} onChange={(e) => update('secondaryDevice', e.target.value)} className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <RequiredLabel>Primary Device Specification Screenshot</RequiredLabel>
              <button
                type="button"
                onClick={() => setSampleOpen(true)}
                className="btn-outline text-xs px-3 py-1.5 inline-flex items-center gap-2"
              >
                <Eye className="w-3.5 h-3.5" /> See example screenshots
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Please upload screenshots of your Device Specification (Windows: Settings ▸ System ▸ About; macOS: About This Mac).</p>
            <FileDropzone
              onFilesSelected={(files) => update('deviceScreenshots', files)}
              label="device-spec"
              initialFiles={value.deviceScreenshots}
            />
          </div>

          <div className="space-y-2">
            <label className="form-label">Secondary Device Specification Screenshot</label>
            <p className="text-sm text-muted-foreground">Optional — upload if you have a backup device.</p>
            <FileDropzone
              onFilesSelected={(files) => update('secondaryDeviceScreenshots', files)}
              label="secondary-device-spec"
              initialFiles={value.secondaryDeviceScreenshots}
            />
          </div>


          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Device Specification Notice
              </p>
              <div className="text-xs text-muted-foreground mt-2 space-y-2 leading-relaxed">
                <p>
                  To help us assess your readiness for remote work opportunities and match
                  you with clients whose technical requirements fit your setup, we may
                  request your device specifications, including:
                </p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>CPU/Processor Model</li>
                  <li>RAM/Memory Capacity</li>
                  <li>Total Storage Capacity</li>
                </ul>
                <p>
                  You may use the “Detect Now” feature to automatically retrieve this
                  information from your device. The system is designed to collect only the
                  technical specifications necessary for profile evaluation and client
                  matching purposes.
                </p>
                <p className="font-semibold text-foreground">By proceeding, you acknowledge and agree that:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>Only device specification information relevant to work compatibility will be collected.</li>
                  <li>No personal files, passwords, browsing activity, or unrelated personal data will be accessed, viewed, or stored.</li>
                  <li>The collected information will be handled in accordance with the provisions of the Data Privacy Act of 2012 and Cyberbacker’s data privacy and security policies.</li>
                  <li>Your information will be used solely for candidate assessment, profile building, and client matching purposes.</li>
                  <li>By clicking ‘Detect Now’, you voluntarily consent to the collection and processing of your device specifications.</li>
                </ul>
                <p>
                  If you prefer not to use the automatic detection feature, you may manually
                  enter your device specifications instead.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => update('consent', e.target.checked)}
                className="mt-0.5 w-4 h-4 text-primary border-border rounded"
              />
              <span className="text-xs text-foreground">
                I have read and agree to the Device Specification Notice above.
              </span>
            </label>


            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleDetect}
                disabled={detecting || !consent}
                title={!consent ? 'Please accept the notice first' : ''}
                className="btn-outline text-xs px-3 py-1.5 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                {detecting ? 'Detecting...' : 'Detect Now'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">CPU / Processor Model</label>
                <input
                  className="form-input text-xs"
                  placeholder="e.g. AMD Ryzen 5 5600X"
                  value={value.detectedSpecs?.cpu ?? ''}
                  onChange={(e) => update('detectedSpecs', { ...(value.detectedSpecs ?? { ram: '', storage: '', source: '' as const }), cpu: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">RAM / Memory Capacity</label>
                <input
                  className="form-input text-xs"
                  placeholder="e.g. 16 GB"
                  value={value.detectedSpecs?.ram ?? ''}
                  onChange={(e) => update('detectedSpecs', { ...(value.detectedSpecs ?? { cpu: '', storage: '', source: '' as const }), ram: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Total Storage Capacity</label>
                <input
                  className="form-input text-xs"
                  placeholder="e.g. 512 GB"
                  value={value.detectedSpecs?.storage ?? ''}
                  onChange={(e) => update('detectedSpecs', { ...(value.detectedSpecs ?? { cpu: '', ram: '', source: '' as const }), storage: e.target.value })}
                />
              </div>
            </div>
          </div>

        </TabsContent>

        <TabsContent value="isp" className="space-y-4 animate-fade-in mt-0">

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Network Requirements</p>
          <p>10 Mbps DSL/Fiber Internet connection (USB sticks, signal-based &amp; wireless connections are not allowed).</p>
          <p>Please provide all required items labeled with (<span className="text-destructive font-semibold">*</span>).</p>
          <div>
            <p className="font-semibold text-foreground">Required Items</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>Primary Internet Provider (<span className="text-destructive font-semibold">*</span>)</li>
              <li>Primary ISP Speedtest shareable link (<span className="text-destructive font-semibold">*</span>)</li>
              <li>Secondary/Back up Internet Provider</li>
              <li>Secondary/Back up ISP Speedtest shareable link</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">How to Get Your Speed Test Shareable Link</p>
            <p>To verify your internet stability, please complete a speed test and upload your result.</p>
            <p className="font-semibold text-foreground mt-2">Steps:</p>
            <ol className="list-decimal pl-5 mt-1 space-y-0.5">
              <li>Go to <a href="https://www.speedtest.net" target="_blank" rel="noreferrer" className="text-primary hover:underline">https://www.speedtest.net</a></li>
              <li>Click "Go" to start the test and wait for it to finish.</li>
              <li>Once the results are displayed, look for the "Share" button.</li>
              <li>Click "Share".</li>
              <li>Select and highlight the "Web" result link, then copy the URL.</li>
              <li>Paste the copied link into the required field in your profile.</li>
            </ol>
          </div>
        </div>

        <div>
          <RequiredLabel>Primary Internet Provider</RequiredLabel>
          <input className="form-input" value={value.primaryISP} onChange={(e) => update('primaryISP', e.target.value)} />
        </div>
        <div>
          <RequiredLabel>Primary ISP Speedtest Shareable Link</RequiredLabel>
          <input
            type="url"
            className="form-input"
            placeholder="https://www.speedtest.net/result/..."
            value={(value as WorkSetupData).primaryISPSpeedtest ?? ''}
            onChange={(e) => {
              update('primaryISPSpeedtest' as keyof WorkSetupData, e.target.value as never);
              setSpeedtestErrors((p) => ({ ...p, primary: undefined }));
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">Paste your result link from speedtest.net.</p>
          {speedtestErrors.primary && (
            <p className="text-xs text-destructive mt-1">{speedtestErrors.primary}</p>
          )}
        </div>
        <div>
          <label className="form-label">Secondary/Back up Internet Provider</label>
          <input className="form-input" value={value.secondaryISP} onChange={(e) => update('secondaryISP', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Secondary/Back up ISP Speedtest Shareable Link</label>
          <input
            type="url"
            className="form-input"
            placeholder="https://www.speedtest.net/result/..."
            value={(value as WorkSetupData).secondaryISPSpeedtest ?? ''}
            onChange={(e) => {
              update('secondaryISPSpeedtest' as keyof WorkSetupData, e.target.value as never);
              setSpeedtestErrors((p) => ({ ...p, secondary: undefined }));
            }}
          />
          {speedtestErrors.secondary && (
            <p className="text-xs text-destructive mt-1">{speedtestErrors.secondary}</p>
          )}
        </div>
        </TabsContent>
      </Tabs>

      {sampleOpen && (
        <div
          className="fixed inset-0 z-50 bg-foreground/70 flex items-center justify-center p-4"
          onClick={() => setSampleOpen(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Sample Device Specification Screenshots</p>
              <button
                type="button"
                onClick={() => setSampleOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-muted grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" /> Windows — Settings ▸ System ▸ About
                </p>
                <img src={windowsSampleImg} alt="Windows System About sample" className="w-full h-auto rounded-lg border border-border bg-card" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5" /> macOS — About This Mac
                </p>
                <img src={macSampleImg} alt="macOS About This Mac sample" className="w-full h-auto rounded-lg border border-border bg-card" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground px-4 py-3 border-t border-border">
              Reference only — upload a screenshot of your own device's About page.
            </p>
          </div>
        </div>
      )}
    </div>

  );
});


WorkSetupStep.displayName = 'WorkSetupStep';

export default WorkSetupStep;

