# Translations and locale

Persian (`fa`, RTL) is the default. A validated `Gym4Me-locale` cookie can select
English (`en`, LTR). Missing or unsupported values fall back to Persian.
Both languages use the same URL.

## Public imports

| Import               | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `@repo/i18n`         | Client provider and translation/formatting hooks |
| `@repo/i18n/server`  | Server helpers                                   |
| `@repo/i18n/config`  | Locale values, validation, and direction         |
| `@repo/i18n/actions` | Language preference action                       |
| `@repo/i18n/plugin`  | Next.js configuration integration                |

`@repo/i18n/request` is the plugin's internal request configuration entry.

## Add translations

Dictionaries live in `src/messages/{locale}/`.

| File          | Namespace |
| ------------- | --------- |
| `common.json` | Common    |
| `home.json`   | Home      |
| `seo.json`    | Seo       |

Each locale's `index.ts` maps files to namespaces. Persian defines message types;
other catalogs are checked against it. The server lazily loads the active catalog.

To add a domain, create its JSON in every locale and export it from each
`index.ts`. To add a language, update `config.ts`, add its catalog and lazy
loader entry, and review direction and application font support.

Keep locale validation, document direction, domain/key parity, and ICU arguments
consistent between languages. Automated tests are not currently configured.

## Server and client usage

A server-rendered host can install `@repo/i18n/plugin`. The root layout then resolves the
request locale, translates metadata, and sets document language and direction.

Use server helpers for Server Components. The website has no global client
translation provider, keeping the translation runtime off server-only pages.
Wrap interactive features that use translation hooks with their locale, time
zone, and only the needed message domains:

```tsx
import { I18nProvider } from "@repo/i18n";
import { getLocale, getMessages } from "@repo/i18n/server";

const Feature = async () => {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <I18nProvider locale={locale} timeZone="UTC" messages={{ Common: messages.Common }}>
      {/* Interactive components can useTranslations("Common"). */}
    </I18nProvider>
  );
};
```

Use `setLocale` from `@repo/i18n/actions` to change the preference.
When a feature uses Base UI controls, wrap it in UI DirectionProvider aligned
with the document direction. Native controls inherit the document direction.

## Rendering constraints

Cookie-dependent HTML is request-specific; avoid shared static caching of it.
Include locale in translated data cache keys. English is a preference on the
same URL, so do not emit language alternate links pointing both languages there.

UTC is the neutral default for formatting. Use an explicit user or product time
zone when required; language alone does not determine it.

See [development](../../docs/development.md) for available checks.
