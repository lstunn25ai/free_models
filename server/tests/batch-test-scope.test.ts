import assert from "node:assert/strict";
import test from "node:test";
import { availableQuotaWhere, parseBatchRequest } from "../src/services/batch-test-scope.js";

test("VISIBLE scope is preserved and does not silently become AVAILABLE", () => {
  const parsed = parseBatchRequest({ scope: "VISIBLE", filter: "ALL", quota: "ALL" });
  assert.equal(parsed.scope, "VISIBLE");
  assert.deepEqual(availableQuotaWhere(parsed.scope), {});
});

test("AVAILABLE scope remains restricted to free and limited candidates", () => {
  const parsed = parseBatchRequest({ scope: "AVAILABLE" });
  assert.equal(parsed.scope, "AVAILABLE");
  assert.deepEqual(availableQuotaWhere(parsed.scope), { quotaStatus: { in: ["FREE", "LIMITED"] } });
});
