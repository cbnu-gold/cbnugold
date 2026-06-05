import type { Applicant } from "@/types";

export type ApplicantGenerationOption = {
  value: string;
  label: string;
};

export type ApplicantFilterInput = {
  applicants: Applicant[];
  query?: string;
  status?: string;
  generation?: string;
};

export function buildApplicantGenerationOptions(applicants: Pick<Applicant, "generation">[]): ApplicantGenerationOption[] {
  return [...new Set(applicants.map((applicant) => applicant.generation))]
    .sort((a, b) => b - a)
    .map((generation) => ({
      value: String(generation),
      label: `${generation}기`,
    }));
}

export function filterApplicants({ applicants, query = "", status = "all", generation = "all" }: ApplicantFilterInput) {
  const normalizedQuery = query.trim().toLowerCase();

  return applicants.filter((applicant) => {
    const matchesStatus = status === "all" || applicant.status === status;
    const matchesGeneration = generation === "all" || String(applicant.generation) === generation;
    const haystack = [
      applicant.name,
      applicant.student_id,
      applicant.email,
      applicant.phone,
      applicant.admin_note ?? "",
      String(applicant.generation),
    ]
      .join(" ")
      .toLowerCase();

    return matchesStatus && matchesGeneration && (!normalizedQuery || haystack.includes(normalizedQuery));
  });
}
