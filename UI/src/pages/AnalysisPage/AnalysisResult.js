import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AnalysisResult({ result }) {
  const navigate = useNavigate();
  const { markers = [], abnormal_count = 0, total_markers = 0 } = result;

  return (
    <div className="card-panel">
      <h2 className="rationale-title">Rezultate Analiză</h2>

      <div className={`summary-banner summary-banner--${abnormal_count === 0 ? 'ok' : 'warn'}`}>
        {abnormal_count === 0
          ? `✅ Toate cele ${total_markers} valori sunt în limite normale.`
          : `⚠️ ${abnormal_count} din ${total_markers} valori sunt în afara intervalului de referință.`}
      </div>

      {markers.map((m, i) => (
        <div className="marker-row" key={i}>
          <span className="marker-name">{m.label || m.key}</span>
          <span className={`marker-value marker-value--${m.status}`}>
            {m.value} {m.unit}
          </span>
          <span className={`marker-badge marker-badge--${m.status}`}>
            {m.status === 'low' ? '↓ SCĂZUT' : m.status === 'high' ? '↑ CRESCUT' : '✓ NORMAL'}
          </span>
          <span className="marker-ref">
            Ref: {m.reference_min}–{m.reference_max} {m.unit}
          </span>
        </div>
      ))}

      {abnormal_count > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <button
            className="btn-primary"
            onClick={() => navigate('/menu', { state: { analysis: result, analysisId: result._id } })}
          >
            🥗 &nbsp;Generează Meniu Personalizat
          </button>
        </div>
      )}
    </div>
  );
}
