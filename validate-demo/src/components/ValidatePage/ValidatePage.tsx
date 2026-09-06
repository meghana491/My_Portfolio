import { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  loadDocument, setActiveQuery, setValidationLevel,
  saveChanges, fullyValidate, toggleFullTable,
} from '../../store/slices/documentSlice';
import rawData from '../../data/demo_validation_data.json';
import type { RawData, DocumentData } from '../../types';
import PivotTable from '../PivotTable/PivotTable';
import PDFViewer from '../PDFViewer/PDFViewer';
import './ValidatePage.css';

const typedRaw = rawData as unknown as RawData;

// Build dropdown option
const DOC_ENTRY = Object.entries(typedRaw.data.myTableCells[0])[0];
const DOC_KEY = DOC_ENTRY[0];
const DOC_DATA = DOC_ENTRY[1] as DocumentData;

const selectOption = {
  value: DOC_KEY,
  label: 'PDF Solutions Inc. — Annual Report 2025',
  status: DOC_DATA.validation_status,
};

const statusColor = (s: string) =>
  s === 'completed' ? '#9ec343' : s === 'in progress' ? '#f0a500' : '#ff5637';

export default function ValidatePage() {
  const dispatch = useAppDispatch();
  const { docData, activeQueryIndex, validationLevel, showFullTable } = useAppSelector(s => s.document);

  const [selected, setSelected] = useState<typeof selectOption | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(38);
  const bodyRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPdfPx = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !bodyRef.current) return;
      const totalW = bodyRef.current.getBoundingClientRect().width;
      const dx = dragStartX.current - e.clientX;
      const newPx = Math.min(Math.max(dragStartPdfPx.current + dx, 260), totalW - 380);
      setPdfWidth((newPx / totalW) * 100);
    };
    const onUp = () => { isDragging.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Auto-load the single demo document on mount
  useEffect(() => {
    setSelected(selectOption);
    dispatch(loadDocument({ name: DOC_KEY, data: DOC_DATA }));
  }, [dispatch]);

  const queries = docData?.queries ?? [];
  const currentStatus = docData?.validation_status ?? 'pending validation';

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      dispatch(saveChanges());
      toast.success('Changes saved successfully!');
      setIsSaving(false);
    }, 800);
  };

  const handleFullyValidate = () => {
    if (currentStatus === 'completed') {
      toast.info('Document is already fully validated.');
      return;
    }
    setIsValidating(true);
    setTimeout(() => {
      dispatch(fullyValidate());
      toast.success('🎉 Document fully validated!');
      setIsValidating(false);
    }, 1000);
  };

  const handleDownloadJSON = () => {
    if (!docData) return;
    const blob = new Blob([JSON.stringify(docData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'validated_data.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as JSON');
  };

  const formatOption = (opt: typeof selectOption) => (
    <div className="select-option">
      <span>{opt.label}</span>
      <span className="status-badge" style={{ color: statusColor(currentStatus) }}>
        ● {currentStatus}
      </span>
    </div>
  );

  return (
    <div className="vp-root">
      {/* ── Header ── */}
      <div className="vp-header">
        <div className="vp-header-left">
          <div className="vp-logo">DataValidate</div>
          <div className="vp-controls">
            <div className="vp-select-wrap">
              <label className="vp-label">Select Data</label>
              <Select
                value={selected}
                options={[selectOption]}
                formatOptionLabel={formatOption}
                onChange={opt => opt && setSelected(opt)}
                classNamePrefix="vp-select"
                isSearchable={false}
                styles={{
                  control: base => ({ ...base, minWidth: 340, borderRadius: 8, borderColor: '#e2e8f0', background: '#ffffff', color: '#1e293b', boxShadow: 'none' }),
                  menu: base => ({ ...base, background: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }),
                  singleValue: base => ({ ...base, color: '#1e293b' }),
                  option: (base, { isFocused }) => ({ ...base, background: isFocused ? '#f1f5f9' : '#ffffff', color: '#1e293b' }),
                }}
              />
            </div>
          </div>
        </div>

        <div className="vp-header-right">
          <button
            className={`vp-btn vp-btn-ghost ${showFullTable ? 'active' : ''}`}
            onClick={() => dispatch(toggleFullTable())}
          >
            {showFullTable ? 'Hide Blank Rows' : 'Full Table View'}
          </button>
          <button className="vp-btn vp-btn-secondary" onClick={handleDownloadJSON}>
            ⬇ Download JSON
          </button>
          <button className="vp-btn vp-btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : '💾 Save Changes'}
          </button>
          <button
            className={`vp-btn vp-btn-success ${currentStatus === 'completed' ? 'validated' : ''}`}
            onClick={handleFullyValidate}
            disabled={isValidating || currentStatus === 'completed'}
          >
            {isValidating ? 'Validating…' : currentStatus === 'completed' ? '✅ Validated' : '✔ Fully Validated'}
          </button>
        </div>
      </div>

      {/* ── Query Tabs ── */}
      {docData && (
        <div className="vp-tabs">
          {queries.map((q, i) => (
            <button
              key={q.query}
              className={`vp-tab ${activeQueryIndex === i ? 'active' : ''}`}
              onClick={() => dispatch(setActiveQuery(i))}
            >
              {q.query}
            </button>
          ))}
        </div>
      )}

      {/* ── Level Toggle (only Income Statement has asset_level data) ── */}
      {docData && activeQueryIndex === 1 && (
        <div className="vp-level-bar">
          <span className="level-label">Level:</span>
          <button
            className={`level-btn ${validationLevel === 'fund_level' ? 'active' : ''}`}
            onClick={() => dispatch(setValidationLevel('fund_level'))}
          >
            Fund Level
          </button>
          <button
            className={`level-btn ${validationLevel === 'asset_level' ? 'active' : ''}`}
            onClick={() => dispatch(setValidationLevel('asset_level'))}
          >
            Asset Level
          </button>
        </div>
      )}

      {/* ── Split View ── */}
      <div className="vp-body" ref={bodyRef}>
        <div className="vp-table-pane">
          {docData ? (
            <PivotTable
              query={queries[activeQueryIndex]}
              validationLevel={activeQueryIndex === 1 ? validationLevel : 'fund_level'}
              showFullTable={showFullTable}
            />
          ) : (
            <div className="vp-empty">Select a document to begin validation</div>
          )}
        </div>

        <div
          className="vp-resizer"
          onMouseDown={e => {
            isDragging.current = true;
            dragStartX.current = e.clientX;
            const totalW = bodyRef.current?.getBoundingClientRect().width ?? 1;
            dragStartPdfPx.current = (pdfWidth / 100) * totalW;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
          }}
        />

        <div className="vp-pdf-pane" style={{ width: `${pdfWidth}%` }}>
          <PDFViewer pdfUrl="/pdf/annual_report.pdf" />
        </div>
      </div>
    </div>
  );
}
