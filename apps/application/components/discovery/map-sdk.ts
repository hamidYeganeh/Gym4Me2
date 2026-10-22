let loading: Promise<void> | undefined;

/** One verified local SDK load across route entries; failed loads can be retried. */
export function loadMapSdk() {
  if (window.L) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/leaflet/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "anonymous";
    script.async = true;
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("Map SDK unavailable"));
    };
    const timeout = window.setTimeout(fail, 20000);
    script.onerror = fail;
    script.onload = () => {
      if (!window.L) {
        fail();
        return;
      }
      clearTimeout(timeout);
      resolve();
    };
    document.head.append(script);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
