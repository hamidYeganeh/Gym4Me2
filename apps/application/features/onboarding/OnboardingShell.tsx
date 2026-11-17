import type { ReactNode } from "react";

import styles from "./onboarding.module.css";

const OnboardingShell = (props: { children: ReactNode; patterned?: boolean }) => {
  const { children, patterned } = props;

  return (
    <main className={styles.shell} data-theme="dark" data-patterned={patterned || undefined}>
      <div className={styles.content}>{children}</div>
    </main>
  );
};

export default OnboardingShell;
