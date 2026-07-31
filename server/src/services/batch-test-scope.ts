import type { QuotaStatus } from "./model-funnel.js";

export type BatchScope = "AVAILABLE" | "ALL" | "VISIBLE";
export type CandidateFilter = "ALL" | "FOCUS" | "ARCHIVE" | "HIDDEN";

export function parseBatchRequest(body: unknown): {
  scope: BatchScope;
  filter: CandidateFilter | undefined;
  quota: QuotaStatus | "ALL";
} {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const scope: BatchScope = value.scope === "ALL" || value.scope === "VISIBLE" ? value.scope : "AVAILABLE";
  const filter = ["ALL", "FOCUS", "ARCHIVE", "HIDDEN"].includes(String(value.filter))
    ? value.filter as CandidateFilter
    : undefined;
  const quota = ["ALL", "FREE", "LIMITED", "PAID", "UNKNOWN"].includes(String(value.quota))
    ? value.quota as QuotaStatus | "ALL"
    : "ALL";
  return { scope, filter, quota };
}

export function availableQuotaWhere(scope: BatchScope) {
  return scope === "AVAILABLE" ? { quotaStatus: { in: ["FREE", "LIMITED"] } } : {};
}
