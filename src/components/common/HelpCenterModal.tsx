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
            Complete each step in the left sidebar of the application wizard. Your progress is
            <span className="font-medium text-foreground"> auto-saved only inside the wizard</span> as
            you finish each step, so you can safely close the tab and continue later. Edits made from
            the Dashboard or Attendance page must be confirmed with the{' '}
            <span className="font-medium text-foreground">Save</span> button on that section.
          </p>
        </section>
        <section>
          <h3 className="font-heading font-semibold text-base mb-1">Editing your profile</h3>
          <p className="text-muted-foreground">
            Click <span className="font-medium text-foreground">Edit</span> on any section to
            update it, then <span className="font-medium text-foreground">Save</span>. The Save
            button stays disabled until every required field is filled in.
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
            Reapply becomes available 60 days after your last application, provided your core
            sections (Personal Info, Education, Professional Background, Value Proposition, and
            Work Setup) are complete. You will also retake the Values and DISC assessment.
          </p>
        </section>
        <section>
          <h3 className="font-heading font-semibold text-base mb-1">Assessments</h3>
          <p className="text-muted-foreground">
            The assessment is embedded directly inside this app — there is no need to close the
            browser if you are prompted to do so after finishing. Click{' '}
            <span className="font-medium text-foreground">Next</span> when you complete the Values
            assessment, and <span className="font-medium text-foreground">Submit</span> when you
            complete the DISC assessment.
          </p>
        </section>
        <section>
          <h3 className="font-heading font-semibold text-base mb-1">Using the Attendance dashboard</h3>
          <p className="text-muted-foreground mb-2">
            The Attendance dashboard is where you check in for the day and update your
            availability. Please remember to log out at the end of every workday.
          </p>
          <p className="text-muted-foreground font-medium text-foreground">Login availability options:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Available for training only</span> —
              you're logged in and ready for scheduled training sessions.
            </li>
            <li>
              <span className="font-medium text-foreground">Available for client matching only</span> —
              you're open to be matched with a client but not attending training that day.
            </li>
            <li>
              <span className="font-medium text-foreground">Available for both training and client matching</span> —
              you're fully available for either activity.
            </li>
          </ul>
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
