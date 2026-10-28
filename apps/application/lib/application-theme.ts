export const applicationThemeStorageKey = "gym4me-application-theme";

// Run before next-themes reads its key so an upgraded native install keeps its theme.
export const applicationThemeMigration = `try {
  const key = ${JSON.stringify(applicationThemeStorageKey)};
  if (localStorage.getItem(key) === null) {
    const previous = localStorage.getItem("theme");
    if (["light", "dark", "system"].includes(previous)) {
      localStorage.setItem(key, previous);
    }
  }
} catch {}`;
