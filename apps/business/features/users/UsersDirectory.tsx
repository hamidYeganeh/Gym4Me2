"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

import { useTranslations } from "@repo/i18n";
import { AnimatedButton } from "@repo/ui/kit/button";
import { Input } from "@repo/ui/kit/input";

import { directoryClasses } from "./directory-classes";
import { createProfileSchema } from "./profile-schema";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("gym4me:profiles", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("gym4me:profiles", callback);
  };
}
function snapshot() {
  try {
    return JSON.stringify(
      Object.keys(localStorage)
        .filter((key) => key.startsWith("gym4me:profile:"))
        .sort()
        .map((key) => [key, localStorage.getItem(key)]),
    );
  } catch {
    return "[]";
  }
}
const serverSnapshot = () => "[]";

export const UsersDirectory = (props: { panel: "admin" | "business" }) => {
  const { panel } = props;
  const t = useTranslations("UserSettings");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const users = useMemo(() => {
    const prefix = `gym4me:profile:${panel}:`;
    return (JSON.parse(stored) as [string, string][]).flatMap(([key, value]) => {
      if (!key.startsWith(prefix)) return [];
      try {
        const result = createProfileSchema(() => "").safeParse({
          phones: [],
          ...JSON.parse(value),
        });
        return result.success ? [{ id: key.slice(prefix.length), ...result.data }] : [];
      } catch {
        return [];
      }
    });
  }, [stored, panel]);
  const visible = users.filter((user) =>
    [user.name, user.username, ...user.phones.map((p) => p.number)]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <main className={directoryClasses.page}>
      <header className={directoryClasses.header}>
        <div>
          <h1>{t("directory.title")}</h1>
          <p>{t("local")}</p>
        </div>
        <AnimatedButton onClick={() => router.push(`/users/${crypto.randomUUID()}`)}>
          {t("directory.add")}
        </AnimatedButton>
      </header>
      <Input
        aria-label={t("directory.search")}
        placeholder={t("directory.search")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {visible.length ?
        <ul className={directoryClasses.list}>
          {visible.map((user) => (
            <li key={user.id}>
              <Link href={`/users/${encodeURIComponent(user.id)}`} className={directoryClasses.row}>
                <span className={directoryClasses.avatar} aria-hidden>
                  {user.name.slice(0, 1)}
                </span>
                <span>
                  <strong>{user.name}</strong>
                  <small dir="ltr">{user.phones[0]?.number || user.username}</small>
                </span>
                <span aria-hidden>↗</span>
              </Link>
            </li>
          ))}
        </ul>
      : <section className={directoryClasses.empty}>
          <h2>{t(query ? "directory.noResults" : "directory.empty")}</h2>
          <p>{t("directory.description")}</p>
        </section>
      }
    </main>
  );
};
