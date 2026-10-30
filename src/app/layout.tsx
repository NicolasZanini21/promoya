import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { AuthSync } from "@/components/AuthSync";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppStateProvider } from "@/lib/app-state";
import "./globals.css";

// Tipografía propia en vez de la fuente del sistema: más carácter para los
// porcentajes de descuento grandes y para los títulos, sin perder
// legibilidad en texto chico. Variable font, subset latino (incluye tildes).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PromoYa — Rosario",
  description: "Promociones vigentes por rubro en Rosario, todos los días.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PromoYa",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5a44e0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className={jakarta.variable}>
      <body className="bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <AppStateProvider>
          <ServiceWorkerRegister />
          <AuthSync />
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </body>
    </html>
  );
}
