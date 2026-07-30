import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ADMIN_PASSWORD_LENGTH,
  MIN_ADMIN_PASSWORD_LENGTH,
  validateAdminPassword,
} from "../src/config/password-policy.ts";

test("accepts an admin password inside the configured bounds", () => {
  assert.equal(validateAdminPassword("a".repeat(MIN_ADMIN_PASSWORD_LENGTH)), "a".repeat(MIN_ADMIN_PASSWORD_LENGTH));
  assert.equal(validateAdminPassword("a".repeat(MAX_ADMIN_PASSWORD_LENGTH)), "a".repeat(MAX_ADMIN_PASSWORD_LENGTH));
});

test("rejects missing, non-string, short and oversized admin passwords", () => {
  assert.equal(validateAdminPassword(undefined), undefined);
  assert.equal(validateAdminPassword(123), undefined);
  assert.equal(validateAdminPassword("short"), undefined);
  assert.equal(validateAdminPassword("a".repeat(MAX_ADMIN_PASSWORD_LENGTH + 1)), undefined);
});
