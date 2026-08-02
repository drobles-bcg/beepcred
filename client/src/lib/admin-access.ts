/** Owner email that can see and use BeepCred admin. */
export const OWNER_ADMIN_EMAIL = 'danieljrobles@gmail.com';

export function canAccessAdmin(user: { email?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  return user.email.trim().toLowerCase() === OWNER_ADMIN_EMAIL;
}
