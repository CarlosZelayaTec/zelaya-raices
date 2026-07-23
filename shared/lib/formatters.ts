export function formatHNL(value: number) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("HNL", "L");
}
