export interface Coordinates {
  PDF: string;
  doc_id: string;
  page: number;
  id: string;
  text_source: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  type: string;
  row_order: number;
  data_point_text: string;
  _data_point_cell_id: string;
  _data_point_ltrb: [number, number, number, number];
  Value: number | string;
  Value_formatted: string;
  Units: string;
  Currency: string;
  validation: string;
  type_pdf: string;
  sub_param: string;
  Cell_id: string;
  _uid: string;
  _source_ref: string;
}

export interface ChangeEntry {
  changed_at: string;
  changed_by: string;
  change_type: 'selected' | 'updated' | 'deleted';
  changed_field: string;
  original_data: string;
  updated_data: string;
}

export interface TableCell {
  template: string;
  value: number | string;
  metric_raw: string;
  metric_canonical: string;
  unit: string;
  currency: string;
  fund: string;
  fund_id: string;
  company: string;
  company_id: string;
  as_of_date: string;
  period_start: string | null;
  period_end: string | null;
  period_type: string;
  statement: string;
  line_item_category: string;
  partner_type: string | null;
  counterparty: string | null;
  source_id: string;
  note: string;
  source_type: string;
  value_display: string;
  _data_point_cell_id: string;
  data_point_text: string;
  coordinates: Coordinates;
  date_type: string;
  period_label: string;
  date_value: string;
  row_order: number;
  Value: number | string;
  Value_formatted: string;
  Units: string;
  Currency: string;
  gt_match_status: string;
  type_data: 'fund_level' | 'asset_level';
  page: number;
  _data_point_ltrb: [number, number, number, number];
  Cell_id: string;
  _row_edit_key: string;
  type: string;
  validated: boolean;
  validator_note: string;
  _uid: string;
  _source_ref: string;
  old_value_multiple?: TableCell[];
  is_deleted?: boolean;
  changes?: ChangeEntry[];
  // runtime edit tracking
  _edited_value?: string;
  _selected_candidate_index?: number;
}

export interface QueryView {
  cols: string[];
  rows: string[];
  aggregate: string;
  output: string;
  cols_name: string[];
  rows_name: string[];
}

export interface Query {
  ok: boolean;
  error: string;
  query: string;
  task: string;
  type: string;
  views: {
    view: QueryView[];
    xlsx: unknown[];
    json: unknown[];
    xlsx_col_order: unknown[][];
    json_col_order: unknown[];
  };
  table_np: string;
  table_cells_data: TableCell[][];
}

export interface ValidationDescription {
  validated_at: string;
  validated_by: string;
  validation_status: string;
}

export interface DocumentData {
  owner: string;
  date_created: string;
  description: string;
  json_task_filename: string;
  validation_description: ValidationDescription[];
  validated_by: string | null;
  date_time_last_modified: string | null;
  date_time_completed: string;
  validation_status: 'pending validation' | 'in progress' | 'completed';
  type: string;
  excel: boolean;
  table_cells_query: { deleted_rows: string[]; deleted_columns: string[] };
  table_search_query: Record<string, unknown>;
  PDF: string[];
  doc_id: string[];
  queries: Query[];
}

export interface RawData {
  ok: boolean;
  error: string;
  columns: unknown[];
  data: {
    myTableCells: Array<Record<string, DocumentData>>;
  };
}

// Pivot row shape for AG Grid
export interface PivotRow {
  metric_canonical: string;
  metric_raw: string;
  line_item_category: string;
  company: string;
  [dateKey: string]: string | number | TableCell | undefined; // dynamic date columns
}

export type ValidationLevel = 'fund_level' | 'asset_level';
