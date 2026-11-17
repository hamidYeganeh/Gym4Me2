import type { IconComponent } from "@repo/icons";
import type { ReactNode } from "react";

import { authClasses } from "./auth-classes";

export const AuthHeading = (props: {
  title: string;
  description: ReactNode;
  icon?: IconComponent;
}) => {
  const { title, description, icon: Icon } = props;
  return (
    <header className={authClasses.heading} data-form-heading={Icon ? true : undefined}>
      {Icon && (
        <span className={authClasses.headingIcon} aria-hidden>
          <Icon />
        </span>
      )}
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
};
