"use client";

import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { NotificationsDropdown } from "./notifications/notifications-dropdown";
import Link from "next/link";

interface TopbarProps {
  title: string;
  description?: string;
  alertCount?: number;
}

export function Topbar({ title, description }: TopbarProps) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-mobile-menu"))}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{title}</h1>
            {description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationsDropdown />

          <Link href="/settings" className="hidden sm:flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-indigo-300 transition-all">
              {session?.user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (session?.user?.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>
            <div className="text-sm leading-tight">
              <p className="text-slate-400 text-xs">Hello,</p>
              <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                {session?.user?.name?.split(" ")[0]}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
