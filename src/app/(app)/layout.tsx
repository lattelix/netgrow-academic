import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { NavLink } from "@/components/app/NavLink";
import { SwitchAccountButton } from "@/components/app/SwitchAccountButton";
import { ROLE_LABELS } from "@/lib/format";
import { initials } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const navItems: { href: string; label: string }[] = [
    { href: "/dashboard", label: "Дашборд" },
    { href: "/projects", label: "Проекты" },
    { href: "/calendar", label: "Календарь" },
  ];
  if (user.role_code === "participant") {
    navItems.splice(1, 0, { href: "/profile", label: "Профиль" });
  }
  if (user.role_code === "organizer" || user.role_code === "admin") {
    navItems.push({ href: "/organizer/applications", label: "Заявки" });
    navItems.push({ href: "/analytics", label: "Аналитика" });
  }
  if (user.role_code === "admin") {
    navItems.push({ href: "/admin", label: "Администрирование" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-[8px] focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Перейти к содержимому
      </a>
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-accent)] text-sm font-bold text-white">
              NG
            </span>
            <span className="text-base font-semibold">NetGrow</span>
          </div>
          <nav aria-label="Основная навигация" className="flex flex-wrap gap-1">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user.full_name}</p>
              <p className="text-xs leading-tight text-[var(--color-text-muted)]">
                {ROLE_LABELS[user.role_code]}
              </p>
            </div>
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: user.avatar_color }}
            >
              {initials(user.full_name)}
            </span>
            <SwitchAccountButton />
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
