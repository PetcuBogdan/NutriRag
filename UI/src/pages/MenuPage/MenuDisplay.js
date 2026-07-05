import React, { useState, useEffect, useRef } from 'react';

export const MEAL_ICONS = {
  'Breakfast': '🌅', 'Morning Snack': '🍎',
  'Lunch': '🍽️', 'Afternoon Snack': '🥜', 'Dinner': '🌙',
};

export const MEAL_LABELS = {
  'Breakfast': 'Mic dejun', 'Morning Snack': 'Gustare dimineață',
  'Lunch': 'Prânz', 'Afternoon Snack': 'Gustare după-amiază', 'Dinner': 'Cină',
};

const TODAY = new Date().toISOString().split('T')[0];

export function useDailyLog(menuId, dayIndex = 0) {
  const key = `daily-log-${TODAY}-${menuId || 'none'}-day${dayIndex}`;
  const keyRef = useRef(key);
  keyRef.current = key;

  const readStored = (k) => {
    try { return JSON.parse(localStorage.getItem(k) || '0'); }
    catch { return 0; }
  };

  const [consumed, setConsumed] = useState(() => readStored(key));

  useEffect(() => {
    setConsumed(readStored(key));
  }, [key]); // reload from storage whenever menu or day changes

  const addCalories = (kcal) => setConsumed(prev => {
    const next = prev + kcal;
    localStorage.setItem(keyRef.current, JSON.stringify(next));
    return next;
  });

  const reset = () => { localStorage.removeItem(keyRef.current); setConsumed(0); };

  return { consumed, addCalories, reset };
}

function sourceBadgeClass(source) {
  if (!source) return 'source-badge source-badge--general';
  const s = source.toLowerCase();
  if (s.includes('foodb'))    return 'source-badge source-badge--foodb';
  if (s.includes('pubchem'))  return 'source-badge source-badge--pubchem';
  if (s.includes('admet'))    return 'source-badge source-badge--admet';
  if (s.includes('cookbook')) return 'source-badge source-badge--cookbook';
  return 'source-badge source-badge--general';
}

