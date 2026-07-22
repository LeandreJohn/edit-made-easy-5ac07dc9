import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const HelpCenterModal = ({ open, onOpenChange }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Help Center</DialogTitle>
        <DialogDescription>How to use the Cyberbacker Profile Builder.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm text-foreground leading-relaxed">
        <section>
          <h3 className="font-heading font-semibold text-base mb-1">Getting started</h3>
          <p className="text-muted-foreground">
            Complete each step in the left sidebar. Your progress saves automatically after each
            step — you can close the tab and return anytime by signing in.
          </p>
        </section>
        <section>
          <h3 className="font-heading font-semibold text-base mb-1">Editing your profile</h3>
          <p className="text-muted-foreground">
            Click <span className="font-medium text-foreground">Edit</span> on any section to
            update it, then <span className="font-medium text-foreground">Save</span>. The Save
            button is disabled until required fields are filled.
          </p>
        </section>
        <section>
          <h3 className="font-heading font-semibold text-base mb-1">Managing documents</h3>
          <p className="text-muted-foreground">
            Use <span className="font-medium text-foreground">Manage Documents</span> on the
            Documents card to update your portfolio files, work-setup screenshots, and
            compliance documents in one place.
          </p>
        </section>
        <section>
          <h3 className="font-heading font-semibold text-base mb-1">Reapplying</h3>
          <p className="text-muted-foreground">
            Reapply is available 60 days after your last application, once your core sections
            (Personal Info, Education, Professional Background, Value Proposition, Work Setup)
            are complete. You will also retake the Values and DISC assessment.
          </p>
        </section>
        <section>
          <h3 className="font-heading font-semibold text-base mb-1">Assessments</h3>
          <p className="text-muted-foreground">
            The assessment is embedded in this app — no need to close the browser if prompted
            after finishing. Click <span className="font-medium text-foreground">Next</span> when
            you finish Values, and <span className="font-medium text-foreground">Submit</span>{' '}
            when you finish DISC.
          </p>
        </section>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
        <a href="https://cyberbackercareers.com/" target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center justify-center gap-2">
          Cyberbacker Home <ExternalLink className="w-4 h-4" />
        </a>
        <a href="https://cyberbackercareers.com/faq/" target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center justify-center gap-2">
          Application FAQs <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </DialogContent>
  </Dialog>
);

export default HelpCenterModal;
