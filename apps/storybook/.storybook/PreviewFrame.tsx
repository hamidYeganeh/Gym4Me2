import { MotionConfig } from "motion/react";
import { useLayoutEffect } from "react";

import type { FC, PropsWithChildren } from "react";

import { DirectionProvider } from "@repo/ui/direction-provider";

type PreviewFrameProps = PropsWithChildren<{
  theme: "light" | "dark";
  locale: "en" | "fa";
  motion: "system" | "reduced";
}>;

const PreviewFrame: FC<PreviewFrameProps> = (props) => {
  const { theme, locale, motion, children } = props;
  const direction = locale === "fa" ? "rtl" : "ltr";

  useLayoutEffect(() => {
    const html = document.documentElement;
    const previous = { className: html.className, lang: html.lang, dir: html.dir };
    html.classList.remove("light", "dark");
    html.classList.add(theme);
    html.lang = locale;
    html.dir = direction;

    return () => {
      html.className = previous.className;
      html.lang = previous.lang;
      html.dir = previous.dir;
    };
  }, [theme, locale, direction]);

  return (
    <MotionConfig reducedMotion={motion === "reduced" ? "always" : "user"}>
      <DirectionProvider direction={direction}>
        <div className="min-h-64 bg-theme-background p-theme-page font-theme-sans text-theme-foreground">
          {children}
        </div>
      </DirectionProvider>
    </MotionConfig>
  );
};

export default PreviewFrame;
