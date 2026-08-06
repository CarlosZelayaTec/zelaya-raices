export function formatHNL(value: number) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("HNL", "L");
}

export function formatCurrency(value: number, currency: "HNL" | "USD") {
  if (currency === "HNL") return formatHNL(value);

  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(value);
}
