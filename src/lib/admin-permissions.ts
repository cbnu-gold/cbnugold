import type { AdminRole } from "@/types";

export function canWriteContent(role: AdminRole | null | undefined) {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canManageApplicants(role: AdminRole | null | undefined) {
  return role === "owner" || role === "admin";
}

export function canManageAdmins(role: AdminRole | null | undefined) {
  return role === "owner";
}

export function canViewAudit(role: AdminRole | null | undefined) {
  return role === "owner" || role === "admin";
}
