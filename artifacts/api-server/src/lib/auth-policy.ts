export function safeReturnTo(value: unknown): string {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    value.length <= 2048
  ) {
    return value;
  }
  return "/";
}