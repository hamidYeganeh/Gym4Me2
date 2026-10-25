# OneTimeCode

Adapted from Bencho's MIT-licensed One-time code source:
https://bencho.dev/licence. The original motion comments and tuning are retained.

```tsx
import { OneTimeCode } from "@repo/ui/kit/OneTimeCode";

<OneTimeCode
  aria-label="Verification code"
  value={code}
  onValueChange={setCode}
  onComplete={(completeCode) => console.log("Code ready", completeCode.length)}
  length={5}
  status={status}
  verifiedLabel="Verified"
/>;
```

The form controls `status`: `idle`, `verifying`, `success` or `error`. Filling all
cells updates the value and optionally calls `onComplete(code)`; it never calls
submit or starts verification. The verification response controls the capsule or
rejection animation. Four-, five- and six-digit codes are supported. Authentication
and phone-number verification use the existing five-digit server contract.

`onComplete` receives the normalized code after the controlled value is committed,
including paste and programmatic SMS autofill. It fires once per distinct full
code, not on rerenders or callback identity changes. Clearing or shortening the
value allows the same code to complete again. Existing authentication forms keep
their explicit submit behavior.

A single input handles keyboard entry, paste and SMS autofill. Persian and Arabic
digits normalize to Latin digits for the API. Native input attributes, event handlers
and refs are forwarded. Error animation temporarily makes the field read-only;
pending and successful states disable it.

| Bencho token            | Project token   |
| ----------------------- | --------------- |
| `--card`, `--fill-slab` | `--muted`       |
| `--fill-on`, `--ink`    | `--foreground`  |
| `--font-ui`             | `--font-sans`   |
| Error color             | `--destructive` |

CSS is imported by the component and scoped to `.one-time-code`. No Bencho global
tokens are added. Reduced motion follows the OS setting live; `reducedMotion` can
also enable it in-app. The SVG filter only affects cell shapes, never their text.

With `GYM_QA_WEB=true`, `/qa/kit` includes typing, checking, acceptance and rejection
controls. These preview controls do not call authentication APIs.
