from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI as OpenAIClient
import json as _json
from nutrition_rag import get_nutrition_answer
from menu_generator import generate_personalized_menu
from analysis_parser import parse_analysis_text, parse_analysis_pdf

app = Flask(__name__)
CORS(app)

_openai_client = OpenAIClient()

RECIPE_PROMPT = """You are a professional nutritionist-chef. Generate a simple, healthy {meal_type} recipe using these foods as main ingredients: {food_list}.
{preferences_block}
Return ONLY a valid JSON object with this structure. The calorie values in the example are WRONG — you MUST calculate realistic kcal based on the actual ingredients and amounts:
{{
  "title": "Nume rețetă în română",
  "prep_time": "X minute",
  "cook_time": "X minute",
  "servings": 1,
  "total_calories": <calculate: sum of all ingredient calories>,
  "ingredients": [
    {{"name": "ingredientul tău", "amount": "cantitate reală", "calories": <calculate for this amount>}},
    {{"name": "al doilea ingredient", "amount": "cantitate reală", "calories": <calculate for this amount>}}
  ],
  "steps": ["Pasul 1...", "Pasul 2..."],
  "nutritional_tip": "1-2 propoziții despre beneficiile nutritive în română"
}}

Rules:
- Use the provided foods as the base; add only common pantry items (oil, salt, pepper, garlic etc.)
- Max 6 steps, portions for 1 person
- total_calories MUST equal the sum of ingredient calories — calculate each one individually (e.g. 100g chicken ≈ 165 kcal, 1 egg ≈ 70 kcal, 100g spinach ≈ 23 kcal)
- All text in Romanian"""


def _generate_recipe(meal_type, foods, user_preferences=None):
    food_list = ", ".join(f["name"] for f in foods if f.get("name"))
    prefs_block = (
        f"\nUser preferences for this recipe: {user_preferences.strip()}\n"
        if user_preferences and user_preferences.strip()
        else ""
    )
    prompt = RECIPE_PROMPT.format(
        meal_type=meal_type,
        food_list=food_list,
        preferences_block=prefs_block,
    )
    response = _openai_client.chat.completions.create(
        model="gpt-4o",
        temperature=0.7,
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}],
    )
    return _json.loads(response.choices[0].message.content)


@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get("message")
    conversation_history = data.get("history", [])
    if not message:
        return jsonify({'error': 'Missing message'}), 400
    answer = get_nutrition_answer(message, conversation_history)
    return jsonify({'answer': answer})


@app.route('/analyze', methods=['POST'])
def analyze():
    """Parse medical analysis: JSON values or PDF file."""
    if request.content_type and 'multipart/form-data' in request.content_type:
        pdf_file = request.files.get('pdf')
        if not pdf_file:
            return jsonify({'error': 'Missing PDF file'}), 400
        result = parse_analysis_pdf(pdf_file)
    else:
        data = request.get_json()
        values = data.get("values")
        if not values:
            return jsonify({'error': 'Missing values'}), 400
        result = parse_analysis_text(values)
    return jsonify({'analysis': result})


@app.route('/generate-menu', methods=['POST'])
def generate_menu():
    data = request.get_json()
    analysis = data.get("analysis")
    preferences = data.get("preferences", {})
    if not analysis:
        return jsonify({'error': 'Missing analysis data'}), 400
    menu = generate_personalized_menu(analysis, preferences)
    return jsonify({'menu': menu})


@app.route('/suggest-recipe', methods=['POST'])
def suggest_recipe():
    data = request.get_json()
    meal_type = data.get("meal_type")
    foods = data.get("foods", [])
    user_preferences = data.get("user_preferences", "")
    if not meal_type or not foods:
        return jsonify({'error': 'Missing meal_type or foods'}), 400
    try:
        recipe = _generate_recipe(meal_type, foods, user_preferences)
        return jsonify({'recipe': recipe})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=8001)
