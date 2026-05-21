import type { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import styles from "./AppLayout.module.css";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className={styles.layout}>
      <PublicHeader />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
