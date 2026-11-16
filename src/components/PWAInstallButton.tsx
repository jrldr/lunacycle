import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-medium">Installed on this device</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Running in standalone mode with offline access enabled.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleTrigger = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleTrigger}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 whitespace-nowrap shrink-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <Download className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          <span>Install App</span>
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17151C]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                Install LunaCycle on Your Phone
              </h4>
              <p className="mt-0.5 text-xs text-stone-600 dark:text-zinc-400">
                Works offline on Android and iOS home screens with instant launch and cached forecasts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTrigger}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#BE3455] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a62a48] whitespace-nowrap shrink-0 dark:bg-rose-600 dark:hover:bg-rose-500"
          >
            <Download className="h-4 w-4" />
            <span>{isInstallable ? 'Install Now' : 'Install Instructions'}</span>
          </button>
        </div>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#17151C]">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden dark:bg-zinc-700" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="install-guide-title"
                  className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100"
                >
                  {isIOS ? 'Install on iPhone or iPad' : 'Install on Android & Desktop'}
                </h3>
                <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                  Add LunaCycle to your home screen for full offline access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-3 text-sm text-stone-700 dark:text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-nums font-semibold text-rose-600 dark:text-rose-400">1.</span>
                  <span>
                    Tap the <strong className="inline-flex items-center gap-1"><Share className="h-3.5 w-3.5" /> Share</strong> button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-nums font-semibold text-rose-600 dark:text-rose-400">2.</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-nums font-semibold text-rose-600 dark:text-rose-400">3.</span>
                  <span>Tap <strong>Add</strong> in the top-right corner to launch as a standalone app.</span>
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm text-stone-700 dark:text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-nums font-semibold text-rose-600 dark:text-rose-400">1.</span>
                  <span>Open the browser menu (three dots in Chrome/Edge on Android or desktop).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-nums font-semibold text-rose-600 dark:text-rose-400">2.</span>
                  <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-nums font-semibold text-rose-600 dark:text-rose-400">3.</span>
                  <span>Confirm installation to use LunaCycle offline anytime.</span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ pendingCount: number }> = ({ pendingCount }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span>
            Offline mode active — your logs are saved locally
            {pendingCount > 0 ? ` (${pendingCount} change${pendingCount > 1 ? 's' : ''} queued for Google Sheets)` : '.'}
          </span>
        </div>
      </div>
    );
  }

  return null;
};
