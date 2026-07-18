export function getRequestErrorMessage(
  error,
  fallback = "요청을 처리하지 못했습니다.",
) {
  return typeof error?.message === "string" &&
    error.message
    ? error.message
    : fallback;
}
