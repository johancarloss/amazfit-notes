import { getCached, setCache } from "./communication";

/**
 * Cache-first strategy:
 * 1. If cache exists → show immediately (offline mode)
 * 2. Then try API in background → update cache + refresh UI if connected
 * 3. If no cache and no connection → show error
 *
 * @param {object} page - The BasePage instance (has this.request)
 * @param {string} method - MSG constant
 * @param {object} params - Request params
 * @param {function} onData - function(data, isOffline) called with result
 * @param {function} onError - function(errorMsg) called when no cache and no connection
 */
export function fetchWithCache(page, method, params, onData, onError) {
  var cached = getCached(method, params);

  if (cached) {
    // Show cached data immediately
    onData(cached, true);
  }

  // Try to fetch fresh data from API
  try {
    page
      .request({ method: method, params: params || {} })
      .then(function (data) {
        var result = data.result || data;
        setCache(method, params, result);
        // Update with fresh data (replace offline indicator)
        onData(result, false);
      })
      .catch(function (err) {
        // BLE error — if we already showed cache, do nothing
        if (!cached) {
          onError("Sem conexao e sem cache local");
        }
      });
  } catch (e) {
    // this.request() itself threw (BLE not available at all)
    if (!cached) {
      onError("Sem conexao e sem cache local");
    }
  }
}
