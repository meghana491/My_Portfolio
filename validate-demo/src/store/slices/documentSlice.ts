import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DocumentData, TableCell, ValidationLevel } from '../../types';

interface DocumentState {
  docName: string | null;
  docData: DocumentData | null;
  activeQueryIndex: number;
  validationLevel: ValidationLevel;
  deletedRows: string[];
  deletedCols: string[];
  modifiedCells: Record<string, Partial<TableCell>>;
  selectedCellId: string | null;
  highlightedPage: number | null;
  highlightedLtrb: [number, number, number, number] | null;
  showFullTable: boolean;
  editingCellId: string | null;
  editingCellValue: string;
}

const initialState: DocumentState = {
  docName: null,
  docData: null,
  activeQueryIndex: 0,
  validationLevel: 'fund_level',
  deletedRows: [],
  deletedCols: [],
  modifiedCells: {},
  selectedCellId: null,
  highlightedPage: null,
  highlightedLtrb: null,
  showFullTable: false,
  editingCellId: null,
  editingCellValue: '',
};

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    loadDocument(state, action: PayloadAction<{ name: string; data: DocumentData }>) {
      state.docName = action.payload.name;
      state.docData = action.payload.data;
      state.activeQueryIndex = 0;
      state.validationLevel = 'fund_level';
      state.deletedRows = [];
      state.deletedCols = [];
      state.modifiedCells = {};
      state.selectedCellId = null;
      state.highlightedPage = null;
      state.highlightedLtrb = null;
    },
    setActiveQuery(state, action: PayloadAction<number>) {
      state.activeQueryIndex = action.payload;
    },
    setValidationLevel(state, action: PayloadAction<ValidationLevel>) {
      state.validationLevel = action.payload;
    },
    selectCell(state, action: PayloadAction<{ cellId: string; page: number; ltrb: [number, number, number, number] }>) {
      state.selectedCellId = action.payload.cellId;
      state.highlightedPage = action.payload.page;
      state.highlightedLtrb = action.payload.ltrb;
    },
    clearSelection(state) {
      state.selectedCellId = null;
      state.highlightedPage = null;
      state.highlightedLtrb = null;
    },
    editCellValue(state, action: PayloadAction<{ cellId: string; value: string }>) {
      state.modifiedCells[action.payload.cellId] = {
        ...state.modifiedCells[action.payload.cellId],
        _edited_value: action.payload.value,
      };
    },
    selectCandidate(state, action: PayloadAction<{ cellId: string; candidateIndex: number; value: string }>) {
      state.modifiedCells[action.payload.cellId] = {
        ...state.modifiedCells[action.payload.cellId],
        _selected_candidate_index: action.payload.candidateIndex,
        _edited_value: action.payload.value,
      };
    },
    deleteRow(state, action: PayloadAction<string>) {
      if (!state.deletedRows.includes(action.payload)) {
        state.deletedRows.push(action.payload);
      }
    },
    deleteCol(state, action: PayloadAction<string>) {
      if (!state.deletedCols.includes(action.payload)) {
        state.deletedCols.push(action.payload);
      }
    },
    saveChanges(state) {
      if (!state.docData) return;
      state.docData.validation_status = 'in progress';
      state.docData.date_time_last_modified = new Date().toLocaleString();
      // persist edits into the document cells
      state.docData.queries.forEach(q => {
        q.table_cells_data.forEach(row => {
          row.forEach(cell => {
            const mod = state.modifiedCells[cell.Cell_id];
            if (mod?._edited_value !== undefined) {
              cell.Value_formatted = mod._edited_value;
              cell.value_display = mod._edited_value;
              cell.validated = true;
            }
            if (mod?._selected_candidate_index !== undefined) {
              const cand = cell.old_value_multiple?.[mod._selected_candidate_index];
              if (cand) {
                cell.Value_formatted = cand.Value_formatted;
                cell.value = cand.value;
                cell.validated = true;
              }
            }
            if (state.deletedRows.includes(cell.metric_canonical)) {
              cell.is_deleted = true;
            }
          });
        });
      });
      state.modifiedCells = {};
    },
    fullyValidate(state) {
      if (!state.docData) return;
      // Auto-resolve all remaining red cells with first candidate
      state.docData.queries.forEach(q => {
        q.table_cells_data.forEach(row => {
          row.forEach(cell => {
            if (cell.old_value_multiple?.length && !cell.validated) {
              const first = cell.old_value_multiple[0];
              cell.Value_formatted = first.Value_formatted;
              cell.value = first.value;
              cell.validated = true;
            }
          });
        });
      });
      state.docData.validation_status = 'completed';
      state.docData.date_time_completed = new Date().toLocaleString();
      state.docData.validated_by = 'demo_user';
      state.modifiedCells = {};
    },
    toggleFullTable(state) {
      state.showFullTable = !state.showFullTable;
    },
    beginEdit(state, action: PayloadAction<{ cellId: string; value: string }>) {
      state.editingCellId = action.payload.cellId;
      state.editingCellValue = action.payload.value;
    },
    clearEdit(state) {
      state.editingCellId = null;
      state.editingCellValue = '';
    },
  },
});

export const {
  loadDocument, setActiveQuery, setValidationLevel,
  selectCell, clearSelection, editCellValue, selectCandidate,
  deleteRow, deleteCol, saveChanges, fullyValidate, toggleFullTable,
  beginEdit, clearEdit,
} = documentSlice.actions;

export default documentSlice.reducer;
