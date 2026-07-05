import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../../utils/apiFetch';
import { useUser } from '../../utils/UserContext';
import Sidenav from '../../components/Sidenav';
import PreferencesForm from './PreferencesForm';
import MenuDisplay, { MEAL_ICONS, MEAL_LABELS } from './MenuDisplay';

const STORAGE_KEY = 'nutrirag-saved-recipes';

function useSavedRecipes() {
  const [recipes, setRecipes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });

  const save = (mealType, recipe) => {
    const entry = { id: Date.now().toString(), savedAt: new Date().toISOString(), mealType, recipe };
    setRecipes(prev => {
      const next = [entry, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const remove = (id) => setRecipes(prev => {
    const next = prev.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  });

  return { recipes, save, remove };
}

function SavedRecipesTab({ recipes, onRemove }) {
  const [expanded, setExpanded] = useState(null);

  if (recipes.length === 0) {
    return (
      <div className="state-message state-message--info">
        Nu ai nicio rețetă salvată. Deschide o masă din plan, apasă <strong>👨‍🍳 Rețetă</strong> și apoi <strong>💾 Salvează rețeta</strong>.
      </div>
    );
  }

  return (
    <div className="saved-recipes-list">
      {recipes.map(entry => {
        const isOpen = expanded === entry.id;
        return (
          <div key={entry.id} className={`saved-recipe-card${isOpen ? ' saved-recipe-card--open' : ''}`}>
            <div className="saved-recipe-card__header" onClick={() => setExpanded(isOpen ? null : entry.id)}>
              <div style={{ minWidth: 0 }}>
                <span className="saved-recipe-card__badge">
                  {MEAL_ICONS[entry.mealType] || '🍴'} {MEAL_LABELS[entry.mealType] || entry.mealType}
                </span>
                <h3 className="saved-recipe-card__title">{entry.recipe.title}</h3>
                <div className="saved-recipe-card__meta">
                  {entry.recipe.total_calories != null && <span>🔥 {entry.recipe.total_calories} kcal</span>}
                  {entry.recipe.prep_time && <span>⏱ {entry.recipe.prep_time}</span>}
                  {entry.recipe.cook_time && <span>🔥 {entry.recipe.cook_time}</span>}
                  <span className="saved-recipe-card__date">
                    {new Date(entry.savedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 }}>
                <button
                  className="saved-recipe-card__delete"
                  onClick={e => { e.stopPropagation(); onRemove(entry.id); }}
                  title="Șterge rețeta"
                >✕</button>
                <span className="saved-recipe-card__chevron">{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div className="saved-recipe-card__body">
                {entry.recipe.ingredients?.length > 0 && (
                  <div className="saved-recipe-card__section">
                    <h4 className="saved-recipe-card__subtitle">Ingrediente</h4>
                    <ul className="saved-recipe-card__ingredients">
                      {entry.recipe.ingredients.map((ing, i) => (
                        <li key={i}>
                          <span><strong>{ing.name}</strong> — {ing.amount}</span>
                          {ing.calories != null && (
                            <span className="recipe-modal__ingredient-cal">{ing.calories} kcal</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {entry.recipe.total_calories != null && (
                      <div className="recipe-modal__cal-total">
                        Total: <strong>{entry.recipe.total_calories} kcal</strong>
                      </div>
                    )}
                  </div>
                )}

                {entry.recipe.steps?.length > 0 && (
                  <div className="saved-recipe-card__section">
                    <h4 className="saved-recipe-card__subtitle">Mod de preparare</h4>
                    <ol className="saved-recipe-card__steps">
                      {entry.recipe.steps.map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                  </div>
                )}

                {entry.recipe.nutritional_tip && (
                  <div className="recipe-modal__tip">💡 {entry.recipe.nutritional_tip}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MenuPage() {
  const location = useLocation();
  const analysis = location.state?.analysis || null;
  const analysisId = location.state?.analysisId || null;

  const { role } = useUser();
  const isNutritionist = role === 'nutritionist';
  const generateCalledRef = useRef(false);

  const [activeTab, setActiveTab] = useState(analysis ? 'generate' : 'history');
  const [generatedMenu, setGeneratedMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState(null);

  const [menuHistory, setMenuHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState(null);

  const [viewingDayIndex, setViewingDayIndex] = useState(0);

  const [editTarget, setEditTarget] = useState(null);
  const [editDayNumber, setEditDayNumber] = useState(null);
  const [editMeals, setEditMeals] = useState([]);
  const [editComment, setEditComment] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editMode, setEditMode] = useState(false);

  const { recipes: savedRecipes, save: saveRecipe, remove: removeRecipe } = useSavedRecipes();

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteMenu = async (menuId) => {
    setDeleteLoading(true);
    try {
      const resp = await apiFetch(`http://localhost:8080/menus/${menuId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Eroare la ștergere');
      setMenuHistory(prev => prev.filter(m => m._id !== menuId));
      if (selectedMenu?._id === menuId) setSelectedMenu(null);
      if (generatedMenu?._id === menuId) setGeneratedMenu(null);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete menu error:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchHistory = useCallback(async (signal) => {
    setMenuHistory([]);
    setHistoryLoading(true);
    try {
      const resp = await apiFetch('http://localhost:8080/menus', { signal });
      if (resp.status === 401) return;
      const data = await resp.json();
      setMenuHistory(data.menus || []);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Failed to fetch menus:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort();
  }, [fetchHistory]);

  useEffect(() => {
    if (analysis && !generateCalledRef.current) {
      generateCalledRef.current = true;
      generateMenu();
    }
  }, []); // eslint-disable-line

  const generateMenu = async (preferences = {}) => {
    if (!analysis) return;
    setLoading(true);
    setGenError(null);
    setGeneratedMenu(null);
    try {
      const resp = await fetch('http://127.0.0.1:8001/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, preferences }),
      });
      const data = await resp.json();
      const saveResp = await apiFetch('http://localhost:8080/menus', {
        method: 'POST',
        body: JSON.stringify({
          name: `Plan 7 zile — ${new Date().toLocaleDateString('ro-RO')}`,
          analysis_id: analysisId || null,
          ...data.menu, preferences,
        }),
      });
      const saved = await saveResp.json();
      const menuWithId = saved.menu || { ...data.menu };
      setGeneratedMenu(menuWithId);
      if (saved.menu) setMenuHistory(prev => [saved.menu, ...prev]);
    } catch {
      setGenError('Eroare la generarea meniului. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  const getMealsForDay = (menu, dayIdx) => {
    if (menu.days?.length > 0) return JSON.parse(JSON.stringify(menu.days[dayIdx]?.meals || []));
    return JSON.parse(JSON.stringify(menu.meals || []));
  };

  const getDayNumber = (menu, dayIdx) => {
    if (menu.days?.length > 0) return menu.days[dayIdx]?.day_number ?? null;
    return null;
  };

  const openEdit = (menu) => {
    setEditTarget(menu);
    setEditDayNumber(getDayNumber(menu, viewingDayIndex));
    setEditMeals(getMealsForDay(menu, viewingDayIndex));
    setEditComment('');
    setEditError('');
    setEditMode(true);
  };

  const closeEdit = () => { setEditMode(false); setEditTarget(null); setEditDayNumber(null); };

  const handleFoodChange = (mealIdx, foodIdx, field, value) => setEditMeals(prev => {
    const u = JSON.parse(JSON.stringify(prev));
    u[mealIdx].foods[foodIdx][field] = field === 'portion_grams' ? Number(value) : value;
    return u;
  });

  const handleRemoveFood = (mealIdx, foodIdx) => setEditMeals(prev => {
    const u = JSON.parse(JSON.stringify(prev));
    u[mealIdx].foods.splice(foodIdx, 1);
    return u;
  });

  const handleAddFood = (mealIdx) => setEditMeals(prev => {
    const u = JSON.parse(JSON.stringify(prev));
    u[mealIdx].foods.push({ name: '', portion_grams: 0, key_nutrients: [], source: 'General' });
    return u;
  });

  const handleSaveEdit = async () => {
    if (!editComment.trim()) { setEditError('Comentariul este obligatoriu.'); return; }
    if (!editTarget?._id) { setEditError('ID meniu lipsă.'); return; }
    setEditSaving(true); setEditError('');
    try {
      const body = { meals: editMeals, comment: editComment };
      if (editDayNumber != null) body.day_number = editDayNumber;
      const resp = await apiFetch(`http://localhost:8080/menus/${editTarget._id}`, { method: 'PUT', body: JSON.stringify(body) });
      if (!resp.ok) { const d = await resp.json(); setEditError(d.message || 'Eroare la salvare.'); return; }
      const { menu: updated } = await resp.json();
      setMenuHistory(prev => prev.map(m => m._id === updated._id ? updated : m));
      if (selectedMenu?._id === updated._id) setSelectedMenu(updated);
      if (generatedMenu?._id === updated._id) setGeneratedMenu(updated);
      setEditMode(false); setEditTarget(null);
    } catch { setEditError('Eroare de rețea.'); }
    finally { setEditSaving(false); }
  };

  const editDayLabel = editTarget?.days?.[viewingDayIndex]?.day_name
    ? ` — ${editTarget.days[viewingDayIndex].day_name}` : '';

  const EditPanel = () => (
    <div className="card-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="rationale-title" style={{ margin: 0 }}>Editează: {editTarget?.name}{editDayLabel}</h2>
        <button className="btn-secondary" onClick={closeEdit}>Anulează</button>
      </div>
      {editMeals.map((meal, mealIdx) => (
        <div key={mealIdx} style={{ marginBottom: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.8rem' }}>{meal.meal}{meal.time ? ` (${meal.time})` : ''}</h3>
          {meal.foods.map((food, foodIdx) => (
            <div key={foodIdx} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input type="text" value={food.name} onChange={e => handleFoodChange(mealIdx, foodIdx, 'name', e.target.value)} placeholder="Aliment" style={{ flex: 2, padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="number" value={food.portion_grams} onChange={e => handleFoodChange(mealIdx, foodIdx, 'portion_grams', e.target.value)} placeholder="Grame" style={{ flex: 1, padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              <button onClick={() => handleRemoveFood(mealIdx, foodIdx)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.4rem 0.7rem', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => handleAddFood(mealIdx)} style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>+ Adaugă aliment</button>
        </div>
      ))}
      <div style={{ marginTop: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Comentariu obligatoriu:</label>
        <textarea value={editComment} onChange={e => setEditComment(e.target.value)} placeholder="Explică modificările..." rows={4} style={{ width: '100%', padding: '0.8rem', border: '1px solid #ccc', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box' }} />
        {editError && <p style={{ color: '#e74c3c', marginTop: '0.4rem' }}>{editError}</p>}
      </div>
      <button className="btn-primary" onClick={handleSaveEdit} disabled={editSaving} style={{ marginTop: '1rem' }}>
        {editSaving ? 'Se salvează...' : '💾 Salvează Modificările'}
      </button>
    </div>
  );

  const EditsLog = ({ menu }) => {
    if (!menu?.nutritionistEdits?.length) return null;
    return (
      <div style={{ marginTop: '2rem', padding: '1.2rem', background: '#f0f7ff', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '1rem' }}>📝 Modificări Nutriționist</h3>
        {menu.nutritionistEdits.map((edit, i) => (
          <div key={i} style={{ marginBottom: '0.8rem', padding: '0.8rem', background: '#fff', borderRadius: '6px', border: '1px solid #c8e0ff' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{edit.editedBy?.email || 'Nutriționist'} — {new Date(edit.editedAt).toLocaleDateString('ro-RO')}</p>
            <p style={{ margin: '0.4rem 0 0', color: '#444' }}>{edit.comment}</p>
          </div>
        ))}
      </div>
    );
  };

  const switchTab = (tab) => { setActiveTab(tab); setEditMode(false); };

  return (
    <section className="chat-page">
      <div className="structure">
        <Sidenav passedValue="menu" />
        <div className="page-content">
          <h1 className="page-title">Plan Alimentar Personalizat</h1>
          <p className="page-subtitle">
            Plan pe 7 zile generat pe baza analizelor tale, fundamentat pe FooDB, PubChem, ADMETLab 3.0 și cărți de rețete.
          </p>

          <div className="tab-bar">
            <button className={`tab-btn${activeTab === 'generate' ? ' tab-btn--active' : ''}`} onClick={() => switchTab('generate')}>
              🥗 &nbsp;Generează Plan
            </button>
            <button className={`tab-btn${activeTab === 'history' ? ' tab-btn--active' : ''}`} onClick={() => switchTab('history')}>
              📋 &nbsp;Istoric Planuri {menuHistory.length > 0 && `(${menuHistory.length})`}
            </button>
            <button className={`tab-btn${activeTab === 'saved' ? ' tab-btn--active' : ''}`} onClick={() => switchTab('saved')}>
              📚 &nbsp;Rețete Salvate {savedRecipes.length > 0 && `(${savedRecipes.length})`}
            </button>
          </div>

          {activeTab === 'generate' && (
            editMode ? <EditPanel /> : (
              <>
                {!analysis && (
                  <div className="state-message state-message--info">
                    Nu ai selectat nicio analiză. Mergi la <a href="/analysis">Analize Medicale</a> pentru a începe.
                  </div>
                )}
                {loading && (
                  <div className="page-spinner">
                    <div className="page-spinner__circle" />
                    Se generează planul tău pe 7 zile cu NutriRAG... (poate dura 30–60 secunde)
                  </div>
                )}
                {genError && <div className="state-message state-message--error">{genError}</div>}
                {generatedMenu && !loading && (
                  <div className="card-panel">
                    {isNutritionist && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button className="btn-primary" onClick={() => openEdit(generatedMenu)}>✏️ Editează Ziua Curentă</button>
                      </div>
                    )}
                    <MenuDisplay menu={generatedMenu} onDayChange={setViewingDayIndex} onSaveRecipe={saveRecipe} />
                    <EditsLog menu={generatedMenu} />
                  </div>
                )}
                {!generatedMenu && !loading && analysis && <PreferencesForm onGenerate={generateMenu} loading={loading} />}
                {generatedMenu && !loading && <PreferencesForm onGenerate={generateMenu} loading={loading} regenerate />}
              </>
            )
          )}

          {activeTab === 'history' && (
            editMode ? <EditPanel /> :
            selectedMenu ? (
              <div className="card-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 className="rationale-title" style={{ margin: 0 }}>{selectedMenu.name}</h2>
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    {isNutritionist && <button className="btn-primary" onClick={() => openEdit(selectedMenu)}>✏️ Editează Ziua Curentă</button>}
                    {deleteConfirm === selectedMenu._id ? (
                      <>
                        <span className="delete-confirm-text">Ștergi planul?</span>
                        <button className="btn-danger" onClick={() => handleDeleteMenu(selectedMenu._id)} disabled={deleteLoading}>
                          {deleteLoading ? '...' : 'Da, șterge'}
                        </button>
                        <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Anulează</button>
                      </>
                    ) : (
                      <button className="btn-danger-outline" onClick={() => setDeleteConfirm(selectedMenu._id)} title="Șterge planul">
                        🗑️ Șterge
                      </button>
                    )}
                    <button className="btn-secondary" onClick={() => { setSelectedMenu(null); setViewingDayIndex(0); setDeleteConfirm(null); }}>← Înapoi</button>
                  </div>
                </div>
                <MenuDisplay menu={selectedMenu} onDayChange={setViewingDayIndex} onSaveRecipe={saveRecipe} />
                <EditsLog menu={selectedMenu} />
              </div>
            ) : (
              historyLoading ? <p>Se încarcă...</p> :
              menuHistory.length === 0 ? (
                <p className="state-message state-message--info">Nu ai niciun plan salvat.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto' }}>
                  {menuHistory.map((m) => (
                    <div key={m._id} className="history-card">
                      <div className="history-card__info">
                        <strong>{m.name}</strong>
                        <span className="history-card__meta">{new Date(m.createdAt).toLocaleDateString('ro-RO')}</span>
                        {m.daily_calories_target && <span className="history-card__meta history-card__meta--blue">{m.daily_calories_target} kcal/zi</span>}
                        {m.days?.length > 0 && <span className="history-card__meta history-card__meta--green">📅 {m.days.length} zile</span>}
                        {m.nutritionistEdits?.length > 0 && <span className="history-card__meta history-card__meta--purple">✏️ {m.nutritionistEdits.length} modificare(i)</span>}
                      </div>
                      <div className="history-card__actions">
                        {deleteConfirm === m._id ? (
                          <>
                            <span className="delete-confirm-text">Ștergi planul?</span>
                            <button className="btn-danger" onClick={() => handleDeleteMenu(m._id)} disabled={deleteLoading}>
                              {deleteLoading ? '...' : 'Da, șterge'}
                            </button>
                            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Anulează</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-danger-outline" onClick={() => setDeleteConfirm(m._id)} title="Șterge planul">🗑️</button>
                            <button className="btn-secondary" onClick={() => { setSelectedMenu(m); setViewingDayIndex(0); }}>
                              Vezi detalii
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )
          )}

          {activeTab === 'saved' && (
            <SavedRecipesTab recipes={savedRecipes} onRemove={removeRecipe} />
          )}
        </div>
      </div>
    </section>
  );
}
