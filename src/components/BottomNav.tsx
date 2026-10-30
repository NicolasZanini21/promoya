"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconSearch, IconTag, IconUser } from "@/components/icons";

const DESTINOS = [
  { href: "/", label: "Inicio", Icon: IconHome },
  { href: "/rubros", label: "Rubros", Icon: IconTag },
  { href: "/buscar", label: "Buscar", Icon: IconSearch },
  { href: "/perfil", label: "Perfil", Icon: IconUser },
];

/**
 * Navegación de celular (PWA instalada): barra fija abajo con 4 destinos.
 * Visible solo debajo del breakpoint md (ver AppShell).
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden dark:border-neutral-800 dark:bg-neutral-900/95">
      {DESTINOS.map(({ href, label, Icon }) => {
        const activo = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              activo ? "text-brand-600 dark:text-brand-300" : "text-neutral-400"
            }`}
          >
            <Icon className="h-6 w-6" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
