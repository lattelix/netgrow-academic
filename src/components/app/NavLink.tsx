"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block rounded-[8px] px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]"
          : "text-[var(--color-text-muted)] hover:bg-slate-100 hover:text-[var(--color-text)]"
      }`}
    >
      {children}
    </Link>
  );
}
