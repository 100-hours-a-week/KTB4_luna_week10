export function formatDateTime(createdAt) {
  if (!createdAt) {
    return "";
  }

  return String(createdAt)
    .replace("T", " ")
    .slice(0, 19);
}

export function formatCount(count) {
  const number = Number(count) || 0;

  if (number >= 1000) {
    return `${Math.floor(number / 1000)}k`;
  }

  return `${number}`;
}
