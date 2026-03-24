import { localStorage } from "@zos/storage";

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
