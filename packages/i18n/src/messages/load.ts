import "server-only";

import type { Locale } from "../config";
import type { Messages } from "./schema";

const loaders = {
  fa: () => import("./fa"),
  en: () => import("./en"),
} satisfies Record<Locale, () => Promise<{ default: Messages }>>;

export const loadMessages = async (locale: Locale): Promise<Messages> =>
  (await loaders[locale]()).default;
