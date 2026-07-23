"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./dashboard-shell.module.css";

export type DashboardNavItem = {
  href: string;
  label: string;
  shortLabel: string;
};

export function DashboardNavigation({
  items,
}: {
  items: DashboardNavItem[];
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label="Navegación del panel">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/panel" &&
            item.href !== "/admin" &&
            pathname.startsWith(`${item.href}/`));

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={isActive ? styles.navigationActive : undefined}
            href={item.href}
            key={item.href}
          >
            <span aria-hidden="true">{item.shortLabel}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
