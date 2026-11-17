import type { Meta, StoryObj } from "@storybook/react";

/**
 * The design tokens from @repo/theme, drawn from their CSS variables, so any
 * change in packages/theme shows here in both colour modes (toolbar: theme).
 */
const meta = {
  title: "Foundations/Tokens",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const colorGroups: { title: string; roles: [name: string, foreground?: string][] }[] = [
  {
    title: "Surfaces",
    roles: [
      ["background", "foreground"],
      ["card", "card-foreground"],
      ["surface-soft", "foreground"],
      ["surface-dark", "surface-dark-foreground"],
      ["navy", "navy-foreground"],
    ],
  },
  {
    title: "Actions",
    roles: [
      ["primary", "primary-foreground"],
      ["primary-hover", "primary-foreground"],
      ["secondary", "secondary-foreground"],
      ["tertiary", "tertiary-foreground"],
      ["accent", "accent-foreground"],
    ],
  },
  {
    title: "Text and lines",
    roles: [
      ["foreground", "background"],
      ["muted-foreground", "background"],
      ["border"],
      ["border-strong"],
      ["input"],
      ["ring"],
    ],
  },
  {
    title: "Status",
    roles: [
      ["success", "success-foreground"],
      ["warning", "warning-foreground"],
      ["error", "error-foreground"],
      ["info", "info-foreground"],
    ],
  },
];

const Swatch = ({ name, foreground }: { name: string; foreground?: string }) => (
  <figure className="m-0 flex w-44 flex-col gap-theme-2">
    <div
      className="flex h-20 items-end rounded-theme-card border border-theme-border p-theme-3 text-theme-label font-theme-bold"
      style={{
        background: `var(--theme-color-${name})`,
        color: foreground ? `var(--theme-color-${foreground})` : undefined,
      }}
    >
      {foreground ? "Aa ۱۲۳" : null}
    </div>
    <figcaption className="text-theme-caption text-theme-muted-foreground">
      <code>{name}</code>
      {foreground ?
        <>
          {" "}
          on it: <code>{foreground}</code>
        </>
      : null}
    </figcaption>
  </figure>
);

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-theme-8">
      {colorGroups.map((group) => (
        <section key={group.title} className="flex flex-col gap-theme-3">
          <h2 className="m-0 text-theme-h5 font-theme-bold">{group.title}</h2>
          <div className="flex flex-wrap gap-theme-4">
            {group.roles.map(([name, foreground]) => (
              <Swatch key={name} name={name} foreground={foreground} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

const textStyles = [
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "body-large",
  "title",
  "body1",
  "body-md",
  "body2",
  "label",
  "caption",
];

export const Typography: Story = {
  render: () => (
    <div className="flex flex-col gap-theme-4">
      {textStyles.map((style) => (
        <div key={style} className="flex items-baseline gap-theme-6">
          <code className="w-28 shrink-0 text-theme-caption text-theme-muted-foreground">
            {style}
          </code>
          <span
            style={{
              fontSize: `var(--theme-text-${style})`,
              lineHeight: `var(--theme-leading-${style})`,
            }}
          >
            طرح مشارکت سازمانی دوتوان
          </span>
        </div>
      ))}
    </div>
  ),
};

const radii = ["sm", "control", "card", "panel", "pill"];
const shadows = ["xs", "sm", "md", "lg", "xl", "inner"];

export const ShapeAndElevation: Story = {
  render: () => (
    <div className="flex flex-col gap-theme-8">
      <div className="flex flex-wrap gap-theme-6">
        {radii.map((radius) => (
          <figure key={radius} className="m-0 flex flex-col items-center gap-theme-2">
            <div
              className="size-24 border border-theme-border-strong bg-theme-surface-soft"
              style={{ borderRadius: `var(--theme-radius-${radius})` }}
            />
            <figcaption className="text-theme-caption text-theme-muted-foreground">
              <code>radius-{radius}</code>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-wrap gap-theme-8 p-theme-4">
        {shadows.map((shadow) => (
          <figure key={shadow} className="m-0 flex flex-col items-center gap-theme-3">
            <div
              className="size-24 rounded-theme-card bg-theme-card"
              style={{ boxShadow: `var(--theme-shadow-${shadow})` }}
            />
            <figcaption className="text-theme-caption text-theme-muted-foreground">
              <code>shadow-{shadow}</code>
            </figcaption>
          </figure>
        ))}
        <figure className="m-0 flex flex-col items-center gap-theme-3">
          <div
            className="size-24 rounded-theme-control bg-theme-card"
            style={{ boxShadow: "var(--theme-focus-ring)" }}
          />
          <figcaption className="text-theme-caption text-theme-muted-foreground">
            <code>focus-ring</code>
          </figcaption>
        </figure>
      </div>
    </div>
  ),
};
