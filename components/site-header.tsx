"use client";

import { ThemePicker } from "@/components/ui/theme-picker";
import { AuthControls } from "@/components/auth/auth-controls";
import { useTheme } from "@/hooks/use-theme";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const { motif } = useTheme();
  const pathname = usePathname();

  return (
    <header className="site-header" aria-label="Site header">
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
    </header>
  );
}
