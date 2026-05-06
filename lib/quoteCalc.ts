import type { Quote, QuoteItem } from "./types";

export interface ItemTotals {
  cost_subtotal: number;
  quoted_rate: number;
  subtotal: number;
  total_cost: number;
  cost_of_sales: number;
  is_override: boolean;
}

export function calcItem(item: QuoteItem): ItemTotals {
  const cost = item.resource_rate + item.overhead_rate + item.room_rate;
  const auto = cost > 0 ? Math.ceil((cost * 1.2) / 50) * 50 : 0;
  const quoted = item.quoted_rate_override ?? auto;
  return {
    cost_subtotal: cost,
    quoted_rate: quoted,
    subtotal: quoted * item.units,
    total_cost: cost * item.units,
    cost_of_sales: item.resource_rate * item.units,
    is_override: item.quoted_rate_override != null,
  };
}

export interface QuoteTotals {
  subtotal: number;
  discount: number;
  total: number;
  cost_price_total: number;
  cost_of_sales_total: number;
  profit: number;
  profit_margin: number;
  gross_profit: number;
  gross_margin: number;
}

export function calcTotals(quote: Quote, items: QuoteItem[]): QuoteTotals {
  const lines = items.map(calcItem);
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
  const firstLineSubtotal = lines.length > 0 ? lines[0].subtotal : 0;
  const discount = (subtotal - firstLineSubtotal) * (quote.discount_rate ?? 0);
  const total = subtotal - discount;
  const cost_price_total = lines.reduce((s, l) => s + l.total_cost, 0);
  const cost_of_sales_total = lines.reduce((s, l) => s + l.cost_of_sales, 0);
  const profit = total - cost_price_total;
  const gross_profit = total - cost_of_sales_total;
  return {
    subtotal,
    discount,
    total,
    cost_price_total,
    cost_of_sales_total,
    profit,
    profit_margin: total > 0 ? profit / total : 0,
    gross_profit,
    gross_margin: total > 0 ? gross_profit / total : 0,
  };
}
