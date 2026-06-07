import type { RecruitmentCycle } from "@/types";

export type ApplicantCheckScope =
  | { kind: "cycle"; recruitmentCycleId: string; generation: number }
  | { kind: "legacy"; recruitmentCycleId: null; generation: number };

export function buildApplicantCheckScopes(
  cycle: Pick<RecruitmentCycle, "id" | "generation"> | null | undefined
): ApplicantCheckScope[] {
  if (!cycle) return [];

  const scopes: ApplicantCheckScope[] = [];
  if (cycle.id) {
    scopes.push({
      kind: "cycle",
      recruitmentCycleId: cycle.id,
      generation: cycle.generation,
    });
  }

  scopes.push({
    kind: "legacy",
    recruitmentCycleId: null,
    generation: cycle.generation,
  });

  return scopes;
}
