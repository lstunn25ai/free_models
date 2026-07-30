/**
 * Type definitions — mirror the backend Prisma schema exactly.
 * These are the contracts between frontend and API.
 */

// ─── Enums (stored as TEXT in SQLite, enforced by app code) ───────────

export type ModelCategory =
  | "OPUS"
  | "SONNET"
  | "HAIKU"
  | "FABLE"
  | "IMAGE"
  | "VIDEO"
  | "EMBEDDINGS"
  | "DEFAULT";

export type HealthStatus = "PENDING" | "ONLINE" | "OFFLINE" | "DEGRADED";

export type FeedbackType = "UP" | "DOWN";

export type ModelPriority =
  | "primary"
  | "backup"
  | "fast"
  | "vision"
  | "code-expert";

// ─── API Response Types ──────────────────────────────────────────────

export interface Provider {
  id: string;
  name: string;
  slug: string;
}

export interface ProviderModel {
  id: string;
  status: HealthStatus;
  speedMs: number | null;
  errorMessage: string | null;
  lastChecked: string | null;
  provider: Provider;
  feedbackCount: number;
  thumbsUp?: number;
  thumbsDown?: number;
}

export interface Model {
  id: string;
  placementId?: string;
  name: string;
  slug: string;
  category: ModelCategory;
  stars: number;
  priority: ModelPriority | null;
  advantage: string | null;
  bestFor: string | null;
  whenToUse: string | null;
  providerModels: ProviderModel[];
}

export interface ModelsResponse {
  categories: Record<string, Model[]>;
}

export interface CategoryModelsResponse {
  models: Model[];
}

export interface ProviderWithReliability extends Provider {
  isEnabled: boolean;
  totalModels: number;
  offlineModels: number;
  workingCandidates: number;
  publishedModels: number;
  isUnreliable: boolean;
}

export interface AdminSession {
  authenticated: boolean;
  initialized: boolean;
  setupRequired: boolean;
  username?: string;
}

export interface AdminProvider extends Provider {
  configured: boolean;
  isEnabled: boolean;
  candidateCount: number;
  approvedModelCount: number;
}

export interface CandidateModel {
  id: string;
  slug: string;
  name: string;
  isFree: boolean;
  freeSource: string | null;
  quotaStatus: "FREE" | "LIMITED" | "PAID" | "UNKNOWN";
  quotaLimit: string | null;
  quotaPeriod: string | null;
  quotaSource: string | null;
  quotaCheckedAt: string | null;
  categorySuggestion: ModelCategory | null;
  roleScore: number | null;
  roleReason: string | null;
  priority: string | null;
  hidden: boolean;
  reviewStatus: "DISCOVERED" | "APPROVED" | "REJECTED";
  testStatus: HealthStatus;
  speedMs: number | null;
  errorMessage: string | null;
  lastChecked: string | null;
  discoveredAt: string;
  provider: Provider;
  roleMatches: Array<{ role: ModelCategory; stars: number; reason: string }>;
}

export interface ProvidersResponse {
  providers: ProviderWithReliability[];
}

export interface FeedbackResponse {
  total: number;
  up: number;
  down: number;
  healthCircle: number; // -100 to 100
  feedbacks: Array<{
    type: FeedbackType;
    createdAt: string;
  }>;
}

export interface RefreshResult {
  id: string;
  status: HealthStatus;
  speedMs: number | null;
  error: string | null;
}

export interface RefreshCategoryResponse {
  category: string;
  totalChecked: number;
  results: RefreshResult[];
}

export interface RefreshModelResponse {
  id: string;
  status: HealthStatus;
  speedMs: number | null;
  error: string | null;
}

export interface NewModelItem {
  id: string;
  slug: string;
  category: ModelCategory | null;
  discoveredAt: string;
}

export interface NewModelProviderGroup {
  providerName: string;
  providerSlug: string;
  models: NewModelItem[];
}

export interface NotificationsResponse {
  totalNew: number;
  providers: NewModelProviderGroup[];
}

// ─── Request Body Types ──────────────────────────────────────────────

export interface CreateModelBody {
  name: string;
  slug: string;
  category: ModelCategory;
  priority?: ModelPriority;
  advantage?: string;
  bestFor?: string;
  whenToUse?: string;
  providerId: string;
}

export interface CreateProviderBody {
  name: string;
  slug: string;
  baseUrl: string;
  apiKey?: string;
}

export interface CreateFeedbackBody {
  providerModelId: string;
  type: FeedbackType;
}
