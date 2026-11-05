"use client";

import { SiteHeader } from "@/components/site-header";
import { BibbleError } from "@/components/error/bibble-error";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="not-found-main">
        <BibbleError type="not-found" />
      </main>
    </div>
  );
}
