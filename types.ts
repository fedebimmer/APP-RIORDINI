
export type Role = 'Admin' | 'Operativo';

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface Item {
  id: string;
  code: string;
  precodice?: string;
  description?: string;
  supplier?: string;
  lead_time_days: number;
  min_order_qty: number;
  order_multiple: number;
  current_stock: number;
  reserved_qty: number;
  reorder_blocked: boolean;
  ubicazione?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesSnapshot {
  id: string;
  itemId: string;
  // FIX: Corrected typo from qty_sold_35 to qty_sold_365 to match the rest of the application logic.
  qty_sold_365: number;
  value_sold_365: number;
  last_sale_date?: string;
  last_purchase_date?: string;
  source_file_id: string;
  as_of_date: string;
  import_warnings?: string[];
}

export enum RunRateMethod {
  SIMPLE_AVG = 'simple_avg',
  WEIGHTED_AVG = 'weighted_avg',
  EXP_SMOOTHING = 'exp_smoothing',
}

export enum RoundingStrategy {
  TO_MULTIPLE = 'to_multiple',
  TO_MIN_THEN_MULTIPLE = 'to_min_then_multiple',
}

export interface PolicyParams {
  id: string;
  name: string;
  run_rate_method: RunRateMethod;
  avg_window_days: number;
  recent_weight_days: number;
  recent_weight_factor: number;
  lead_time_default_days: number;
  safety_stock_days: number;
  slow_mover_qty_threshold: number;
  slow_mover_days_since_last_sale: number;
  min_revenue_threshold: number;
  rounding_strategy: RoundingStrategy;
  is_active: boolean;
}

export interface ReplenishmentCalculation {
  id: string;
  itemId: string;
  daily_run_rate: number;
  forecast_60d: number;
  safety_stock: number;
  lead_time_cover_qty: number;
  recommended_order_qty: number;
  slow_mover_flag: boolean;
  slow_mover_reason: string;
  calc_date: string;
}

export interface FullItemData extends Item, SalesSnapshot {
  calculation: ReplenishmentCalculation;
}

export interface ImportRow {
  code: string;
  precodice?: string;
  description?: string;
  qty_sold_365: number;
  value_sold_365: number;
  last_sale_date?: string;
  last_purchase_date?: string;
  ubicazione?: string;
}

export interface ProposalLine {
  id: string; // Corresponds to item.id
  itemData: FullItemData;
  modifiedQty: number;
}

export interface CsvProposalRow {
  precodice: string;
  code: string;
}

// --- New types for proposal history ---

export interface ArchivedProposalLine {
  itemId: string;
  code: string;
  precodice?: string;
  description?: string;
  supplier?: string;
  orderedQty: number;
}

export interface ArchivedProposal {
  id: string;
  proposal_date: string;
  created_by: string; // user email
  items_count: number;
  lines: ArchivedProposalLine[];
}
