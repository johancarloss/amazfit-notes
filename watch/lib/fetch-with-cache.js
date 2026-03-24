import { getCached, setCache } from "./communication";

/**
 * Cache-first strategy:
 * 1. If cache exists, show immediately (offline mode)
 * 2. Try API in background, update cache and refresh UI if connected
 * 3. If no cache and no connection, show error
 */
export function fetchWithCache(page, method, params, onData, onError) {
  const cached = getCached(method, params);

  if (cached) {
    onData(cached, true);
  }

  try {
    page
      .request({ method: method, params: params || {} })
      .then((data) => {
        const result = data.result || data;
        setCache(method, params, result);
        onData(result, false);
      })
      .catch((err) => {
        if (!cached) {
          onError("Sem conexao e sem cache local");
        }
      });
  } catch (e) {
    if (!cached) {
      onError("Sem conexao e sem cache local");
    }
  }
}
