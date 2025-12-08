export function getBaseUrl(): string {
  // Если есть переменная окружения с базовым URL, используем её
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }

  // Используем текущий origin без изменений
  return window.location.origin;
}
