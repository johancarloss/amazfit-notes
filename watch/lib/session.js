import { LocalStorage } from "@zos/storage";
import { setWakeUpRelaunch } from "@zos/display";
import { setPageBrightTime } from "@zos/display";
import { pauseDropWristScreenOff } from "@zos/display";

const storage = new LocalStorage();
const SESSION_KEY = "lastPage";

/**
 * Enable wake-up relaunch and extended screen time.
 * Call this in every page's onInit or build.
 */
export function keepAlive() {
  try {
    setWakeUpRelaunch({ relaunch: true });
    setPageBrightTime({ brightTime: 120000 }); // 2 min screen on
    pauseDropWristScreenOff({ duration: 30000 }); // 30s ignore wrist drop
  } catch (e) {
    // ignore — some APIs may not be available
  }
}

/**
 * Save the current page URL + params so the app can restore on relaunch.
 */
export function saveSession(url, params) {
  try {
    storage.setItem(SESSION_KEY, JSON.stringify({ url, params }));
  } catch (e) {
    // ignore
  }
}

/**
 * Get the last saved page session.
 * Returns { url, params } or null.
 */
export function getSession() {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    return null;
  }
}

/**
 * Clear saved session (e.g., when user navigates to home).
 */
export function clearSession() {
  try {
    storage.removeItem(SESSION_KEY);
  } catch (e) {
    // ignore
  }
}
