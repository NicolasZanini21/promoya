"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

/**
 * Shell responsive: mismos datos y componentes, cambia solo cómo se acomoda
 * la navegación según el ancho de pantalla (ver spec: Diseño para escritorio
 * y celular). Debajo de ~768px (md) se usa BottomNav; desde ahí, Sidebar.
 *
 * En /login no se muestra nada de esto: es una pantalla propia, sin nav,
 * ya que todavía no hay sesión.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
