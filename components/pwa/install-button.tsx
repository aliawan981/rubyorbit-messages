"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

const noopSubscribe = () => () => {};

// Browser-only facts read without a setState-in-effect; the server snapshot keeps hydration stable.
function useBrowserFlag(read: () => boolean, serverValue: boolean) {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}

export function InstallButton() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const isIos = useBrowserFlag(() => /iPad|iPhone|iPod/.test(navigator.userAgent), false);
  const standaloneAtLoad = useBrowserFlag(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    true,
  );
  const [justInstalled, setJustInstalled] = useState(false);
  const isStandalone = standaloneAtLoad || justInstalled;
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setJustInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isStandalone || (!installEvent && !isIos)) return null;

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      setInstallEvent(null);
    } else {
      setShowIosHint(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        aria-label="Install app"
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm md:w-full"
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Install app</span>
      </button>
      {showIosHint && (
        <div
          role="dialog"
          aria-label="Install on iPhone"
          className="bg-card fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 rounded-lg border p-4 text-sm shadow-lg"
        >
          <button
            type="button"
            onClick={() => setShowIosHint(false)}
            aria-label="Close"
            className="text-muted-foreground absolute top-2 right-2 p-1"
          >
            <X className="size-4" />
          </button>
          <p className="pr-6 font-medium">Install RubyOrbit on your iPhone</p>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1">
            Tap <Share className="size-4" /> Share in Safari, then choose “Add to Home Screen”.
          </p>
        </div>
      )}
    </>
  );
}
