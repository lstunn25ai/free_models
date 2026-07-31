export type ProviderDiagnostic = {
  code: "AUTH" | "QUOTA" | "PERMISSION" | "RATE_LIMIT" | "ENDPOINT" | "TIMEOUT" | "UPSTREAM" | "UNKNOWN";
  message: string;
  action: string;
};

export function diagnoseProviderError(error: unknown): ProviderDiagnostic {
  const raw = error instanceof Error ? error.message : "";
  const status = Number(raw.match(/\((\d{3})\)|:\s*(\d{3})/)?.slice(1).find(Boolean));
  if (status === 401) return { code: "AUTH", message: "Провайдер отклонил credential (401).", action: "Проверьте или перевыпустите API key в Portainer и сделайте redeploy." };
  if (status === 402) return { code: "QUOTA", message: "У credential закончилась квота или требуется биллинг (402).", action: "Проверьте баланс и лимиты аккаунта провайдера." };
  if (status === 403) return { code: "PERMISSION", message: "Credential принят, но не имеет доступа к каталогу или моделям (403).", action: "Проверьте scope, регион и разрешения API key." };
  if (status === 404) return { code: "ENDPOINT", message: "Endpoint каталога провайдера не найден (404).", action: "Проверьте актуальный Base URL и версию API." };
  if (status === 429) return { code: "RATE_LIMIT", message: "Провайдер ограничил частоту запросов (429).", action: "Подождите и повторите запрос; проверьте rate limits." };
  if (status >= 500) return { code: "UPSTREAM", message: `Провайдер временно недоступен (${status}).`, action: "Повторите позже; это ответ upstream, а не ошибка UI." };
  if (/timeout|timed out|abort/i.test(raw)) return { code: "TIMEOUT", message: "Провайдер не ответил за отведённое время.", action: "Проверьте доступность endpoint и повторите запрос." };
  return { code: "UNKNOWN", message: "Discovery не выполнен: провайдер не вернул пригодный ответ.", action: "Проверьте credential, Base URL и доступ к API из контейнера." };
}
