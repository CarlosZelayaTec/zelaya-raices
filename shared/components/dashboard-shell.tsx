import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "./brand";
import {
  DashboardNavigation,
  type DashboardNavItem,
} from "./dashboard-navigation";
import styles from "./dashboard-shell.module.css";

type DashboardShellProps = {
  children: ReactNode;
  eyebrow: string;
  name: string;
  navigation: DashboardNavItem[];
  organizationName?: string | null;
  roleLabel: string;
  signOutAction: (formData: FormData) => void | Promise<void>;
};

export function DashboardShell({
  children,
  eyebrow,
  name,
  navigation,
  organizationName,
  roleLabel,
  signOutAction,
}: DashboardShellProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.brandWrap}>
          <Brand tone="light" />
        </div>

        <div className={styles.workspace}>
          <span>{eyebrow}</span>
          <strong>{organizationName ?? "Mi cuenta"}</strong>
        </div>

        <DashboardNavigation items={navigation} />

        <div className={styles.sidebarFooter}>
          <Link href="/">Ver sitio público</Link>
          <form action={signOutAction}>
            <button type="submit">Cerrar sesión</button>
          </form>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.topbarEyebrow}>{eyebrow}</span>
            <strong>{organizationName ?? "Zelaya Raíces"}</strong>
          </div>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {initials || "ZR"}
            </span>
            <span>
              <strong>{name}</strong>
              <small>{roleLabel}</small>
            </span>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
