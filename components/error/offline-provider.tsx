"use client";

import { useSyncExternalStore } from "react";
import { MotionConfig } from "motion/react";
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
      <MotionConfig reducedMotion="user">
        <div className="error-page">
          <main className="not-found-main">
            <BibbleError type={errorType} onRetry={handleRetry} />
          </main>
        </div>
      </MotionConfig>
    );
  }

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
