import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PasswordInput from '@/components/common/PasswordInput';
import { changePassword, login, loadApplicantIdentity } from '@/lib/apiClient';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contactId: string | null;
  email?: string;
}

const ChangePasswordModal = ({ open, onOpenChange, contactId, email }: Props) => {
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentError, setCurrentError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setCurrent(''); setPw(''); setConfirm(''); setCurrentError(''); };

  const submit = async () => {
    if (!contactId) { toast.error('Not signed in.'); return; }
    const accountEmail = (email || loadApplicantIdentity()?.email || '').trim();
    if (!current) { setCurrentError('Enter your current password.'); return; }
    if (!accountEmail) { toast.error('Could not confirm your account email. Please sign in again.'); return; }
    if (pw.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (pw !== confirm) { toast.error('Passwords do not match.'); return; }

    setSubmitting(true);
    setCurrentError('');
    try {
      // Verify the current password against the account before changing it.
      try {
        await login(accountEmail, current);
      } catch {
        setCurrentError('Current password is incorrect.');
        return;
      }
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
          <DialogDescription>Confirm your current password, then set a new one.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="form-label">Current password</label>
            <PasswordInput
              placeholder="Your current password"
              value={current}
              onChange={(e) => { setCurrent(e.target.value); if (currentError) setCurrentError(''); }}
              disabled={submitting}
              className={`form-input ${currentError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {currentError && <p className="text-xs text-destructive mt-1">{currentError}</p>}
          </div>
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
