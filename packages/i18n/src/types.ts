import type messages from "./messages/fa.json";
import type { Locale } from "./config";
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
