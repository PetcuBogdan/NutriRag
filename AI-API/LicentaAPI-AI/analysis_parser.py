"""
Medical analysis parser.

Supports two input modes:
1. Manual input  — dict of {marker: value} from the frontend form
2. PDF upload    — extract text via pdfplumber, then parse with regex + LLM fallback
"""

import re
import io
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Reference ranges for common blood markers
REFERENCE_RANGES = {
    "glucose": {"min": 70, "max": 100, "unit": "mg/dL", "label": "Blood Glucose (fasting)"},
    "hba1c": {"min": 4.0, "max": 5.6, "unit": "%", "label": "HbA1c"},
    "ldl": {"min": 0, "max": 100, "unit": "mg/dL", "label": "LDL Cholesterol"},
    "hdl_male": {"min": 40, "max": 999, "unit": "mg/dL", "label": "HDL Cholesterol (male)"},
    "hdl_female": {"min": 50, "max": 999, "unit": "mg/dL", "label": "HDL Cholesterol (female)"},
    "triglycerides": {"min": 0, "max": 150, "unit": "mg/dL", "label": "Triglycerides"},
    "total_cholesterol": {"min": 0, "max": 200, "unit": "mg/dL", "label": "Total Cholesterol"},
    "hemoglobin_male": {"min": 13.5, "max": 17.5, "unit": "g/dL", "label": "Hemoglobin (male)"},
    "hemoglobin_female": {"min": 12.0, "max": 16.0, "unit": "g/dL", "label": "Hemoglobin (female)"},
    "ferritin_male": {"min": 30, "max": 400, "unit": "ng/mL", "label": "Ferritin (male)"},
    "ferritin_female": {"min": 13, "max": 150, "unit": "ng/mL", "label": "Ferritin (female)"},
    "iron": {"min": 60, "max": 170, "unit": "μg/dL", "label": "Serum Iron"},
    "vitamin_d": {"min": 30, "max": 100, "unit": "ng/mL", "label": "Vitamin D (25-OH)"},
    "vitamin_b12": {"min": 200, "max": 900, "unit": "pg/mL", "label": "Vitamin B12"},
    "folate": {"min": 2.7, "max": 17, "unit": "ng/mL", "label": "Folate (serum)"},
    "tsh": {"min": 0.4, "max": 4.0, "unit": "mIU/L", "label": "TSH (thyroid)"},
    "creatinine_male": {"min": 0.74, "max": 1.35, "unit": "mg/dL", "label": "Creatinine (male)"},
    "creatinine_female": {"min": 0.59, "max": 1.04, "unit": "mg/dL", "label": "Creatinine (female)"},
    "uric_acid_male": {"min": 3.4, "max": 7.0, "unit": "mg/dL", "label": "Uric Acid (male)"},
    "uric_acid_female": {"min": 2.4, "max": 6.0, "unit": "mg/dL", "label": "Uric Acid (female)"},
    "alt": {"min": 7, "max": 56, "unit": "U/L", "label": "ALT (liver)"},
    "ast": {"min": 10, "max": 40, "unit": "U/L", "label": "AST (liver)"},
    "calcium": {"min": 8.5, "max": 10.5, "unit": "mg/dL", "label": "Calcium"},
    "magnesium": {"min": 1.7, "max": 2.2, "unit": "mg/dL", "label": "Magnesium"},
    "zinc": {"min": 70, "max": 120, "unit": "μg/dL", "label": "Zinc"},
    "potassium": {"min": 3.5, "max": 5.0, "unit": "mEq/L", "label": "Potassium"},
    "sodium": {"min": 136, "max": 145, "unit": "mEq/L", "label": "Sodium"},
    "wbc": {"min": 4.5, "max": 11.0, "unit": "10³/μL", "label": "White Blood Cells"},
    "rbc": {"min": 4.5, "max": 5.9, "unit": "10⁶/μL", "label": "Red Blood Cells"},
    "crp": {"min": 0, "max": 1.0, "unit": "mg/L", "label": "C-Reactive Protein"},
}

PDF_PATTERNS = [
    r'(?P<marker>[\w\s\-\(\)]+?)\s*[:\|]\s*(?P<value>[\d\.,]+)\s*(?P<unit>[a-zA-Z%/μgmLdlU]+)?',
    r'(?P<value>[\d\.,]+)\s*(?P<unit>[a-zA-Z%/μgmLdlU]+)?\s*[:\|]?\s*(?P<marker>[\w\s\-]+)',
]

