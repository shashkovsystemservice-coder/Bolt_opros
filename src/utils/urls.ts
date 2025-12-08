export function getBaseUrl(): string {
  // Если есть переменная окружения с базовым URL, используем её
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }

  // В среде разработки очищаем URL от специфичных параметров
  const origin = window.location.origin;

  // Если URL содержит .local-credentialless, извлекаем базовый URL
  if (origin.includes('.local-credentialless')) {
    // Извлекаем чистый URL из формата разработки
    const match = origin.match(/https:\/\/([^-]+)-/);
    if (match) {
      // Возвращаем URL в формате webcontainer
      const hash = match[1];
      return `https://${hash}.bolt.new`;
    }
  }

  return origin;
}
