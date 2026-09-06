import { useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="landing-badge">Live Demo</div>
        <h1 className="landing-title">Financial Document<br />Validation Platform</h1>
        <p className="landing-sub">
          AI-extracted financial data from a PDF Annual Report — review, correct,
          and validate each data point directly against the source document.
        </p>

        <div className="landing-features">
          <div className="feature-item">
            <span className="feature-icon">📄</span>
            <span>PDF viewer with cell-level highlights</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔴</span>
            <span>Red cells = multiple extraction candidates to resolve</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🏢</span>
            <span>Fund Level / Asset Level data toggle</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Save progress or mark fully validated</span>
          </div>
        </div>

        <div className="landing-doc-info">
          <span className="doc-label">Source Document</span>
          <span className="doc-name">PDF Solutions Inc. — Annual Report 2025 (Form 10-K)</span>
        </div>

        <button className="launch-btn" onClick={() => navigate('/validate')}>
          Launch Demo
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        <p className="landing-note">
          All data is dummy — extracted from a publicly available 10-K filing.
        </p>
      </div>
    </div>
  );
}
