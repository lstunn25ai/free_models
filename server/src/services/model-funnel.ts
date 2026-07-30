export type QuotaStatus = "FREE" | "LIMITED" | "UNKNOWN";
export type ModelRole = "OPUS" | "SONNET" | "HAIKU" | "FABLE" | "IMAGE" | "VIDEO" | "EMBEDDINGS" | "DEFAULT";

export interface QuotaRuleInput {
  status: QuotaStatus;
  limit?: string | null;
  period?: string | null;
}

export interface QuotaClassification {
  status: QuotaStatus;
  limit: string | null;
  period: string | null;
}

export function classifyQuota(rule: QuotaRuleInput | undefined): QuotaClassification {
  if (!rule || !["FREE", "LIMITED"].includes(rule.status)) {
    return { status: "UNKNOWN", limit: null, period: null };
  }
  return {
    status: rule.status,
    limit: rule.limit ?? null,
    period: rule.period ?? null,
  };
}

export interface RoleSignals {
  slug: string;
  name: string;
  modality?: string;
  reasoning?: boolean;
}

export interface RoleRecommendation {
  role: ModelRole;
  score: number;
  reason: string;
}

export function recommendRole(model: RoleSignals): RoleRecommendation {
  const value = `${model.slug} ${model.name}`.toLowerCase();
  if (/(embedding|embed|rerank)/.test(value)) return { role: "EMBEDDINGS", score: 100, reason: "Model identifier indicates embeddings or reranking." };
  if (/(video|veo|wan-video|kling)/.test(value)) return { role: "VIDEO", score: 95, reason: "Model identifier indicates video generation." };
  if (model.modality === "vision" || /(vision|image|vl|visual)/.test(value)) return { role: "IMAGE", score: 90, reason: "Model exposes vision or image capability." };
  if (/(deepseek.*(v4.*pro|r1)|glm[- ]?5(\.|-|$)|kimi[- ]?k(2\.5|26|3)|qwen3.*(235b|coder)|gemma[- ]?3.*27b|nemotron.*(super|ultra))/.test(value)) return { role: "OPUS", score: 100, reason: "Known high-capability model family; benchmark confirmation is required before publication." };
  if (model.reasoning || /(reason|thinking|opus|ultra|coder)/.test(value)) return { role: "OPUS", score: 80, reason: "Reasoning or coding capability signal; benchmark confirmation is required." };
  if (/(fast|mini|small|nano|flash|haiku)/.test(value)) return { role: "HAIKU", score: 70, reason: "Model signals suggest a fast or lightweight role." };
  if (/(story|creative|fable|write)/.test(value)) return { role: "FABLE", score: 65, reason: "Model signals suggest creative text generation." };
  if (/(code|coder|medium|general)/.test(value)) return { role: "SONNET", score: 60, reason: "Model signals suggest a general coding and text role." };
  return { role: "DEFAULT", score: 25, reason: "No verified capability signal was detected." };
}
