import FileDropzone from '@/components/wizard/FileDropzone';
import { Link as LinkIcon } from 'lucide-react';
import RequiredLabel from '@/components/wizard/RequiredLabel';
import SkipGate, { SkipGateBanner } from '@/components/wizard/SkipGate';
import { useSkipAnswer } from '@/lib/skipAnswers';

interface PortfolioStepProps {
  portfolioLink: string;
  onPortfolioLinkChange: (value: string) => void;
  onFilesChange: (files: File[]) => void;
  initialFiles?: File[];
  /** Wizard only — advance when the applicant answers "No". */
  onSkip?: () => void;
}

const PortfolioStep = ({ portfolioLink, onPortfolioLinkChange, onFilesChange, initialFiles, onSkip }: PortfolioStepProps) => {
  const hasData = !!(portfolioLink || '').trim() || (initialFiles?.length ?? 0) > 0;
  const [hasPortfolio, setHasPortfolio] = useSkipAnswer('portfolio', hasData);

  if (hasPortfolio !== true) {
    return (
      <SkipGate
        title="Portfolio / Sample Works"
        intro="Sharing samples of your work helps clients see the quality and type of support you can provide. If you don't have samples ready, you can continue without them."
        question="Do you have a portfolio or work samples to share?"
        yesLabel="Yes, I have samples to share"
        noLabel="No, not right now"
        noTitle="No portfolio added"
        noBody="You indicated you don't have portfolio samples to share right now. You can continue to the next step, or change your answer to add some."
        answer={hasPortfolio}
        onAnswer={(v) => {
          if (v === false) {
            onPortfolioLinkChange('');
            onFilesChange([]);
          }
          setHasPortfolio(v);
        }}
        onSkip={onSkip}
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <SkipGateBanner
        title="Portfolio / Sample Works"
        body="Add a portfolio link and upload any sample works you'd like clients to see."
        onChangeAnswer={() => setHasPortfolio(null)}
      />
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Upload samples that best demonstrate the quality of your work and the type of support you can provide to clients.
        </p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Include outputs that are clear, professional, and relevant to your specialization.
        </p>
      </div>
      <div>
        <h3 className="text-lg font-heading font-semibold text-foreground mb-1">Portfolio / Sample Works</h3>
        <p className="text-sm text-muted-foreground mb-6">Upload your best work samples to showcase your abilities.</p>
      </div>

      <div>
        <RequiredLabel optional>Portfolio Link</RequiredLabel>
        <p className="text-xs text-muted-foreground mb-2">
          Paste a link to your portfolio, Google Drive, Behance, GitHub, or any sample works.
        </p>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="url"
            placeholder="https://your-portfolio.com"
            value={portfolioLink}
            onChange={(e) => onPortfolioLinkChange(e.target.value)}
            className="form-input pl-9"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Upload Files</label>
        <FileDropzone
          onFilesSelected={onFilesChange}
          label="portfolio"
          imagesOnly
          maxFiles={10}
          initialFiles={initialFiles}
        />
      </div>
    </div>
  );
};

export default PortfolioStep;