export function DailyCaloriesBar({ consumed, target, onReset }) {
  if (!target) return null;
  const pct = Math.min((consumed / target) * 100, 100);
  const isOver = consumed > target;
  return (
    <div className="daily-cal-bar">
      <div className="daily-cal-bar__header">
        <span className="daily-cal-bar__title">🔥 Calorii consumate azi din rețete</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className={`daily-cal-bar__value${isOver ? ' daily-cal-bar__value--over' : ''}`}>
            <strong>{consumed}</strong> / {target} kcal
          </span>
          {consumed > 0 && (
            <button className="daily-cal-bar__reset" onClick={onReset} title="Resetează">✕</button>
          )}
        </div>
      </div>
      <div className="daily-cal-bar__track">
        <div className={`daily-cal-bar__fill${isOver ? ' daily-cal-bar__fill--over' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="daily-cal-bar__note">
        {consumed === 0
          ? 'Adaugă rețete la jurnal pentru a urmări caloriile.'
          : isOver
          ? `⚠️ Ai depășit ținta cu ${consumed - target} kcal.`
          : `Mai poți consuma ${target - consumed} kcal din ținta zilnică.`}
      </p>
    </div>
  );
}

// "150g" → 150, "2 bucăți" → 2
function parseQty(str) {
  const m = String(str ?? '').match(/[\d]+([.,][\d]+)?/);
  return m ? parseFloat(m[0].replace(',', '.')) : null;
}

// "150g" → {num:"150", unit:"g"}
function splitAmount(str) {
  const m = String(str ?? '').match(/^(\d+(?:[.,]\d+)?)(.*)/);
  if (!m) return { num: '', unit: str ?? '' };
  return { num: m[1], unit: m[2] };
}

function RecipeModal({ mealName, mealFoods, recipe: initialRecipe, loading: initialLoading, error: initialError, onClose, onAddToLog, onSave }) {
  const [currentRecipe,   setCurrentRecipe]   = useState(null);
  const [editIngredients, setEditIngredients] = useState(null); // null → ingrediente originale
  const [regenLoading,    setRegenLoading]    = useState(false);
  const [regenError,      setRegenError]      = useState(null);
  const [preferences,     setPreferences]     = useState('');
  const [added,           setAdded]           = useState(false);
  const [saved,           setSaved]           = useState(false);

  const recipe  = currentRecipe ?? initialRecipe;
  const loading = regenLoading || initialLoading;
  const error   = regenError ?? (!currentRecipe ? initialError : null);

  const ingredients  = editIngredients ?? recipe?.ingredients ?? [];
  const computedTotal = ingredients.reduce((sum, ing) => sum + (Number(ing.calories) || 0), 0);
  const originalTotal = recipe?.total_calories ?? computedTotal;

  // resetează editările când sosește o rețetă nouă (load sau regenerare)
  useEffect(() => {
    setEditIngredients(null);
    setAdded(false);
    setSaved(false);
  }, [currentRecipe, initialRecipe]);

  const handleAmountChange = (idx, newAmount) => {
    setEditIngredients(prev => {
      const base = prev ?? recipe?.ingredients?.map(i => ({ ...i })) ?? [];
      return base.map((ing, i) => {
        if (i !== idx) return ing;
        const oldQty = parseQty(ing.amount);
        const newQty = parseQty(newAmount);
        const newCal = (oldQty && newQty && oldQty > 0)
          ? Math.round((ing.calories ?? 0) * newQty / oldQty)
          : ing.calories;
        return { ...ing, amount: newAmount, calories: newCal };
      });
    });
  };

  const handleRegenerate = async () => {
    if (!preferences.trim()) return;
    setRegenLoading(true);
    setRegenError(null);
    setCurrentRecipe(null);
    try {
      const resp = await fetch('http://127.0.0.1:8001/suggest-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_type: mealName, foods: mealFoods, user_preferences: preferences }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `Eroare server ${resp.status}`);
      setCurrentRecipe(data.recipe);
    } catch (err) {
      setRegenError(err.message);
    } finally {
      setRegenLoading(false);
    }
  };

  const handleAdd = () => {
    onAddToLog(computedTotal);
    setAdded(true);
  };

  const handleSave = () => {
    if (!recipe) return;
    const toSave = editIngredients
      ? { ...recipe, ingredients: editIngredients, total_calories: computedTotal }
      : recipe;
    onSave(mealName, toSave);
    setSaved(true);
  };

  return (
    <div className="recipe-overlay" onClick={onClose}>
      <div className="recipe-modal" onClick={e => e.stopPropagation()}>
        <button className="recipe-modal__close" onClick={onClose}>✕</button>

        {loading && (
          <div className="recipe-modal__loading">
            <div className="page-spinner__circle" />
            <p>Se generează rețeta...</p>
          </div>
        )}
        {error && !loading && <div className="recipe-modal__error">{error}</div>}

        {recipe && !loading && (
          <>
            <div className="recipe-modal__header">
              <span className="recipe-modal__meal-label">
                {MEAL_ICONS[mealName]} {MEAL_LABELS[mealName] || mealName}
              </span>
              <h2 className="recipe-modal__title">{recipe.title}</h2>
              <div className="recipe-modal__meta">
                {recipe.prep_time && <span>⏱ {recipe.prep_time}</span>}
                {recipe.cook_time && <span>🔥 {recipe.cook_time}</span>}
                {recipe.servings  && <span>🍽 Porții: {recipe.servings}</span>}
                <span className="recipe-modal__meta--calories">
                  🔥 {computedTotal} kcal
                  {editIngredients && computedTotal !== originalTotal && (
                    <span className="recipe-modal__meta--original"> (original: {originalTotal})</span>
                  )}
                </span>
              </div>
            </div>

            <div className="recipe-modal__body">
              {ingredients.length > 0 && (
                <div className="recipe-modal__section">
                  <h3 className="recipe-modal__section-title">
                    Ingrediente
                    <span className="recipe-modal__edit-hint">— modifică cantitățile pentru a recalcula kcal</span>
                  </h3>
                  <ul className="recipe-modal__ingredients">
                    {ingredients.map((ing, i) => (
                      <li key={i} className="recipe-modal__ing-row">
                        <strong className="recipe-modal__ing-name">{ing.name}</strong>
                        {(() => {
                          const { num, unit } = splitAmount(ing.amount);
                          return num ? (
                            <span className="recipe-modal__amount-wrap">
                              <input
                                className="recipe-modal__qty-input"
                                type="number"
                                min="0"
                                step="any"
                                value={num}
                                onChange={e => handleAmountChange(i, e.target.value + unit)}
                                aria-label={`Cantitate ${ing.name}`}
                              />
                              {unit && <span className="recipe-modal__unit-label">{unit.trim()}</span>}
                            </span>
                          ) : (
                            <span className="recipe-modal__unit-label recipe-modal__unit-label--static">{ing.amount}</span>
                          );
                        })()}
                        {ing.calories != null && (
                          <span className="recipe-modal__ingredient-cal">{ing.calories} kcal</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="recipe-modal__cal-total">
                    Total: <strong>{computedTotal} kcal</strong>
                    {editIngredients && computedTotal !== originalTotal && (
                      <span className="recipe-modal__cal-diff"> · original {originalTotal} kcal</span>
                    )}
                  </div>
                </div>
              )}

              {recipe.steps?.length > 0 && (
                <div className="recipe-modal__section">
                  <h3 className="recipe-modal__section-title">Mod de preparare</h3>
                  <ol className="recipe-modal__steps">
                    {recipe.steps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                </div>
              )}

              {recipe.nutritional_tip && (
                <div className="recipe-modal__tip">💡 {recipe.nutritional_tip}</div>
              )}

              <div className="recipe-modal__actions">
                {recipe.total_calories != null && (
                  added
                    ? <div className="recipe-modal__added">✅ {recipe.total_calories} kcal adăugate la jurnal!</div>
                    : <button className="recipe-modal__action-btn recipe-modal__action-btn--log" onClick={handleAdd}>
                        ➕ {recipe.total_calories} kcal la jurnal
                      </button>
                )}
                {saved
                  ? <div className="recipe-modal__saved-confirm">💾 Salvată!</div>
                  : <button className="recipe-modal__action-btn recipe-modal__action-btn--save" onClick={handleSave}>
                      💾 Salvează rețeta
                    </button>
                }
              </div>

              <div className="recipe-modal__preferences">
                <h3 className="recipe-modal__section-title">Vrei altă sugestie?</h3>
                <textarea
                  className="recipe-modal__pref-input"
                  placeholder="Ex: fără lactate, mai rapid de preparat, fără gluten, cu mai puțin ulei..."
                  value={preferences}
                  onChange={e => setPreferences(e.target.value)}
                  rows={2}
                />
                <button
                  className="recipe-modal__regen-btn"
                  onClick={handleRegenerate}
                  disabled={!preferences.trim() || regenLoading}
                >
                  {regenLoading ? '⏳ Se generează...' : '🔄 Regenerează cu preferințele mele'}
                </button>
                {regenError && <p className="recipe-modal__regen-error">{regenError}</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MealsView({ meals, onAddToLog, onSaveRecipe }) {
  const [openMeals, setOpenMeals] = useState(new Set([0]));
  const [recipeState, setRecipeState] = useState({
    open: false, mealName: '', mealFoods: [], recipe: null, loading: false, error: null,
  });

  const toggle = (i) => setOpenMeals(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const suggestRecipe = async (e, meal) => {
    e.stopPropagation();
    const foods = (meal.foods || []).filter(f => f.name);
    setRecipeState({ open: true, mealName: meal.meal, mealFoods: foods, recipe: null, loading: true, error: null });
    try {
      const resp = await fetch('http://127.0.0.1:8001/suggest-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_type: meal.meal, foods }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `Server error ${resp.status}`);
      setRecipeState(prev => ({ ...prev, recipe: data.recipe, loading: false }));
    } catch (err) {
      console.error('[suggest-recipe]', err);
      setRecipeState(prev => ({ ...prev, error: err.message || 'Nu am putut genera rețeta.', loading: false }));
    }
  };

  const closeRecipe = () => setRecipeState(prev => ({ ...prev, open: false }));

  if (!meals || meals.length === 0) {
    return <p style={{ color: '#888', padding: '1rem' }}>Nu există mese pentru această zi.</p>;
  }

  return (
    <>
      {recipeState.open && (
        <RecipeModal
          mealName={recipeState.mealName}
          mealFoods={recipeState.mealFoods}
          recipe={recipeState.recipe}
          loading={recipeState.loading}
          error={recipeState.error}
          onClose={closeRecipe}
          onAddToLog={onAddToLog}
          onSave={onSaveRecipe}
        />
      )}

      <div className="meals-grid">
        {meals.map((meal, i) => (
          <div className="meal-card" key={i}>
            <div className="meal-header" onClick={() => toggle(i)}>
              <span className="meal-title">
                {MEAL_ICONS[meal.meal] || '🍴'} {meal.meal}
                {meal.time && <span className="meal-time">{meal.time}</span>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  className="recipe-suggest-btn"
                  onClick={(e) => suggestRecipe(e, meal)}
                  title="Generează o sugestie de rețetă"
                >
                  👨‍🍳 Rețetă
                </button>
                {meal.meal_calories && (
                  <span className="meal-calories">{meal.meal_calories} kcal</span>
                )}
                <span className="meal-chevron">{openMeals.has(i) ? '▲' : '▼'}</span>
              </span>
            </div>

            {openMeals.has(i) && (
              <table className="foods-table">
                <thead>
                  <tr><th>Aliment</th><th>Porție</th><th>Nutrienți cheie</th><th>Sursă</th></tr>
                </thead>
                <tbody>
                  {meal.foods?.map((food, j) => (
                    <tr key={j}>
                      <td>{food.name}</td>
                      <td>{food.portion_grams ? `${food.portion_grams}g` : '—'}</td>
                      <td>{food.key_nutrients?.join(', ') || '—'}</td>
                      <td><span className={sourceBadgeClass(food.source)}>{food.source || 'General'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default function MenuDisplay({ menu, onDayChange, onSaveRecipe }) {
  const {
    days = [], meals = [],
    nutritional_rationale = {}, analysis_summary = {},
    daily_calories_target, disclaimer,
  } = menu;

  const isWeekly = days && days.length > 0;
  const [selectedDay, setSelectedDay] = useState(0);
  const { consumed, addCalories, reset } = useDailyLog(menu._id, selectedDay);

  const handleDaySelect = (idx) => { setSelectedDay(idx); if (onDayChange) onDayChange(idx); };

  const currentMeals    = isWeekly ? (days[selectedDay]?.meals || []) : meals;
  const currentCalories = isWeekly ? (days[selectedDay]?.day_calories || daily_calories_target) : daily_calories_target;

  return (
    <>
      <div className="menu-summary-bar">
        🎯 <strong>Calorii zilnice estimate:</strong> {currentCalories} kcal
        {analysis_summary.abnormal_markers?.length > 0 && (
          <> &nbsp;|&nbsp; ⚠️ Adresează: <em>{analysis_summary.abnormal_markers.join(', ')}</em></>
        )}
      </div>

      <DailyCaloriesBar consumed={consumed} target={currentCalories} onReset={reset} />

      {isWeekly && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          {days.map((day, idx) => (
            <button key={idx} onClick={() => handleDaySelect(idx)} style={{
              padding: '0.45rem 1rem', borderRadius: '20px', border: '1.5px solid',
              borderColor: selectedDay === idx ? '#3a7bd5' : '#d0d7e3',
              background: selectedDay === idx ? '#3a7bd5' : '#fff',
              color: selectedDay === idx ? '#fff' : '#444',
              fontWeight: selectedDay === idx ? 700 : 400,
              cursor: 'pointer', fontSize: '0.88rem', transition: 'all 0.15s',
            }}>
              {day.day_name || `Ziua ${day.day_number}`}
            </button>
          ))}
        </div>
      )}

      <MealsView meals={currentMeals} onAddToLog={addCalories} onSaveRecipe={onSaveRecipe} />

      {Object.keys(nutritional_rationale).length > 0 && (
        <div className="rationale-card">
          <h3 className="rationale-title">📋 Rațiunea Nutrițională</h3>
          {Object.entries(nutritional_rationale).map(([key, explanation], i) => (
            <div className="rationale-item" key={i}>
              <span className="rationale-key">{key}: </span>{explanation}
            </div>
          ))}
        </div>
      )}

      {disclaimer && <div className="disclaimer-box">{disclaimer}</div>}
    </>
  );
}
