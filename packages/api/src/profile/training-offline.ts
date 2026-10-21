/** Only workout/program drafts; private conversation media never enter this store. */
const name = "gym4me.training.v1";
let epoch = 0;
let writes: Promise<unknown> = Promise.resolve();
export const trainingEpoch = () => epoch;
type Entry = { key: string; owner: string; kind: string; value: unknown };
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("drafts", { keyPath: "key" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("drafts", mode),
        request = work(tx.objectStore("drafts"));
      let value: T;
      request.onsuccess = () => {
        value = request.result;
      };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function saveTrainingLocal(
  owner: string,
  kind: string,
  id: string,
  value: unknown,
  expectedEpoch = epoch,
) {
  if (expectedEpoch !== epoch) return;
  const write = writes
    .catch(() => undefined)
    .then(() =>
      expectedEpoch === epoch
        ? transaction("readwrite", (store) =>
            expectedEpoch === epoch
              ? store.put({ key: `${owner}:${kind}:${id}`, owner, kind, value })
              : store.get("__reset__"),
          )
        : undefined,
    );
  writes = write;
  await write;
}
export async function loadTrainingLocal<T>(
  owner: string,
  kind: string,
  id: string,
): Promise<T | null> {
  await writes.catch(() => undefined);
  const value = await transaction<Entry | undefined>("readonly", (s) =>
    s.get(`${owner}:${kind}:${id}`),
  );
  return value?.owner === owner ? (value.value as T) : null;
}
export async function removeTrainingLocal(
  owner: string,
  kind: string,
  id: string,
) {
  await transaction("readwrite", (s) => s.delete(`${owner}:${kind}:${id}`));
}
export async function clearTrainingLocal() {
  epoch++;
  if (typeof localStorage !== "undefined")
    localStorage.removeItem("gym4me.training.owner");
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("gym4me:training-reset"));
  if (typeof indexedDB !== "undefined")
    await transaction("readwrite", (s) => s.clear());
}

export async function listTrainingLocal<T>(
  owner: string,
  kind: string,
): Promise<T[]> {
  await writes.catch(() => undefined);
  const entries = await transaction<Entry[]>("readonly", (store) =>
    store.getAll(),
  );
  return entries
    .filter((e) => e.owner === owner && e.kind === kind)
    .map((e) => e.value as T);
}
