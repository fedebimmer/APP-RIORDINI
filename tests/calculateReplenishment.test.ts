import assert from 'node:assert/strict';
import { calculateReplenishment } from '../services/apiService.ts';
import { Item, PolicyParams, RunRateMethod, RoundingStrategy, SalesSnapshot } from '../types.ts';

const basePolicy: PolicyParams = {
  id: 'policy-test',
  name: 'Test Policy',
  run_rate_method: RunRateMethod.SIMPLE_AVG,
  avg_window_days: 365,
  recent_weight_days: 0,
  recent_weight_factor: 1,
  lead_time_default_days: 2,
  safety_stock_days: 7,
  slow_mover_qty_threshold: 1,
  slow_mover_days_since_last_sale: 999,
  min_revenue_threshold: 0,
  rounding_strategy: RoundingStrategy.TO_MULTIPLE,
  is_active: true,
};

const baseSale: SalesSnapshot = {
  id: 'sale-1',
  itemId: 'item-1',
  qty_sold_365: 365,
  value_sold_365: 1000,
  source_file_id: 'import-1',
  as_of_date: new Date().toISOString(),
};

const zeroLeadTimeItem: Item = {
  id: 'item-1',
  code: 'SKU-001',
  lead_time_days: 0,
  min_order_qty: 1,
  order_multiple: 1,
  current_stock: 0,
  reserved_qty: 0,
  reorder_blocked: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const zeroLeadTimeResult = calculateReplenishment(zeroLeadTimeItem, baseSale, basePolicy);

assert.equal(
  zeroLeadTimeResult.lead_time_cover_qty,
  0,
  'Lead time cover should be zero when item.lead_time_days is 0',
);

assert.equal(
  zeroLeadTimeResult.recommended_order_qty,
  67,
  'Recommended order should not include default lead time when item.lead_time_days is 0',
);

console.log('calculateReplenishment lead time tests passed');
