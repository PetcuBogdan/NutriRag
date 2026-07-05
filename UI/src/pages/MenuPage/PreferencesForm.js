import React, { useState } from 'react';

export default function PreferencesForm({ onGenerate, loading, regenerate = false }) {
  const [prefs, setPrefs] = useState({
    gender: 'male',
    age: 30,
    weight_kg: 70,
    height_cm: 175,
    activity_level: 'moderate',
    diet_type: '',
    allergies: '',
  });

  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  return (
    <div className="card-panel">
      <h3 className="rationale-title" style={{ marginBottom: '1.8rem' }}>
        {regenerate ? '🔄 Regenerează cu alte preferințe' : '⚙️ Preferințe personale (opțional)'}
      </h3>

      <div className="form-row">
        <div className="form-field">
          <label className="form-label">Gen</label>
          <select className="form-select" value={prefs.gender} onChange={e => set('gender', e.target.value)}>
            <option value="male">Masculin</option>
            <option value="female">Feminin</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Vârstă (ani)</label>
          <input type="number" className="form-input" value={prefs.age} onChange={e => set('age', +e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label className="form-label">Greutate (kg)</label>
          <input type="number" className="form-input" value={prefs.weight_kg} onChange={e => set('weight_kg', +e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">Înălțime (cm)</label>
          <input type="number" className="form-input" value={prefs.height_cm} onChange={e => set('height_cm', +e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label className="form-label">Nivel activitate</label>
          <select className="form-select" value={prefs.activity_level} onChange={e => set('activity_level', e.target.value)}>
            <option value="sedentary">Sedentar</option>
            <option value="light">Ușor activ</option>
            <option value="moderate">Moderat activ</option>
            <option value="active">Activ</option>
            <option value="very active">Foarte activ</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Tip dietă</label>
          <select className="form-select" value={prefs.diet_type} onChange={e => set('diet_type', e.target.value)}>
            <option value="">Fără restricții</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="gluten-free">Fără gluten</option>
            <option value="lactose-free">Fără lactoză</option>
          </select>
        </div>
      </div>

      <div className="form-field" style={{ marginBottom: '2rem' }}>
        <label className="form-label">Alergii / intoleranțe (opțional)</label>
        <input
          type="text"
          className="form-input"
          placeholder="ex: nuci, pește, ouă"
          value={prefs.allergies}
          onChange={e => set('allergies', e.target.value)}
        />
      </div>

      <button className="btn-primary" onClick={() => onGenerate(prefs)} disabled={loading}>
        {loading ? 'Se generează...' : regenerate ? '🔄 Regenerează Meniu' : '🥗 Generează Meniu'}
      </button>
    </div>
  );
}
