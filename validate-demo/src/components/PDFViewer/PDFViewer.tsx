import { useState, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useAppSelector } from '../../store/hooks';
import './PDFViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PDF_PT_WIDTH = 594;  // source PDF width in points

interface Props {
  pdfUrl: string;
}

export default function PDFViewer({ pdfUrl }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { highlightedPage, highlightedLtrb } = useAppSelector(s => s.document);
  const currentPage = highlightedPage ?? 1;

  const scale = containerWidth > 0 ? containerWidth / PDF_PT_WIDTH : 1;

  const onContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width - 24); // subtract padding
    });
    ro.observe(el);
  }, []);

  const highlightStyle = highlightedLtrb ? {
    left:   highlightedLtrb[0] * scale,
    top:    highlightedLtrb[1] * scale,
    width:  (highlightedLtrb[2] - highlightedLtrb[0]) * scale,
    height: (highlightedLtrb[3] - highlightedLtrb[1]) * scale,
  } : null;

  return (
    <div className="pdf-root" ref={onContainerRef}>
      <div className="pdf-toolbar">
        <span className="pdf-title">PDF Viewer</span>
        {highlightedPage && (
          <span className="pdf-page-badge">Page {highlightedPage} of {numPages}</span>
        )}
        {!highlightedPage && (
          <span className="pdf-hint">Click a cell to highlight in PDF</span>
        )}
      </div>

      <div
        className="pdf-scroll"
        tabIndex={0}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).focus()}
      >
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="pdf-loading">Loading PDF…</div>}
          error={<div className="pdf-error">Failed to load PDF</div>}
        >
          <div className="pdf-page-wrap">
            <Page
              pageNumber={currentPage}
              width={containerWidth > 0 ? containerWidth - 24 : undefined}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
            {highlightStyle && highlightedPage === currentPage && (
              <div className="pdf-highlight" style={highlightStyle} />
            )}
          </div>
        </Document>
      </div>

      {/* Page navigation */}
      {numPages > 1 && (
        <div className="pdf-nav">
          <span className="pdf-nav-info">
            {highlightedPage
              ? `Showing page ${currentPage} (cell location)`
              : `${numPages} pages — click a cell to navigate`}
          </span>
        </div>
      )}
    </div>
  );
}
