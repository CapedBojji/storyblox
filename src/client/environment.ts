declare global {
  interface Window {
    __UI_CLAPS_API_BASE_URL__?: string;
    __UI_CLAPS_EMBEDDED__?: boolean;
  }
}

export function isEmbeddedPreview(): boolean {
  return window.__UI_CLAPS_EMBEDDED__ === true;
}

export function getApiUrl(path: string): string {
  const baseUrl = window.__UI_CLAPS_API_BASE_URL__;
  if (!baseUrl) return path;

  return new URL(path, ensureTrailingSlash(baseUrl)).toString();
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
