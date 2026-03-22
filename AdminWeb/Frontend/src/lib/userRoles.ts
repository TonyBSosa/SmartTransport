export const VALID_USER_ROLES = ['admin', 'empleado', 'conductor'] as const;

export type UserRole = (typeof VALID_USER_ROLES)[number];

export function normalizeUserRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (VALID_USER_ROLES.includes(normalizedValue as UserRole)) {
    return normalizedValue as UserRole;
  }

  return null;
}

export function isValidUserRole(value: unknown): value is UserRole {
  return normalizeUserRole(value) !== null;
}
