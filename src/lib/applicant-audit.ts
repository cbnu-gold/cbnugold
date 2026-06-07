const applicantAuditFields = new Set(["status", "admin_note", "review_score"]);

export function buildApplicantAuditMetadata(update: Record<string, unknown>) {
  const changed_fields = Object.keys(update)
    .filter((field) => applicantAuditFields.has(field))
    .sort();
  const metadata: Record<string, unknown> = { changed_fields };

  if (typeof update.status === "string") {
    metadata.status = update.status;
  }

  return metadata;
}
