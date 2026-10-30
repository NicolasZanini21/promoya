"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconSearch, IconTag, IconUser } from "@/components/icons";

const DESTINOS = [
  { href: "/", label: "Inicio", Icon: IconHome },
  { href: "/rubros", label: "Mis rubros", Icon: IconTag },
  { href: "/buscar", label: "Buscar", Icon: IconSearch },
  { href: "/perfil", label: "Perfil", Icon: IconUser },
];

/**
 * Navegación de escritorio: sidebar fija a la izquierda.
 * Visible solo desde el breakpoint md (ver AppShell).
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-neutral-200 bg-white md:flex md:flex-col dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
          %
        </span>
        <span className="text-lg font-semibold">PromoYa</span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {DESTINOS.map(({ href, label, Icon }) => {
          const activo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activo
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <Icon className={`h-5 w-5 ${activo ? "text-brand-600 dark:text-brand-300" : "text-neutral-400"}`} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5 py-4 text-xs text-neutral-400">
        Rosario, Santa Fe
      </div>
    </aside>
  );
}
