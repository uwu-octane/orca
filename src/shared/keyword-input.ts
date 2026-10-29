export function parseKeywordInput(value: string) {
  return value
    .split(/[\n,]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}
