import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/apiFetch';
import Sidenav from '../../components/Sidenav';
import ManualAnalysisForm from './ManualAnalysisForm';
import PdfUploadForm from './PdfUploadForm';
import AnalysisResult from './AnalysisResult';

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState('manual');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('http://localhost:8080/analyses')
      .then(r => r.json())
      .then(data => setHistory(data.analyses || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleAnalysisResult = async (result) => {
    try {
      const resp = await apiFetch('http://localhost:8080/analyses', {
        method: 'POST',
        body: JSON.stringify({
          name: `Analiză ${new Date().toLocaleDateString('ro-RO')}`,
          ...result,
          input_method: activeTab,
        }),
      });
      const data = await resp.json();
      const savedAnalysis = data.analysis;
      const resultWithId = { ...result, _id: savedAnalysis?._id };
      setAnalysisResult(resultWithId);
      setHistory(prev => [savedAnalysis, ...prev]);
    } catch (err) {
      console.error('Failed to save analysis:', err);
      setAnalysisResult(result);
    }
  };

  return (
    <section className="chat-page">
      <div className="structure">
        <Sidenav passedValue="analysis" />
        <div className="page-content">
          <h1 className="page-title">Analize Medicale</h1>
          <p className="page-subtitle">
            Introdu rezultatele analizelor tale pentru a primi recomandări nutriționale personalizate.
          </p>

          <div className="tab-bar">
            <button
              className={`tab-btn${activeTab === 'manual' ? ' tab-btn--active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              ✏️ &nbsp;Introducere manuală
            </button>
            <button
              className={`tab-btn${activeTab === 'pdf' ? ' tab-btn--active' : ''}`}
              onClick={() => setActiveTab('pdf')}
            >
              📄 &nbsp;Import PDF
            </button>
            <button
              className={`tab-btn${activeTab === 'history' ? ' tab-btn--active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              🗂️ &nbsp;Istoric Analize
            </button>
          </div>

          {activeTab === 'manual' && (
            <ManualAnalysisForm onResult={handleAnalysisResult} setLoading={setLoading} loading={loading} />
          )}
          {activeTab === 'pdf' && (
            <PdfUploadForm onResult={handleAnalysisResult} setLoading={setLoading} loading={loading} />
          )}
          {activeTab === 'history' && (
            <div className="card-panel">
              <h2 className="rationale-title">Istoricul Analizelor</h2>
              {historyLoading ? (
                <p>Se încarcă...</p>
              ) : history.length === 0 ? (
                <p className="state-message state-message--info">Nu ai nicio analiză salvată.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.8rem' }}>
                  {history.map((a) => (
                    <div key={a._id} className="analysis-history-item" style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{a.name}</strong>
                          <span style={{ marginLeft: '1rem', color: '#888', fontSize: '0.85rem' }}>
                            {new Date(a.createdAt).toLocaleDateString('ro-RO')}
                          </span>
                          <span style={{ marginLeft: '1rem', color: a.abnormal_count > 0 ? '#e67e22' : '#27ae60', fontSize: '0.85rem' }}>
                            {a.abnormal_count > 0 ? `⚠️ ${a.abnormal_count} valori anormale` : '✅ Toate normale'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                          <button
                            className="btn-secondary"
                            onClick={() => { setAnalysisResult({ ...a, _id: a._id }); setActiveTab('manual'); }}
                          >
                            Vizualizează
                          </button>
                          {a.abnormal_count > 0 && (
                            <button
                              className="btn-primary"
                              onClick={() => navigate('/menu', { state: { analysis: a, analysisId: a._id } })}
                            >
                              🥗 Generează Meniu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {analysisResult && activeTab !== 'history' && (
            <AnalysisResult result={analysisResult} />
          )}
        </div>
      </div>
    </section>
  );
}
