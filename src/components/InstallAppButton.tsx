import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { cn } from '../lib/utils';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export function InstallAppButton({ variant = 'hero' }: { variant?: 'hero' | 'sidebar' }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const updateStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((window.navigator as NavigatorWithStandalone).standalone)
      );
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    updateStandalone();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', updateStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', updateStandalone);
    };
  }, []);

  const handleInstall = async () => {
    if (isStandalone) {
      window.location.assign('/');
      return;
    }

    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }

    setShowInstallHelp(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className={cn(
          "inline-flex items-center justify-center gap-2 border font-bold uppercase tracking-widest transition-all",
          variant === 'hero'
            ? "rounded-2xl border-stone-200 bg-white/80 px-5 py-3 text-[11px] text-stone-500 shadow-sm backdrop-blur hover:border-primary/30 hover:text-black"
            : "w-full rounded-2xl border-stone-100 bg-stone-50 px-4 py-3 text-[10px] text-stone-500 hover:bg-white hover:text-black"
        )}
      >
        <Download className="h-4 w-4" />
        {isStandalone ? 'Open App' : 'Install App'}
      </button>

      {showInstallHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] border border-stone-100 bg-white p-6 text-left shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold uppercase italic tracking-tight text-black">
                Install LifeAdmin
              </h2>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-stone-50 hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm font-medium text-stone-500">
              <p>On iPhone or iPad, tap the Share button, then choose Add to Home Screen.</p>
              <p>On desktop, use your browser's install option when it appears.</p>
            </div>
            <a
              href="https://life-admin-2wtl.onrender.com"
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-white"
            >
              Open LifeAdmin
            </a>
          </div>
        </div>
      )}
    </>
  );
}
