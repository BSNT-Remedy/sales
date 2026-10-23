export function normalizeQuantity(value: string): string | null {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 0.001 || quantity > 999999999.999) {
    return null;
  }

  const normalized = quantity.toFixed(3);
  return Number(normalized) === quantity ? normalized : null;
}
