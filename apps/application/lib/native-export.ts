import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export type ExportPlatform = {
  native: () => boolean;
  available: (plugin: string) => boolean;
  files: Pick<
    typeof Filesystem,
    "mkdir" | "readdir" | "deleteFile" | "writeFile"
  >;
  share: Pick<typeof Share, "canShare" | "share">;
  now: () => number;
  id: () => string;
};
const platform: ExportPlatform = {
  native: () => Capacitor.isNativePlatform(),
  available: (plugin) => Capacitor.isPluginAvailable(plugin),
  files: Filesystem,
  share: Share,
  now: () => Date.now(),
  id: () => crypto.randomUUID(),
};
const folder = "gym4me-exports";
const lifetime = 60 * 60 * 1000;
export async function clearExpiredNativeExports(
  adapter: ExportPlatform = platform,
) {
  if (!adapter.native()) return;
  await adapter.files
    .mkdir({
      path: folder,
      directory: Directory.Cache,
      recursive: true,
    })
    .catch(() => undefined);
  const { files } = await adapter.files.readdir({
    path: folder,
    directory: Directory.Cache,
  });
  for (const file of files) {
    if (
      /^account-[0-9a-f-]{36}\.json$/i.test(file.name) &&
      adapter.now() - file.mtime > lifetime
    ) {
      await adapter.files.deleteFile({
        path: `${folder}/${file.name}`,
        directory: Directory.Cache,
      });
    }
  }
}
export async function exportNativeAccount(
  data: unknown,
  adapter: ExportPlatform = platform,
) {
  if (
    !adapter.native() ||
    !adapter.available("Filesystem") ||
    !adapter.available("Share")
  )
    throw new Error("Privacy.exportUnavailable");
  const path = `${folder}/account-${adapter.id()}.json`;
  try {
    if (!(await adapter.share.canShare()).value)
      throw new Error("Privacy.exportUnavailable");
    await clearExpiredNativeExports(adapter);
    const file = await adapter.files.writeFile({
      path,
      data: JSON.stringify(data, null, 2),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    await adapter.share.share({ files: [file.uri] });
    // Android may resolve when the recipient is selected, before it reads the file.
    // Keep this app-private cache file briefly; clean it on export/launch/resume.
  } catch {
    await adapter.files
      .deleteFile({ path, directory: Directory.Cache })
      .catch(() => undefined);
    throw new Error("Privacy.exportUnavailable");
  }
}
