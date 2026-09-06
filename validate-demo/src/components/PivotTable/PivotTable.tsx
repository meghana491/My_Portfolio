import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule } from 'ag-grid-community';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCell, editCellValue, selectCandidate, deleteRow, beginEdit, clearEdit } from '../../store/slices/documentSlice';
import type { Query, TableCell, ValidationLevel } from '../../types';
import './PivotTable.css';

interface Props {
  query: Query;
  validationLevel: ValidationLevel;
  showFullTable: boolean;
}

// Build flat rows for the grid: one row per metric_canonical × company
function buildRows(cells: TableCell[][], level: ValidationLevel, showAll: boolean) {
  // Filter by level
  const filtered = cells.map(row => row.filter(c => c.type_data === level)).filter(row => row.length > 0);

  // Group by (metric_canonical, company, line_item_category)
  const rowMap = new Map<string, Record<string, unknown>>();

  filtered.forEach(row => {
    row.forEach(cell => {
      const key = `${cell.line_item_category}|||${cell.company}|||${cell.metric_canonical}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          _key: key,
          metric_canonical: cell.metric_canonical,
          metric_raw: cell.metric_raw,
          line_item_category: cell.line_item_category,
          company: cell.company,
          _hasData: false,
        });
      }
      const r = rowMap.get(key)!;
      // Use as_of_date as column key
      const colKey = cell.as_of_date.slice(0, 4); // "2025", "2024", "2023"
      r[colKey] = cell;
      r._hasData = true;
    });
  });

  let rows = Array.from(rowMap.values());
  if (!showAll) rows = rows.filter(r => r._hasData);
  return rows;
}

// Custom cell renderer
function CellRenderer({ value, data: _data }: ICellRendererParams) {
  const dispatch = useAppDispatch();
  const modifiedCells = useAppSelector(s => s.document.modifiedCells);
  const selectedCellId = useAppSelector(s => s.document.selectedCellId);
  const editingCellId = useAppSelector(s => s.document.editingCellId);
  const cellRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [localEditValue, setLocalEditValue] = useState('');

  const cell = value as TableCell | undefined;

  const mod = cell ? modifiedCells[cell.Cell_id] : undefined;
  const editedVal = mod?._edited_value;
  const selectedIdx = mod?._selected_candidate_index;
  const isSelected = cell ? selectedCellId === cell.Cell_id : false;
  const isEditing = cell ? editingCellId === cell.Cell_id : false;
  const hasMultiple = (cell?.old_value_multiple?.length ?? 0) > 0;
  const isDeleted = cell?.is_deleted ?? false;
  const isRed = hasMultiple && selectedIdx === undefined && !editedVal;
  const showDropdown = isRed && isSelected && !isEditing;
  const displayVal = editedVal ?? cell?.Value_formatted ?? '';

  useEffect(() => {
    if (isEditing) {
      setLocalEditValue(displayVal);
      setTimeout(() => { editInputRef.current?.focus(); editInputRef.current?.select(); }, 0);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cell) return <span className="cell-empty">—</span>;

  const handleClick = () => {
    dispatch(selectCell({ cellId: cell.Cell_id, page: cell.page, ltrb: cell._data_point_ltrb }));
  };

  const handleDblClick = () => {
    dispatch(selectCell({ cellId: cell.Cell_id, page: cell.page, ltrb: cell._data_point_ltrb }));
    dispatch(beginEdit({ cellId: cell.Cell_id, value: displayVal }));
  };

  const handleEditCommit = () => {
    if (localEditValue !== displayVal) {
      dispatch(editCellValue({ cellId: cell.Cell_id, value: localEditValue }));
    }
    dispatch(clearEdit());
  };

  const handleCandidateHighlight = (c: TableCell) => {
    dispatch(selectCell({ cellId: cell.Cell_id, page: c.page ?? cell.page, ltrb: c._data_point_ltrb ?? cell._data_point_ltrb }));
  };

  const handleCandidateValidate = (e: React.MouseEvent, idx: number, val: string) => {
    e.stopPropagation();
    dispatch(selectCandidate({ cellId: cell.Cell_id, candidateIndex: idx, value: val }));
  };

  const cellClass = [
    'pv-cell',
    isDeleted ? 'deleted' : (isRed ? 'red' : 'green'),
    isSelected ? 'selected' : '',
    isEditing ? 'editing' : '',
  ].filter(Boolean).join(' ');

  const cellRect = (showDropdown || isEditing) && cellRef.current
    ? cellRef.current.getBoundingClientRect()
    : null;

  const candidates = [cell, ...(cell.old_value_multiple ?? [])];

  return (
    <>
      <div ref={cellRef} className={cellClass} onClick={handleClick} onDoubleClick={handleDblClick}>
        <input key={displayVal} className="cell-input" defaultValue={displayVal} readOnly onClick={e => e.stopPropagation()} />
      </div>

      {/* Floating edit popover near the cell */}
      {isEditing && cellRect && createPortal(
        <>
          <div className="cell-edit-backdrop" onClick={() => dispatch(clearEdit())} />
          <div
            className="cell-edit-popover"
            style={{ position: 'fixed', left: cellRect.left, top: cellRect.bottom + 4, minWidth: cellRect.width, zIndex: 10000 }}
            onClick={e => e.stopPropagation()}
          >
            <input
              ref={editInputRef}
              className="cell-edit-input"
              value={localEditValue}
              onChange={e => setLocalEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleEditCommit();
                else if (e.key === 'Escape') dispatch(clearEdit());
              }}
            />
            <button className="cell-edit-btn confirm" onClick={handleEditCommit} title="Confirm">✓</button>
            <button className="cell-edit-btn cancel" onClick={() => dispatch(clearEdit())} title="Cancel">✕</button>
          </div>
        </>,
        document.body
      )}

      {/* Candidate dropdown with validate / flag icons */}
      {showDropdown && cellRect && createPortal(
        <div
          className="candidate-list"
          style={{ position: 'fixed', left: cellRect.left, top: cellRect.bottom, width: cellRect.width, zIndex: 9999 }}
          onClick={e => e.stopPropagation()}
        >
          {candidates.map((c, i) => (
            <div key={i} className="candidate-row" onClick={() => handleCandidateHighlight(c as TableCell)}>
              <span className="candidate-value">{c.Value_formatted}</span>
              <button
                className="candidate-icon-btn validate-btn"
                title="Validate this value"
                onClick={e => handleCandidateValidate(e, i, c.Value_formatted)}
              >
                ✏
              </button>
              <button
                className="candidate-icon-btn flag-btn"
                title="Flag for review"
                onClick={e => e.stopPropagation()}
              >
                ?
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// Row label renderer with delete button
function RowLabelRenderer({ value, data }: ICellRendererParams) {
  const dispatch = useAppDispatch();
  return (
    <div className="row-label-cell">
      <span className="row-label-text" title={value}>{value}</span>
      <button
        className="delete-row-btn"
        title="Mark row for deletion"
        onClick={e => { e.stopPropagation(); dispatch(deleteRow(data.metric_canonical)); }}
      >
        ✕
      </button>
    </div>
  );
}

export default function PivotTable({ query, validationLevel, showFullTable }: Props) {
  const { deletedRows } = useAppSelector(s => s.document);

  const rows = useMemo(
    () => buildRows(query.table_cells_data, validationLevel, showFullTable),
    [query, validationLevel, showFullTable]
  );

  // Detect distinct date columns
  const dateCols = useMemo(() => {
    const years = new Set<string>();
    query.table_cells_data.flat().filter(c => c.type_data === validationLevel).forEach(c => {
      years.add(c.as_of_date.slice(0, 4));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a)); // newest first
  }, [query, validationLevel]);

  const colDefs = useMemo<ColDef[]>(() => [
    {
      field: 'line_item_category',
      headerName: 'Category',
      width: 130,
      pinned: 'left',
      suppressMovable: true,
      tooltipField: 'line_item_category',
    },
    {
      field: 'metric_raw',
      headerName: 'Metric',
      width: 190,
      pinned: 'left',
      cellRenderer: RowLabelRenderer,
      suppressMovable: true,
      tooltipField: 'metric_raw',
    },
    ...(validationLevel === 'asset_level' ? [{
      field: 'company',
      headerName: 'Segment',
      width: 100,
      pinned: 'left' as const,
    }] : []),
    ...dateCols.map(yr => ({
      field: yr,
      headerName: yr,
      flex: 1,
      minWidth: 110,
      cellRenderer: CellRenderer,
      valueFormatter: () => '',
      sortable: false,
    })),
  ], [dateCols, validationLevel, deletedRows]);

  const getRowId = useCallback((p: { data: Record<string, unknown> }) => String(p.data._key), []);

  return (
    <div className="pivot-wrap ag-theme-balham">
      <AgGridReact
        modules={[AllCommunityModule]}
        rowData={rows}
        columnDefs={colDefs}
        getRowId={getRowId}
        rowHeight={36}
        headerHeight={38}
        suppressRowClickSelection
        animateRows
        domLayout="normal"
      />
    </div>
  );
}
