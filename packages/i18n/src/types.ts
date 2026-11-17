import type {} from "next-intl";

import type { Locale } from "./config";
import type { Messages } from "./messages/schema";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
