import assert from "node:assert/strict";
import test from "node:test";
import { classifyQuota, recommendRole } from "../src/services/model-funnel.ts";

test("manual quota registry is the source of Free/Limited/Unknown classification", () => {
  assert.deepEqual(classifyQuota({ status: "FREE", limit: "unlimited", period: "account" }), {
    status: "FREE",
    limit: "unlimited",
    period: "account",
  });
  assert.deepEqual(classifyQuota({ status: "LIMITED", limit: "30 requests/minute", period: "minute" }), {
    status: "LIMITED",
    limit: "30 requests/minute",
    period: "minute",
  });
  assert.deepEqual(classifyQuota(undefined), { status: "UNKNOWN", limit: null, period: null });
});

test("role recommendation uses capability signals and remains a recommendation", () => {
  assert.equal(recommendRole({ slug: "provider/vision-pro", name: "Vision Pro", modality: "vision" }).role, "IMAGE");
  assert.equal(recommendRole({ slug: "provider/embedding-small", name: "Embedding Small" }).role, "EMBEDDINGS");
  assert.equal(recommendRole({ slug: "provider/coder-large", name: "Coder Large", reasoning: true }).role, "OPUS");
  assert.ok(recommendRole({ slug: "provider/general", name: "General" }).score > 0);
});
