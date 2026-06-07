const dedicatedMutationResources = new Set(["media"]);

export function getCmsResourceMutationBlockMessage(resource: string) {
  if (dedicatedMutationResources.has(resource)) {
    return "미디어는 전용 업로드/수정 API에서만 변경할 수 있습니다";
  }

  return null;
}
