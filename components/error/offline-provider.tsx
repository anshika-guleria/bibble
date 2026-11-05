"use client";

import { useSyncExternalStore } from "react";
import { BibbleError, ErrorType } from "./bibble-error";

function subscribeOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useSyncExternalStore(subscribeOnlineStatus, getOnlineSnapshot, getServerSnapshot);
  const errorType: ErrorType | null = !isOnline ? "offline" : null;

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  if (errorType) {
    return (
      <div className="error-page">
        <main id="main-content" tabIndex={-1} className="not-found-main">
          <BibbleError type={errorType} onRetry={handleRetry} />
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
