import { getCached, setCache } from "./communication";

/**
 * Try to fetch from API. On success, cache the result.
 * On failure (BLE disconnect), fall back to cached data.
 *
 * @param {object} page - The BasePage instance (has this.request)
 * @param {string} method - MSG constant
 * @param {object} params - Request params
 * @param {function} onData - function(data, isOffline) called with result
 * @param {function} onError - function(errorMsg) called when no cache and no connection
 */
export function fetchWithCache(page, method, params, onData, onError) {
  page
    .request({ method: method, params: params || {} })
    .then(function (data) {
      var result = data.result || data;
      setCache(method, params, result);
      onData(result, false);
    })
    .catch(function (err) {
      // BLE error — try cache
      var cached = getCached(method, params);
      if (cached) {
        onData(cached, true);
      } else {
        onError("Sem conexao e sem cache local");
      }
    });
}
