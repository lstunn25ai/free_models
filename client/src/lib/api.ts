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
