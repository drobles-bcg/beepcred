import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment / abuse' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'false_info', label: 'False or misleading info' },
  { value: 'other', label: 'Other' },
] as const;

type ContentType = 'plate' | 'image' | 'comment' | 'user';

type Props = {
  contentType: ContentType;
  contentId: string;
  label?: string;
  variant?: 'ghost' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
};

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    return body?.error || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export function ReportButton({
  contentType,
  contentId,
  label = 'Report',
  variant = 'ghost',
  size = 'sm',
  className,
}: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('inappropriate');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/reports', {
        content_type: contentType,
        content_id: contentId,
        reason,
        notes: notes.trim() || undefined,
      });
      return data as { report: unknown; duplicate?: boolean };
    },
    onSuccess: () => {
      setDone(true);
    },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setDone(false);
      setNotes('');
      setReason('inappropriate');
      submit.reset();
    }
  }

  if (!user) {
    return (
      <Button asChild size={size} variant={variant} className={className}>
        <Link to="/login">
          <Flag className="size-3.5" />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Flag className="size-3.5" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report {contentType}</DialogTitle>
            <DialogDescription>
              Flag this for moderator review (abuse, spam, or removal). False reports may affect your
              account.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <DialogBody>
              <p className="text-sm">
                {submit.data?.duplicate
                  ? 'You already have a pending report on this. Moderators will review it.'
                  : 'Thanks — your report was submitted and is pending review.'}
              </p>
            </DialogBody>
          ) : (
            <DialogBody className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="report-reason">Reason</Label>
                <select
                  id="report-reason"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-notes">Details (optional)</Label>
                <Textarea
                  id="report-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What should moderators know?"
                  rows={3}
                />
              </div>
              {submit.isError && (
                <p className="text-sm text-destructive">
                  {apiErrorMessage(submit.error, 'Could not submit report')}
                </p>
              )}
            </DialogBody>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {done ? 'Close' : 'Cancel'}
            </Button>
            {!done && (
              <Button onClick={() => submit.mutate()} disabled={submit.isPending || !reason}>
                {submit.isPending ? 'Submitting…' : 'Submit report'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
