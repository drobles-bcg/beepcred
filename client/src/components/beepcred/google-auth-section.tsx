import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/http';
import { GoogleAuthButton } from '@/components/beepcred/google-auth-button';

type GoogleAuthSectionProps = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
  label?: string;
};

/** Renders Google button + "or" divider only when Google Sign-In is configured. */
export function GoogleAuthSection({ onCredential, disabled, label }: GoogleAuthSectionProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ enabled: boolean }>('/api/auth/google/config')
      .then(({ data }) => {
        if (!cancelled) setEnabled(!!data.enabled);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onCred = useCallback(
    (token: string) => {
      onCredential(token);
    },
    [onCredential]
  );

  if (enabled !== true) return null;

  return (
    <>
      <GoogleAuthButton onCredential={onCred} disabled={disabled} label={label} />
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>
    </>
  );
}
