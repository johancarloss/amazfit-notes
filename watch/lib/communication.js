import { localStorage } from "@zos/storage";

// Message protocol constants
export var MSG = {
  GET_WATCH_NOTES: "GET_WATCH_NOTES",
  GET_ROOT_FOLDERS: "GET_ROOT_FOLDERS",
  GET_FOLDER: "GET_FOLDER",
  GET_NOTE_BLOCKS: "GET_NOTE_BLOCKS",
};

// --- Persistent cache (survives app restarts, no TTL) ---

function cacheKey(method, params) {
  return "c:" + method + ":" + JSON.stringify(params || {});
}

export function getCached(method, params) {
  try {
    var raw = localStorage.getItem(cacheKey(method, params));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setCache(method, params, data) {
  try {
    localStorage.setItem(cacheKey(method, params), JSON.stringify(data));
    localStorage.setItem("lastSync", Date.now().toString());
  } catch (e) {
    // Storage full — ignore
  }
}

export function getLastSync() {
  try {
    var ts = localStorage.getItem("lastSync");
    if (!ts) return null;
    return parseInt(ts, 10);
  } catch (e) {
    return null;
  }
}
