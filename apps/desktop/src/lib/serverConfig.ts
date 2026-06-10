export const SERVER_URL_STORAGE_KEY = "uno-server-url";
export const DEFAULT_SERVER_URL = "http://localhost:3000";

export function normalizeServerUrl(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error("La URL del servidor es requerida.");
  }

  const hasProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmedValue);
  const urlValue = hasProtocol ? trimmedValue : `http://${trimmedValue}`;
  const url = new URL(urlValue);

  if (!hasProtocol && !url.port) {
    url.port = "3000";
  }

  return url.toString().replace(/\/$/, "");
}

export function getStoredServerUrl(): string {
  const storedUrl = window.localStorage.getItem(SERVER_URL_STORAGE_KEY);

  if (!storedUrl) {
    return DEFAULT_SERVER_URL;
  }

  try {
    return normalizeServerUrl(storedUrl);
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

export function saveServerUrl(value: string): string {
  const normalizedUrl = normalizeServerUrl(value);

  window.localStorage.setItem(SERVER_URL_STORAGE_KEY, normalizedUrl);

  return normalizedUrl;
}
