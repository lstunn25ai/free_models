import assert from "node:assert/strict";
import test from "node:test";
import { diagnoseProviderError } from "../src/services/provider-diagnostic.js";

test("provider diagnostics distinguish credential failures", () => {
  const result = diagnoseProviderError(new Error("openrouter model discovery failed (401)"));
  assert.equal(result.code, "AUTH");
  assert.match(result.action, /API key/);
});

test("provider diagnostics distinguish rate limits", () => {
  const result = diagnoseProviderError(new Error("provider failed: 429"));
  assert.equal(result.code, "RATE_LIMIT");
});
