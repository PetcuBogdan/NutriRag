import React, { useState, useRef } from 'react';

export default function PdfUploadForm({ onResult, loading, setLoading }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const resp = await fetch('http://127.0.0.1:8001/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();
      onResult(data.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-panel">
      <div
        className={`dropzone${dragging ? ' dropzone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <div className="dropzone__icon">📄</div>
        <p className="dropzone__text">
          Trage și plasează fișierul PDF cu analizele tale<br />
          sau <strong>apasă pentru a selecta</strong>
        </p>
        {file && <p className="dropzone__filename">✅ {file.name}</p>}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={!file || loading}
      >
        {loading ? 'Se procesează PDF-ul...' : 'Extrage valorile din PDF'}
      </button>
      <p className="form-note">
        Funcționează cu PDF-uri trimise de laboratoare (Regina Maria, Synevo, MedLife etc.)
      </p>
    </div>
  );
}
