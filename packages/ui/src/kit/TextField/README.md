# Text field

`TextField` combines the [Skiper smooth caret](../SmoothInput/README.md) with
Base UI `Field.Root`, `Field.Label`, `Field.Description`, `Field.Error` and the
kit's input styling. Labels, helper text and errors are linked to the one native
input automatically. Existing account text fields use this component; login's
custom layout uses the same `SmoothInput` control.

```tsx
import { TextField } from "@repo/ui/kit/TextField";

<TextField
  name="username"
  label="Username"
  description="Shown on your profile."
  value={username}
  onValueChange={setUsername}
  required
  validate={(value) =>
    String(value).length < 3 ? "Use at least 3 characters." : null
  }
  validationMode="onBlur"
  error={serverError}
/>;
```

Input props (including `ref`, `onChange`, `onValueChange`, `aria-*`, `value`,
`defaultValue`, `type` and native constraints) are forwarded. `fieldClassName`
styles the field group, `wrapperClassName` the caret container, and `className`
the actual input. `hiddenLabel` retains an accessible label. `smooth={false}`
uses a native caret with the same markup and behavior. `error` accepts a rendered
server error; Base UI also displays validation messages from native constraints
or `validate`. The QA fixture is `/qa/kit#qa-text-field` with `GYM_QA_WEB=true`.
