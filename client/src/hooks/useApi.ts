/**
 * Data fetching hooks — TanStack React Query wrappers.
 * Each hook encapsulates cache keys, invalidation, and mutations.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CreateModelBody,
  CreateProviderBody,
  CreateFeedbackBody,
} from "@/lib/types";

// ─── Query Keys ──────────────────────────────────────────────────────

export const queryKeys = {
  models: ["models"] as const,
  modelsByCategory: (cat: string) => ["models", cat] as const,
  providers: ["providers"] as const,
  feedback: (pmId: string) => ["feedback", pmId] as const,
  notifications: ["notifications"] as const,
  adminSession: ["admin", "session"] as const,
  adminProviders: ["admin", "providers"] as const,
  candidates: (provider?: string) => ["admin", "candidates", provider ?? "all"] as const,
};

export function useAdminSession() {
  return useQuery({ queryKey: queryKeys.adminSession, queryFn: api.getAdminSession, retry: false });
}

export function useAdminProviders(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.adminProviders, queryFn: api.getAdminProviders, enabled, retry: false });
}

export function useCandidates(enabled: boolean, provider?: string) {
  return useQuery({ queryKey: queryKeys.candidates(provider), queryFn: () => api.getCandidates(provider), enabled, retry: false });
}

export function useAdminActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminProviders });
    qc.invalidateQueries({ queryKey: ["admin", "candidates"] });
    qc.invalidateQueries({ queryKey: queryKeys.models });
    qc.invalidateQueries({ queryKey: queryKeys.providers });
  };
  return {
    setup: useMutation({ mutationFn: ({ password, setupToken }: { password: string; setupToken: string }) => api.setupAdmin(password, setupToken), onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminSession }) }),
    login: useMutation({ mutationFn: api.login, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminSession }) }),
    logout: useMutation({ mutationFn: api.logout, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminSession }) }),
    discover: useMutation({ mutationFn: api.discoverProvider, onSuccess: invalidate }),
    setFree: useMutation({ mutationFn: ({ id, isFree }: { id: string; isFree: boolean }) => api.setCandidateFree(id, isFree), onSuccess: invalidate }),
    test: useMutation({ mutationFn: api.testCandidate, onSuccess: invalidate }),
    approve: useMutation({ mutationFn: ({ id, category, stars }: { id: string; category: import("@/lib/types").ModelCategory; stars: number }) => api.approveCandidate(id, category, stars), onSuccess: invalidate }),
    reject: useMutation({ mutationFn: api.rejectCandidate, onSuccess: invalidate }),
  };
}

// ─── Models ──────────────────────────────────────────────────────────

export function useModels() {
  return useQuery({
    queryKey: queryKeys.models,
    queryFn: api.getModels,
  });
}

export function useModelsByCategory(category: string) {
  return useQuery({
    queryKey: queryKeys.modelsByCategory(category),
    queryFn: () => api.getModelsByCategory(category),
  });
}

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateModelBody) => api.createModel(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.models });
    },
  });
}

// ─── Providers ───────────────────────────────────────────────────────

export function useProviders() {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: api.getProviders,
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProviderBody) => api.createProvider(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.providers });
    },
  });
}

// ─── Feedback ────────────────────────────────────────────────────────

export function useFeedback(providerModelId: string) {
  return useQuery({
    queryKey: queryKeys.feedback(providerModelId),
    queryFn: () => api.getFeedback(providerModelId),
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFeedbackBody) => api.createFeedback(body),
    onSuccess: (_data, variables) => {
      // Invalidate feedback for this provider-model
      qc.invalidateQueries({
        queryKey: queryKeys.feedback(variables.providerModelId),
      });
      // Also invalidate models — feedbackCount changes
      qc.invalidateQueries({ queryKey: queryKeys.models });
    },
  });
}

// ─── Refresh (Racing Engine) ─────────────────────────────────────────

export function useRefreshCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (category: string) => api.refreshCategory(category),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.models });
    },
  });
}

export function useRefreshModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.refreshModel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.models });
    },
  });
}

// ─── Notifications ───────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.getNotifications,
    // Poll every 60s — new model discovery is not time-critical
    refetchInterval: 60_000,
  });
}

export function useAcknowledgeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.acknowledgeNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
