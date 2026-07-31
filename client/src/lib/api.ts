/**
 * API client — thin wrapper over fetch with typed responses.
 * All endpoints map 1:1 to the backend Express routes.
 */

const BASE_URL = "/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // Response had no JSON body
    }
    throw new ApiError(res.status, message);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ─── Endpoints ───────────────────────────────────────────────────────

export const api = {
  // Health
  health: () => request<{ status: string; timestamp: string }>("/health"),

  // Private administration
  getAdminSession: () => request<import("./types").AdminSession>("/auth/session"),
  login: (password: string) => request<void>("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  changeAdminPassword: (currentPassword: string, newPassword: string) => request<void>("/auth/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  getAdminProviders: () => request<{ providers: import("./types").AdminProvider[] }>("/admin/providers"),
  getCandidates: (provider?: string) => request<{ candidates: import("./types").CandidateModel[] }>(`/admin/candidates${provider ? `?provider=${encodeURIComponent(provider)}` : ""}`),
  discoverProvider: (slug: string) => request<{ provider: string; imported: number; freeCandidates: number }>(`/admin/providers/${encodeURIComponent(slug)}/discover`, { method: "POST" }),
  discoverAllProviders: () => request<{ results: Array<{ provider: string; imported: number; error?: string }> }>("/admin/providers/discover-all", { method: "POST" }),
  setCandidateFree: (id: string, isFree: boolean) => request<{ candidate: import("./types").CandidateModel }>(`/admin/candidates/${encodeURIComponent(id)}/free`, { method: "POST", body: JSON.stringify({ isFree }) }),
  setCandidateQuota: (id: string, status: import("./types").CandidateModel["quotaStatus"], limit?: string, period?: string, source?: string) => request<{ candidate: import("./types").CandidateModel }>(`/admin/candidates/${encodeURIComponent(id)}/quota`, { method: "POST", body: JSON.stringify({ status, limit, period, source }) }),
  testCandidate: (id: string) => request<{ candidate: import("./types").CandidateModel }>(`/admin/candidates/${encodeURIComponent(id)}/test`, { method: "POST" }),
  testAllCandidates: (input: { provider: string; scope: "AVAILABLE" | "ALL" | "VISIBLE"; filter?: "ALL" | "FOCUS" | "ARCHIVE" | "HIDDEN"; quota?: "ALL" | "FREE" | "LIMITED" | "PAID" | "UNKNOWN"; confirmPaidUnknown?: boolean }) => request<{ provider: string; scope: "AVAILABLE" | "ALL" | "VISIBLE"; totalChecked: number; results: Array<{ id: string; status: string; speedMs?: number | null; error?: string | null }> }>("/admin/candidates/test-all", { method: "POST", body: JSON.stringify(input) }),
  updateCandidateMetadata: (id: string, body: { category?: import("./types").ModelCategory; priority?: string; hidden?: boolean }) => request<{ candidate: import("./types").CandidateModel }>(`/admin/candidates/${encodeURIComponent(id)}/metadata`, { method: "POST", body: JSON.stringify(body) }),
  approveCandidate: (id: string, placements: Array<{ role: import("./types").ModelCategory; stars: number }>) => request<{ model: import("./types").Model }>(`/admin/candidates/${encodeURIComponent(id)}/approve`, { method: "POST", body: JSON.stringify({ placements }) }),
  rejectCandidate: (id: string) => request<void>(`/admin/candidates/${encodeURIComponent(id)}/reject`, { method: "POST" }),
  removePlacement: (id: string) => request<void>(`/admin/placements/${encodeURIComponent(id)}`, { method: "DELETE" }),
  discoverCustom: (baseUrl: string, apiKey: string) => request<{ models: Array<{ slug: string; name: string; roleMatches: Array<{ role: import("./types").ModelCategory; stars: number; reason: string }> }> }>("/admin/custom/discover", { method: "POST", body: JSON.stringify({ baseUrl, apiKey }) }),
  testCustom: (baseUrl: string, apiKey: string, model: string) => request<{ status: "ONLINE" | "OFFLINE"; speedMs?: number; error?: string }>("/admin/custom/test", { method: "POST", body: JSON.stringify({ baseUrl, apiKey, model }) }),

  // Models
  getModels: () =>
    request<import("./types").ModelsResponse>("/models"),

  getModelsByCategory: (category: string) =>
    request<import("./types").CategoryModelsResponse>(`/models/${category}`),

  createModel: (body: import("./types").CreateModelBody) =>
    request<import("./types").Model>("/models", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Providers
  getProviders: () =>
    request<import("./types").ProvidersResponse>("/providers"),

  createProvider: (body: import("./types").CreateProviderBody) =>
    request<import("./types").ProviderWithReliability>("/providers", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Feedback
  getFeedback: (providerModelId: string) =>
    request<import("./types").FeedbackResponse>(
      `/feedback/${providerModelId}`,
    ),
  getProviderStats: () => request<{ providers: Array<{ id: string; name: string; slug: string; total: number; online: number; failed: number; reliability: number; up: number; down: number }> }>("/feedback/stats/providers"),

  createFeedback: (body: import("./types").CreateFeedbackBody) =>
    request<{ feedback: { id: string; type: string; createdAt: string } }>(
      "/feedback",
      { method: "POST", body: JSON.stringify(body) },
    ),

  // Refresh (Racing Engine)
  refreshCategory: (category: string) =>
    request<import("./types").RefreshCategoryResponse>(
      `/refresh/category/${category}`,
      { method: "POST" },
    ),

  refreshModel: (id: string) =>
    request<import("./types").RefreshModelResponse>(
      `/refresh/model/${id}`,
      { method: "POST" },
    ),

  // Notifications
  getNotifications: () =>
    request<import("./types").NotificationsResponse>("/notifications"),

  acknowledgeNotification: (id: string) =>
    request<{ acknowledged: boolean; id: string }>(
      `/notifications/${id}/acknowledge`,
      { method: "POST" },
    ),
};

export { ApiError };
