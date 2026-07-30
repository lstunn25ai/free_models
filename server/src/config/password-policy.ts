export const ADMIN_USERNAME = "admin";
export const MIN_ADMIN_PASSWORD_LENGTH = 12;
export const MAX_ADMIN_PASSWORD_LENGTH = 256;

export function validateAdminPassword(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length < MIN_ADMIN_PASSWORD_LENGTH || value.length > MAX_ADMIN_PASSWORD_LENGTH) return undefined;
  return value;
}
