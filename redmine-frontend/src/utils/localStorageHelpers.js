const isBrowser = typeof window !== 'undefined';

export function readJson(key, fallback = null) {
  if (!isBrowser) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (value === null || value === undefined) return fallback;
    return JSON.parse(value);
  } catch (error) {
    console.warn(`[localStorage] Failed to read key "${key}":`, error);
    return fallback;
  }
}

export function writeJson(key, value) {
  if (!isBrowser) return;
  try {
    if (value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn(`[localStorage] Failed to write key "${key}":`, error);
  }
}

export function readString(key, fallback = '') {
  if (!isBrowser) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value === null || value === undefined ? fallback : value;
  } catch (error) {
    console.warn(`[localStorage] Failed to read key "${key}":`, error);
    return fallback;
  }
}

export function writeString(key, value) {
  if (!isBrowser) return;
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, String(value));
    }
  } catch (error) {
    console.warn(`[localStorage] Failed to write key "${key}":`, error);
  }
}

export function readNumber(key, fallback = 0) {
  const raw = readString(key, null);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function writeNumber(key, value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    writeString(key, null);
    return;
  }
  writeString(key, value);
}

export function removeKey(key) {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[localStorage] Failed to remove key "${key}":`, error);
  }
}


