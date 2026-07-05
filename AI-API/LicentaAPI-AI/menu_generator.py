"""
Personalized 7-day menu generator.

Uses chain-of-thought prompting with the RAG index to generate
a full week plan tailored to the user's abnormal blood markers,
with diversity across days while addressing the same conditions.
"""

import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

DAY_NAMES = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"]

SYSTEM_PROMPT = """You are NutriRAG, a clinical nutrition assistant.
Your task is to generate a personalized 7-DAY MEAL PLAN based on the user's medical analysis results.

Rules:
1. Address EVERY abnormal marker found in the analysis across ALL 7 days.
2. For each food, cite its source: FooDB, PubChem, ADMETLab3, or Cookbook.
3. Distinguish bioavailability: prefer heme iron (15-35% absorption) over non-heme (2-20%) for iron deficiency.
4. Each day has 5 meals: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner.
5. DIVERSITY IS MANDATORY:
   - No main dish repeated on consecutive days.
   - Rotate protein sources: poultry, fish, legumes, eggs, dairy, red meat (max 2x/week).
   - Vary cooking methods: raw, boiled, baked, grilled, stewed.
   - Different vegetables and grains each day.
6. All 7 days must address the same medical markers but with different foods each day.
7. Include a single nutritional_rationale section explaining how the weekly plan addresses each abnormal value.
8. Do NOT recommend foods that contradict each other's medical goals.
9. Respond in Romanian.
10. Return ONLY valid JSON, nothing else.
"""

MENU_TEMPLATE = """
Think step by step:

STEP 1 — Nutritional problems to solve:
{abnormal_summary}

STEP 2 — For each abnormal marker, list 10+ diverse food sources with bioavailability data.
Use: FooDB for composition, PubChem for molecular forms, ADMETLab3 for absorption rates, Cookbook for practical recipes.

STEP 3 — Build 7 diverse days (~{calories} kcal/day each), respecting: {preferences}
Rotation plan (no repeats on consecutive days):
- Protein rotation: chicken, fish, lentils, eggs, beef, tofu/cheese, turkey
- Grain rotation: oats, rice, quinoa, bread, pasta, couscous, potatoes
- Each day must address ALL abnormal markers through different food combinations

STEP 4 — Return ONLY this JSON (no extra text):
{{
  "daily_calories_target": {calories},
  "days": [
    {{
      "day_number": 1,
      "day_name": "Luni",
      "day_calories": {calories},
      "meals": [
        {{
          "meal": "Breakfast",
          "time": "07:30",
          "foods": [
            {{
              "name": "food name in Romanian",
              "portion_grams": 100,
              "key_nutrients": ["nutrient1", "nutrient2"],
              "addresses_marker": "marker_key_or_empty",
              "source": "FooDB"
            }}
          ],
          "meal_calories": 400
        }},
        {{
          "meal": "Morning Snack",
          "time": "10:30",
          "foods": [],
          "meal_calories": 150
        }},
        {{
          "meal": "Lunch",
          "time": "13:00",
          "foods": [],
          "meal_calories": 600
        }},
        {{
          "meal": "Afternoon Snack",
          "time": "16:30",
          "foods": [],
          "meal_calories": 200
        }},
        {{
          "meal": "Dinner",
          "time": "19:30",
          "foods": [],
          "meal_calories": 500
        }}
      ]
    }},
    {{ "day_number": 2, "day_name": "Marți", "day_calories": {calories}, "meals": [] }},
    {{ "day_number": 3, "day_name": "Miercuri", "day_calories": {calories}, "meals": [] }},
    {{ "day_number": 4, "day_name": "Joi", "day_calories": {calories}, "meals": [] }},
    {{ "day_number": 5, "day_name": "Vineri", "day_calories": {calories}, "meals": [] }},
    {{ "day_number": 6, "day_name": "Sâmbătă", "day_calories": {calories}, "meals": [] }},
    {{ "day_number": 7, "day_name": "Duminică", "day_calories": {calories}, "meals": [] }}
  ],
  "nutritional_rationale": {{
    "marker_key": "explanation of how the weekly plan corrects this value"
  }},
  "disclaimer": "⚠️ Acest plan alimentar este generat de un sistem AI în scop educațional. Consultați un medic sau nutriționist înainte de modificări alimentare semnificative."
}}

IMPORTANT: Fill ALL 7 days with complete meal data. The template above shows the structure — replace the empty arrays with actual foods.
"""


def _build_abnormal_summary(analysis: dict) -> str:
    abnormal = analysis.get("abnormal", [])
    if not abnormal:
        return "No abnormal markers detected. Generate a balanced, varied general nutrition plan."

    lines = []
    for m in abnormal:
        direction = "LOW" if m["status"] == "low" else "HIGH"
        lines.append(
            f"- {m['label']}: {m['value']} {m['unit']} "
            f"({direction}, reference: {m['reference_min']}–{m['reference_max']} {m['unit']})"
        )
    return "\n".join(lines)


def _estimate_calories(preferences: dict) -> int:
    gender = preferences.get("gender", "unknown").lower()
    age = preferences.get("age", 35)
    weight = preferences.get("weight_kg", 70)
    height = preferences.get("height_cm", 170)
    activity = preferences.get("activity_level", "moderate").lower()

    if gender == "female":
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    else:
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)

    multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very active": 1.9,
    }
    factor = multipliers.get(activity, 1.55)
    return int(bmr * factor)


def _ensure_seven_days(days: list, calories: int) -> list:
    """Ensure exactly 7 days with correct day numbers and names."""
    result = []
    for i in range(7):
        if i < len(days):
            day = days[i]
            day["day_number"] = i + 1
            day["day_name"] = DAY_NAMES[i]
            if not day.get("day_calories"):
                day["day_calories"] = calories
            result.append(day)
        else:
            result.append({
                "day_number": i + 1,
                "day_name": DAY_NAMES[i],
                "day_calories": calories,
                "meals": [],
            })
    return result


def generate_personalized_menu(analysis: dict, preferences: dict = None) -> dict:
    if preferences is None:
        preferences = {}

    abnormal_summary = _build_abnormal_summary(analysis)
    calories = _estimate_calories(preferences)

    pref_str = ", ".join([
        f"{k}: {v}" for k, v in preferences.items()
        if k not in ("weight_kg", "height_cm", "age", "gender", "activity_level")
    ]) or "none specified"

    user_prompt = MENU_TEMPLATE.format(
        abnormal_summary=abnormal_summary,
        calories=calories,
        preferences=pref_str,
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content

    try:
        menu = json.loads(raw)
    except json.JSONDecodeError:
        menu = {"raw_response": raw, "days": []}

    menu["days"] = _ensure_seven_days(menu.get("days", []), calories)
    menu["analysis_summary"] = {
        "total_markers": analysis.get("total_markers", 0),
        "abnormal_count": analysis.get("abnormal_count", 0),
        "abnormal_markers": [m["label"] for m in analysis.get("abnormal", [])],
    }
    menu["daily_calories_target"] = calories

    return menu
