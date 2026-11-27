"use client";

import { useState } from "react";
import { ThemePicker } from "@/components/ui/theme-picker";
import { AuthControls } from "@/components/auth/auth-controls";
import { ReviewSessionModal } from "@/components/reviews/review-session-modal";
import { useReviewQueue } from "@/hooks/use-review-queue";
import { useTheme } from "@/hooks/use-theme";
import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const { motif } = useTheme();
  const pathname = usePathname();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const { summary } = useReviewQueue();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">{motif.brandEmoji}</span>
          <span>Bibble</span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          <Link
            href="/explore"
            className={pathname === "/explore" ? "nav-link nav-active" : "nav-link"}
          >
            Explore maps
          </Link>
          <Link
            href="/rooms"
            className={pathname.startsWith("/rooms") ? "nav-link nav-active" : "nav-link"}
          >
            Study rooms
          </Link>
          <Link
            href="/progress"
            className={pathname === "/progress" ? "nav-link nav-active" : "nav-link"}
          >
            My progress
          </Link>
          {summary.dueCount > 0 && (
            <button
              type="button"
              className="nav-review-badge"
              onClick={() => setReviewModalOpen(true)}
              title={`${summary.dueCount} concepts due for active recall review`}
              aria-label={`${summary.dueCount} concepts due for active recall review`}
            >
              <Sparkles size={14} />
              <span>Review ({summary.dueCount})</span>
            </button>
          )}
          <Link
            href="/profile"
            className={pathname === "/profile" ? "nav-link nav-active" : "nav-link"}
          >
            Profile
          </Link>
          <ThemePicker compact />
          <AuthControls />
          <Link href="/create" className="nav-cta">
            Create a map <ArrowUpRight size={15} />
          </Link>
        </nav>
      </div>

      <ReviewSessionModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
      />
    </header>
  );
}
