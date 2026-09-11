// Match the existing whole-rupee report rounding, grouped by the rate at reservation.
export function promoterCommission(
  orders: { subtotal: number; promoter_commission_percentage?: number | null }[],
  fallbackRate: number,
) {
  const revenueByRate = new Map<number, number>();
  for (const order of orders) {
    const rate = Number(order.promoter_commission_percentage ?? fallbackRate);
    revenueByRate.set(rate, (revenueByRate.get(rate) || 0) + Number(order.subtotal));
  }
  return [...revenueByRate].reduce((sum, [rate, revenue]) => sum + Math.round(revenue * rate / 100), 0);
}