MARKER_ALIASES = {
    "glucose": ["glucose", "glycemia", "glicemie", "blood sugar", "fasting glucose", "glycémie"],
    "hba1c": ["hba1c", "a1c", "hemoglobin a1c", "glycated hemoglobin"],
    "ldl": ["ldl", "ldl-c", "ldl cholesterol", "ldl colesterol"],
    "hdl_male": ["hdl", "hdl-c", "hdl cholesterol"],
    "hdl_female": ["hdl", "hdl-c", "hdl cholesterol"],
    "triglycerides": ["triglycerides", "trigliceride", "tg"],
    "total_cholesterol": ["total cholesterol", "cholesterol total", "colesterol total"],
    "hemoglobin_male": ["hemoglobin", "hgb", "hb", "hemoglobina"],
    "hemoglobin_female": ["hemoglobin", "hgb", "hb", "hemoglobina"],
    "ferritin_male": ["ferritin", "feritina"],
    "ferritin_female": ["ferritin", "feritina"],
    "iron": ["iron", "fier seric", "serum iron", "fe seric"],
    "vitamin_d": ["vitamin d", "vitamina d", "25-oh vitamin d", "25(oh)d", "25-hydroxyvitamin d"],
    "vitamin_b12": ["vitamin b12", "vitamina b12", "cobalamin", "b12"],
    "folate": ["folate", "folic acid", "acid folic", "b9"],
    "tsh": ["tsh", "thyroid stimulating hormone"],
    "creatinine_male": ["creatinine", "creatinina"],
    "creatinine_female": ["creatinine", "creatinina"],
    "uric_acid_male": ["uric acid", "acid uric"],
    "uric_acid_female": ["uric acid", "acid uric"],
    "alt": ["alt", "alanine aminotransferase", "sgpt"],
    "ast": ["ast", "aspartate aminotransferase", "sgot"],
    "calcium": ["calcium", "calciu"],
    "magnesium": ["magnesium", "magneziu"],
    "zinc": ["zinc"],
    "potassium": ["potassium", "potasiu", "kalium", "k+"],
    "sodium": ["sodium", "sodiu", "natrium", "na+"],
    "wbc": ["wbc", "white blood cells", "leucocite", "leukocytes"],
    "rbc": ["rbc", "red blood cells", "eritrocite", "erythrocytes"],
    "crp": ["crp", "c-reactive protein", "proteina c reactiva"],
}


def _normalize_value(val_str: str) -> float | None:
    try:
        return float(val_str.replace(",", ".").strip())
    except (ValueError, AttributeError):
        return None


def _match_marker(raw_name: str) -> str | None:
    raw_lower = raw_name.lower().strip()
    for key, aliases in MARKER_ALIASES.items():
        for alias in aliases:
            if alias in raw_lower or raw_lower in alias:
                return key
    return None


def _evaluate_marker(key: str, value: float) -> dict:
    ref = REFERENCE_RANGES.get(key)
    if not ref:
        return {"status": "unknown", "key": key, "value": value}

    status = "normal"
    if value < ref["min"]:
        status = "low"
    elif value > ref["max"]:
        status = "high"

    return {
        "key": key,
        "label": ref["label"],
        "value": value,
        "unit": ref["unit"],
        "reference_min": ref["min"],
        "reference_max": ref["max"],
        "status": status,
    }


def parse_analysis_text(values: dict) -> dict:
    """Parse manual input: {marker_key: numeric_value}."""
    results = []
    abnormal = []

    for raw_key, raw_val in values.items():
        value = _normalize_value(str(raw_val))
        if value is None:
            continue

        matched_key = _match_marker(raw_key) or raw_key.lower().replace(" ", "_")
        evaluated = _evaluate_marker(matched_key, value)
        evaluated["raw_key"] = raw_key
        results.append(evaluated)

        if evaluated["status"] in ("low", "high"):
            abnormal.append(evaluated)

    return {
        "markers": results,
        "abnormal": abnormal,
        "abnormal_count": len(abnormal),
        "total_markers": len(results),
    }


def parse_analysis_pdf(pdf_file) -> dict:
    """Parse uploaded PDF medical analysis file using pdfplumber."""
    try:
        import pdfplumber
    except ImportError:
        return {"error": "pdfplumber not installed. Run: pip install pdfplumber"}

    pdf_bytes = pdf_file.read()
    extracted_values = {}

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        full_text = ""
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            full_text += page_text + "\n"

            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if not row:
                        continue
                    row_text = [str(c).strip() if c else "" for c in row]
                    if len(row_text) >= 2:
                        raw_marker = row_text[0]
                        raw_value = row_text[1]
                        matched = _match_marker(raw_marker)
                        if matched:
                            val = _normalize_value(raw_value)
                            if val is not None:
                                extracted_values[matched] = val

    if len(extracted_values) < 3:
        for pattern in PDF_PATTERNS:
            for match in re.finditer(pattern, full_text, re.IGNORECASE):
                groups = match.groupdict()
                raw_marker = groups.get("marker", "")
                raw_value = groups.get("value", "")
                matched = _match_marker(raw_marker)
                if matched and matched not in extracted_values:
                    val = _normalize_value(raw_value)
                    if val is not None:
                        extracted_values[matched] = val

    return parse_analysis_text(extracted_values)
