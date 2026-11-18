export interface PriceLine {
  quantity: number;
  price: number | null;
  checkedAt: string | null;
}

export interface ShoppingTotals {
  total: number;
  open: number;
}

export function calculateShoppingTotals(items: PriceLine[]): ShoppingTotals {
  let totalCents = 0;
  let openCents = 0;
  for (const item of items) {
    const lineCents = item.price === null ? 0 : Math.round(item.price * 100 * item.quantity);
    totalCents += lineCents;
    if (!item.checkedAt) openCents += lineCents;
  }
  return { total: totalCents / 100, open: openCents / 100 };
}
