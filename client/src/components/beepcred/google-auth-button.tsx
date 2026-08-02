import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/http';
import { Button } from '@/components/ui/button';

type GoogleAuthButtonProps = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
  label?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
            }
          ) => void;
        };
      };
    };
  }
}

let gsiScriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;
  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gsi]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gsi = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
  return gsiScriptPromise;
}

export function GoogleAuthButton({
  onCredential,
  disabled,
  label = 'Sign in with Google',
}: GoogleAuthButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ enabled: boolean; clientId?: string }>('/api/auth/google/config');
        if (cancelled) return;
        if (!data.enabled || !data.clientId) {
          setError('Google sign-in unavailable');
          return;
        }
        await loadGsiScript();
        if (cancelled || !btnRef.current || !window.google) return;
        btnRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: data.clientId,
          callback: (response) => {
            if (response?.credential) onCredentialRef.current(response.credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        const width = Math.min(360, Math.max(280, btnRef.current.offsetWidth || 320));
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          width,
          text: 'signin_with',
          shape: 'rectangular',
        });
        setReady(true);
      } catch {
        if (!cancelled) setError('Google sign-in unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-center text-sm text-muted-foreground">{error}</p>;
  }

  return (
    <div className="space-y-2">
      <div
        ref={btnRef}
        className={`flex min-h-10 w-full justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      />
      {!ready && (
        <Button type="button" variant="outline" className="w-full" disabled>
          {label}
        </Button>
      )}
    </div>
  );
}
