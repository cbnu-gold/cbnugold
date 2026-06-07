import type { AdminProfile, AdminRole } from "../types";

export type AdminSafetyProfile = Pick<AdminProfile, "id" | "role" | "is_active">;

export type AdminProfilePatch = {
  role?: AdminRole;
  is_active?: boolean;
};

export function isActiveOwner(profile: AdminSafetyProfile) {
  return profile.role === "owner" && profile.is_active;
}

export function patchRemovesActiveOwner(
  current: AdminSafetyProfile,
  patch: AdminProfilePatch
) {
  if (!isActiveOwner(current)) return false;

  const nextRole = patch.role ?? current.role;
  const nextActive = patch.is_active ?? current.is_active;

  return nextRole !== "owner" || !nextActive;
}

export function wouldLeaveNoActiveOwner(
  current: AdminSafetyProfile,
  patch: AdminProfilePatch,
  activeOwnerCount: number
) {
  return patchRemovesActiveOwner(current, patch) && activeOwnerCount <= 1;
}

export function deletingWouldLeaveNoActiveOwner(
  current: AdminSafetyProfile,
  activeOwnerCount: number
) {
  return isActiveOwner(current) && activeOwnerCount <= 1;
}
