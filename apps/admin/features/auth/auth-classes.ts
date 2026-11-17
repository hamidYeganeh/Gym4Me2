export const authClasses = {
  artwork: "object-cover",
  back: "absolute start-[clamp(0rem,_1.4vw,_2rem)]",
  carousel: "auth-carousel",
  content: "self-center justify-self-center w-[min(100%,_21.5rem)] py-theme-8",
  destination: "block text-theme-foreground font-theme-medium",
  error:
    "text-theme-error text-[length:var(--theme-text-caption)] leading-[var(--theme-leading-caption)]",
  field: "flex flex-col gap-theme-1",
  fields:
    "flex flex-col gap-theme-3 [&_.auth-submit]:mbs-theme-3 [&_.auth-submit:disabled]:opacity-100 " +
    "[&_.auth-submit:disabled]:bg-[color:color-mix(in_srgb,_var(--theme-color-foreground)_18%,_var(--theme-color-background))] " +
    "[&_.auth-submit:disabled]:text-theme-foreground",
  footer:
    "relative grid justify-items-center items-center min-h-theme-10 text-[length:var(--theme-text-h5)] " +
    "font-theme-bold [direction:ltr]",
  gallery:
    "hidden overflow-hidden bg-theme-surface-soft relative [--swiper-pagination-color:white] " +
    "[--swiper-pagination-bullet-inactive-color:white] [--swiper-pagination-bullet-inactive-opacity:0.55] " +
    "[&_.auth-carousel]:absolute [&_.auth-carousel]:inset-0 md:block",
  header: "relative grid justify-items-center items-center min-h-theme-10",
  heading:
    "mbe-theme-7 text-center [&_h1]:text-[length:var(--theme-text-h5)] [&_h1]:leading-[var(--theme-leading-h5)] " +
    "[&_h1]:font-theme-semibold [&_p]:mbs-theme-1 [&_p]:text-theme-muted-foreground " +
    "[&_p]:text-[length:var(--theme-text-body2)] [&_p]:leading-[var(--theme-leading-body2)] " +
    "[&[data-form-heading]]:mbe-theme-7 [&[data-form-heading]_h1]:text-[length:var(--theme-text-h4)] " +
    "[&[data-form-heading]_h1]:leading-[var(--theme-leading-h4)] [&[data-form-heading]_p]:mbs-theme-2 " +
    "[&[data-form-heading]_p]:text-[length:var(--theme-text-body1)] " +
    "[&[data-form-heading]_p]:leading-[var(--theme-leading-body1)]",
  headingIcon:
    "grid place-items-center [inline-size:calc(var(--theme-space-12)_+_var(--theme-space-2))] aspect-square " +
    "mx-auto mbe-theme-4 rounded-full bg-theme-muted text-theme-muted-foreground " +
    "[&_svg]:[inline-size:var(--theme-space-7)] [&_svg]:[block-size:var(--theme-space-7)]",
  input:
    "text-[length:var(--theme-text-body1)] [&:placeholder-shown]:[direction:inherit] " +
    "[&:placeholder-shown]:text-start",
  otpCode:
    "self-center [max-inline-size:100%] [&_.auth-otp-group]:[padding:var(--theme-space-2)_var(--theme-space-3)] " +
    "[&_.auth-otp-group]:[border:1px_solid_transparent] [&_.auth-otp-group]:rounded-theme-3xl " +
    "[&_.auth-otp-group]:bg-theme-muted " +
    "[&:focus-within_.auth-otp-group]:[outline:2px_solid_var(--theme-color-ring)] " +
    "[&:focus-within_.auth-otp-group]:[outline-offset:2px] [&[data-invalid]_.auth-otp-group]:border-theme-error " +
    "[&_[data-slot='input-otp-slot']]:[inline-size:min(9vw,_var(--theme-space-9))] " +
    "[&_[data-slot='input-otp-slot']]:[block-size:var(--theme-space-10)] " +
    "[&_[data-slot='input-otp-slot']]:border-0 [&_[data-slot='input-otp-slot']]:rounded-none " +
    "[&_[data-slot='input-otp-slot'][data-active=true]]:ring-0 " +
    "[&_[data-slot='input-otp-slot']]:bg-transparent [&_[data-slot='input-otp-slot']]:shadow-none " +
    "[&_[data-slot='input-otp-slot']]:text-[length:var(--theme-text-body-large)]",
  otpGroup: "auth-otp-group",
  panel:
    "auth-panel grid grid-rows-[auto_1fr_auto] min-w-0 " +
    "[padding:clamp(1.5rem,_4.6vh,_3rem)_var(--theme-space-6)]",
  passwordGroup: "rounded-full border-transparent bg-theme-muted",
  shell:
    "grid min-h-dvh bg-theme-background text-theme-foreground md:grid-cols-[repeat(2,_minmax(0,_1fr))] " +
    "md:[direction:ltr] md:[&:lang(fa)_.auth-panel]:[direction:rtl]",
  spinner: "absolute start-theme-4 motion-safe:animate-spin",
  submit: "auth-submit",
};
