import { strict as assert } from 'node:assert';
import { calculateReplenishment } from '../services/apiService.js';
import { Item, PolicyParams, RunRateMethod, RoundingStrategy, SalesSnapshot } from '../types.js';

const item: Item = {
  id: 'item-1',
  code: 'ABC123',
  lead_time_days: 0,
  min_order_qty: 7,
  order_multiple: 5,
  current_stock: 0,
  reserved_qty: 0,
  reorder_blocked: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const sale: SalesSnapshot = {
  id: 'sale-1',
  itemId: item.id,
  qty_sold_365: 31,
  value_sold_365: 0,
  last_sale_date: new Date().toISOString(),
  source_file_id: 'source-1',
  as_of_date: new Date().toISOString(),
};

const policy: PolicyParams = {
  id: 'policy-1',
  name: 'Test Policy',
  run_rate_method: RunRateMethod.SIMPLE_AVG,
  avg_window_days: 0,
  recent_weight_days: 0,
  recent_weight_factor: 1,
  lead_time_default_days: 0,
  safety_stock_days: 0,
  slow_mover_qty_threshold: 0,
  slow_mover_days_since_last_sale: 9999,
  min_revenue_threshold: 0,
  rounding_strategy: RoundingStrategy.TO_MIN_THEN_MULTIPLE,
  is_active: true,
};

const result = calculateReplenishment(item, sale, policy);

assert.strictEqual(result.recommended_order_qty, 10, 'Expected quantity to round up to the next multiple of 5.');
assert.strictEqual(result.recommended_order_qty % item.order_multiple, 0, 'Quantity should be a multiple of the order_multiple.');

console.log('calculateReplenishment TO_MIN_THEN_MULTIPLE test passed.');
