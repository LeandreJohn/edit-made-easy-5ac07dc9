import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PasswordInput from '@/components/common/PasswordInput';
import { changePassword } from '@/lib/apiClient';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contactId: string | null;
}

const ChangePasswordModal = ({ open, onOpenChange, contactId }: Props) => {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setPw(''); setConfirm(''); };

  const submit = async () => {
    if (!contactId) { toast.error('Not signed in.'); return; }
    if (pw.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (pw !== confirm) { toast.error('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await changePassword(contactId, pw);
      toast.success('Password updated.');
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter a new password for your account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="form-label">New password</label>
            <PasswordInput placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} disabled={submitting} />
          </div>
          <div>
            <label className="form-label">Confirm new password</label>
            <PasswordInput placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={submitting} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" onClick={() => onOpenChange(false)} disabled={submitting} className="btn-outline">Cancel</button>
          <button type="button" onClick={submit} disabled={submitting} className="btn-primary">
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;
