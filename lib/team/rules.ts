import type { Role } from "./schemas";

export interface MemberLite {
  user_id: string;
  role: Role;
  is_active: boolean;
}

/** Returns an error message if the change would leave the org without an active admin, or locks the actor out. */
export function guardAdminChange(
  members: MemberLite[],
  actorId: string,
  targetId: string,
  change: { role?: Role; is_active?: boolean },
): string | null {
  const target = members.find((m) => m.user_id === targetId);
  if (!target) return "That team member was not found.";

  const losesAdmin =
    target.role === "admin" &&
    target.is_active &&
    (change.role === "agent" || change.is_active === false);
  if (!losesAdmin) return null;

  if (targetId === actorId) return "You can't remove your own admin access.";
  const otherAdmins = members.filter(
    (m) => m.user_id !== targetId && m.role === "admin" && m.is_active,
  );
  if (otherAdmins.length === 0) return "The organization must keep at least one active admin.";
  return null;
}
