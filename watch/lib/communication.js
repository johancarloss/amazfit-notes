import { LocalStorage } from "@zos/storage";

const localStorage = new LocalStorage();

export const MSG = {
  GET_WATCH_NOTES: "GET_WATCH_NOTES",
  GET_ROOT_FOLDERS: "GET_ROOT_FOLDERS",
  GET_FOLDER: "GET_FOLDER",
  GET_NOTE_BLOCKS: "GET_NOTE_BLOCKS",
};

function cacheKey(method, params) {
  return "c:" + method + ":" + JSON.stringify(params || {});
}

export function getCached(method, params) {
  try {
    const raw = localStorage.getItem(cacheKey(method, params));
    if (raw === undefined || raw === null || raw === false) return null;
    // Zepp OS LocalStorage stores any type natively.
    // Handle both: legacy string values (JSON) and native objects.
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    return null;
  }
}

export function setCache(method, params, data) {
  try {
    // Store as native object — Zepp OS LocalStorage accepts any type.
    // Avoids creating large JSON strings that may exceed per-key limits.
    localStorage.setItem(cacheKey(method, params), data);
    localStorage.setItem("lastSync", Date.now().toString());
  } catch (e) {
    // Storage full — ignore
  }
}
