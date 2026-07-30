import assert from "node:assert/strict";
import test from "node:test";
import { classifyQuota, recommendRole } from "../src/services/model-funnel.ts";

test("manual quota registry overrides catalog evidence", () => {
  assert.deepEqual(classifyQuota({ status: "LIMITED", limit: "30 requests", period: "minute" }, { isFree: true, freeSource: "catalog" }), {
    status: "LIMITED", limit: "30 requests", period: "minute", source: "Manual quota registry",
  });
});

test("catalog free evidence becomes a Free candidate before a smoke test", () => {
  assert.deepEqual(classifyQuota(undefined, { isFree: true, freeSource: "OpenRouter :free catalog label" }), {
    status: "FREE", limit: null, period: null, source: "OpenRouter :free catalog label",
  });
  assert.deepEqual(classifyQuota(undefined), { status: "UNKNOWN", limit: null, period: null, source: null });
});

test("role recommendation remains a recommendation", () => {
  assert.equal(recommendRole({ slug: "provider/vision-pro", name: "Vision Pro", modality: "vision" }).role, "IMAGE");
  assert.equal(recommendRole({ slug: "provider/embedding-small", name: "Embedding Small" }).role, "EMBEDDINGS");
});
