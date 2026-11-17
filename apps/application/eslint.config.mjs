import { nextJsConfig } from "@repo/eslint-config/next-js";

export default [{ ignores: ["android/", "ios/"] }, ...nextJsConfig];
