import type { Metadata, Viewport } from "next";

import { AppShell } from "@/widgets/app-shell";
import { ru } from "@/shared/i18n";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: ru.appName,
  description: ru.legal.ageBody,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full bg-tg-bg font-sans text-tg-text antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
