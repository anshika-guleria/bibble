"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, UserRoundPlus } from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/actions/auth";

type CurrentUser = { id: string; name: string; email: string };

export function AuthControls() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user: CurrentUser | null }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (user) {
    return (
      <form action={logout}>
        <button
          type="submit"
          className="nav-login"
        >
          <LogOut size={15} /> Log out
        </button>
      </form>
    );
  }

  return (
    <>
      <Link href="/login" className="nav-login"><LogIn size={15} /> Log in</Link>
      <Link href="/signup" className="nav-signup"><UserRoundPlus size={15} /> Sign up</Link>
    </>
  );
}
