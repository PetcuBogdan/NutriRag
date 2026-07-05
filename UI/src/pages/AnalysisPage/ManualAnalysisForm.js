import React, { useState } from 'react';

const MARKERS = [
  { key: 'glucose',           label: 'Glicemie',           unit: 'mg/dL',  placeholder: 'ex: 95' },
  { key: 'hba1c',             label: 'HbA1c',              unit: '%',      placeholder: 'ex: 5.4' },
  { key: 'total_cholesterol', label: 'Colesterol Total',   unit: 'mg/dL',  placeholder: 'ex: 190' },
  { key: 'ldl',               label: 'LDL Colesterol',     unit: 'mg/dL',  placeholder: 'ex: 110' },
  { key: 'hdl_male',          label: 'HDL Colesterol',     unit: 'mg/dL',  placeholder: 'ex: 50' },
  { key: 'triglycerides',     label: 'Trigliceride',       unit: 'mg/dL',  placeholder: 'ex: 130' },
  { key: 'hemoglobin_male',   label: 'Hemoglobină',        unit: 'g/dL',   placeholder: 'ex: 14' },
  { key: 'ferritin_male',     label: 'Feritină',           unit: 'ng/mL',  placeholder: 'ex: 45' },
  { key: 'iron',              label: 'Fier Seric',         unit: 'μg/dL',  placeholder: 'ex: 80' },
  { key: 'vitamin_d',         label: 'Vitamina D 25-OH',  unit: 'ng/mL',  placeholder: 'ex: 28' },
  { key: 'vitamin_b12',       label: 'Vitamina B12',       unit: 'pg/mL',  placeholder: 'ex: 350' },
  { key: 'folate',            label: 'Folat',              unit: 'ng/mL',  placeholder: 'ex: 6' },
  { key: 'tsh',               label: 'TSH',                unit: 'mIU/L',  placeholder: 'ex: 2.5' },
  { key: 'creatinine_male',   label: 'Creatinină',         unit: 'mg/dL',  placeholder: 'ex: 0.9' },
  { key: 'alt',               label: 'ALT / TGP',          unit: 'U/L',    placeholder: 'ex: 30' },
  { key: 'ast',               label: 'AST / TGO',          unit: 'U/L',    placeholder: 'ex: 25' },
  { key: 'calcium',           label: 'Calciu',             unit: 'mg/dL',  placeholder: 'ex: 9.5' },
  { key: 'magnesium',         label: 'Magneziu',           unit: 'mg/dL',  placeholder: 'ex: 1.9' },
  { key: 'crp',               label: 'Proteina C Reactivă',unit: 'mg/L',   placeholder: 'ex: 0.5' },
  { key: 'uric_acid_male',    label: 'Acid Uric',          unit: 'mg/dL',  placeholder: 'ex: 5.0' },
];

export default function ManualAnalysisForm({ onResult, loading, setLoading }) {
  const [values, setValues] = useState({});

  const handleChange = (key, val) => {
    if (val === '') {
      const next = { ...values };
      delete next[key];
      setValues(next);
    } else {
      setValues(prev => ({ ...prev, [key]: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(values).length === 0) return;
    setLoading(true);
    try {
      const resp = await fetch('http://127.0.0.1:8001/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
      const data = await resp.json();
      onResult(data.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filled = Object.keys(values).length;

  return (
    <form className="card-panel" onSubmit={handleSubmit}>
      <div className="form-grid">
        {MARKERS.map(m => (
          <div className="form-field" key={m.key}>
            <label className="form-label">
              {m.label} <span style={{ color: '#999', fontWeight: 400 }}>({m.unit})</span>
            </label>
            <input
              type="number"
              step="any"
              className="form-input"
              placeholder={m.placeholder}
              value={values[m.key] || ''}
              onChange={e => handleChange(m.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={loading || filled === 0}
      >
        {loading ? 'Se analizează...' : `Analizează valorile${filled > 0 ? ` (${filled})` : ''}`}
      </button>
      <p className="form-note">Completează doar valorile disponibile. Câmpurile goale sunt ignorate.</p>
    </form>
  );
}
