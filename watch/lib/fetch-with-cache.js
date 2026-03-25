import { getCached, setCache } from "./communication";

/**
 * Cache-first strategy:
 * 1. If cache exists, show it immediately (no API call needed)
 * 2. If no cache, fetch from API, save to cache, show result
 * 3. If no cache and no connection, show error
 *
 * Fresh data is saved silently to cache for next time — no double render.
 */
export function fetchWithCache(page, method, params, onData, onError) {
  const cached = getCached(method, params);

  if (cached) {
    onData(cached, true);

    // Silently update cache in background (no re-render)
    try {
      page
        .request({ method: method, params: params || {} })
        .then((data) => {
          const result = data.result || data;
          setCache(method, params, result);
        })
        .catch(() => {});
    } catch (e) {
      // offline — cache already shown, ignore
    }
    return;
  }

  // No cache — must fetch from API
  try {
    page
      .request({ method: method, params: params || {} })
      .then((data) => {
        const result = data.result || data;
        setCache(method, params, result);
        onData(result, false);
      })
      .catch((err) => {
        onError("Sem conexao e sem cache local");
      });
  } catch (e) {
    onError("Sem conexao e sem cache local");
  }
}
