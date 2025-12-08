export function getBaseUrl(): string {
  // Если есть переменная окружения с базовым URL, используем её
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }

  // Для локальной разработки используем localhost
  if (window.location.hostname.includes('local') || window.location.hostname === 'localhost') {
    return 'http://localhost:5173';
  }

  // Для production используем текущий origin
  return window.location.origin;
}
