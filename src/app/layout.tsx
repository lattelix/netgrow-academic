import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetGrow — информационная система лагеря",
  description:
    "Формирование проектных команд и координация образовательной деятельности в детском оздоровительном лагере.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="h-full">
      <body className="h-full min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
