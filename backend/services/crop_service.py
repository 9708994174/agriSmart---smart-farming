"""
Crop Recommendation Service
============================
Loads the trained ensemble ML model (Random Forest + Gradient Boosting)
and returns top-N crop recommendations based on soil and climate inputs.

Falls back to a rule-based scoring algorithm if the model file is missing.
"""

import os
import json
import numpy as np
from models.prediction import CropPredictionRequest

# ──────────────────────────────────────────────────────────
#  Paths
# ──────────────────────────────────────────────────────────
_BASE = os.path.dirname(__file__)
MODEL_PATH   = os.path.abspath(os.path.join(_BASE, "..", "..", "ml", "crop_model", "crop_model.pkl"))
ENCODER_PATH = os.path.abspath(os.path.join(_BASE, "..", "..", "ml", "crop_model", "label_encoder.pkl"))
METADATA_PATH= os.path.abspath(os.path.join(_BASE, "..", "..", "ml", "crop_model", "model_metadata.json"))


# ──────────────────────────────────────────────────────────
#  Full crop database (22 crops)
#  Used as fallback when model is absent and for rich metadata
# ──────────────────────────────────────────────────────────
CROP_DATABASE = {
    # ── Cereals ──
    "Rice": {
        "N": (60, 120), "P": (30, 70), "K": (30, 60),
        "temp": (20, 35), "humidity": (60, 95), "ph": (5.5, 7.0), "rainfall": (150, 300),
        "season": "Kharif (June - October)",
        "description": "A staple cereal crop ideal for warm, humid conditions with heavy irrigation. Grows best in paddy fields with clay or loamy soil."
    },
    "Wheat": {
        "N": (80, 150), "P": (40, 80), "K": (20, 50),
        "temp": (10, 25), "humidity": (40, 70), "ph": (6.0, 7.5), "rainfall": (50, 120),
        "season": "Rabi (November - March)",
        "description": "India's primary Rabi crop. Requires cool growing conditions and moderate water. Ideal for Indo-Gangetic plains."
    },
    "Maize": {
        "N": (60, 140), "P": (30, 60), "K": (20, 50),
        "temp": (18, 32), "humidity": (50, 80), "ph": (5.5, 7.5), "rainfall": (60, 150),
        "season": "Kharif / Rabi (Dual Season)",
        "description": "Versatile cereal crop used for food, fodder, and industrial purposes. Grows well in diverse climatic conditions."
    },
    "Barley": {
        "N": (60, 120), "P": (30, 60), "K": (20, 40),
        "temp": (7, 20), "humidity": (30, 60), "ph": (6.0, 7.5), "rainfall": (40, 100),
        "season": "Rabi (October - March)",
        "description": "Hardy cereal crop tolerant of poor soils. Used for food, malt, and animal feed. Grows well in cooler regions."
    },
    "Sorghum": {
        "N": (50, 100), "P": (20, 50), "K": (20, 40),
        "temp": (22, 35), "humidity": (30, 70), "ph": (5.5, 7.5), "rainfall": (40, 120),
        "season": "Kharif (June - September)",
        "description": "Drought-tolerant cereal ideal for dryland farming. Good for semi-arid regions with limited water supply."
    },
    # ── Pulses ──
    "Chickpea": {
        "N": (20, 50), "P": (40, 80), "K": (15, 40),
        "temp": (15, 30), "humidity": (30, 60), "ph": (6.0, 8.0), "rainfall": (40, 100),
        "season": "Rabi (October - March)",
        "description": "A key pulse crop that fixes atmospheric nitrogen. Drought-tolerant and suitable for rainfed conditions."
    },
    "Lentil": {
        "N": (15, 40), "P": (30, 60), "K": (15, 35),
        "temp": (12, 25), "humidity": (30, 60), "ph": (6.0, 7.5), "rainfall": (30, 80),
        "season": "Rabi (October - February)",
        "description": "High-protein pulse crop best in cool, dry weather. Fixes nitrogen and improves soil health."
    },
    "Moong": {
        "N": (15, 35), "P": (30, 60), "K": (20, 40),
        "temp": (25, 35), "humidity": (55, 80), "ph": (6.0, 7.5), "rainfall": (60, 120),
        "season": "Kharif (June - September)",
        "description": "Short-duration summer pulse rich in protein. Well-suited for sandy loam soils with moderate rainfall."
    },
    "Pigeonpea": {
        "N": (20, 40), "P": (40, 70), "K": (20, 40),
        "temp": (22, 35), "humidity": (50, 80), "ph": (5.5, 7.5), "rainfall": (60, 150),
        "season": "Kharif (June - October)",
        "description": "Drought-tolerant perennial/annual pulse. Widely grown in peninsular India on various soil types."
    },
    # ── Oilseeds ──
    "Mustard": {
        "N": (40, 80), "P": (20, 50), "K": (10, 30),
        "temp": (10, 25), "humidity": (30, 60), "ph": (6.0, 7.5), "rainfall": (30, 80),
        "season": "Rabi (October - March)",
        "description": "Important oilseed crop for northern India. Requires cool, dry weather during growth."
    },
    "Soybean": {
        "N": (20, 50), "P": (40, 80), "K": (20, 50),
        "temp": (20, 32), "humidity": (50, 80), "ph": (6.0, 7.5), "rainfall": (60, 150),
        "season": "Kharif (June - October)",
        "description": "High-protein oilseed crop. Major crop in Madhya Pradesh and Maharashtra. Suitable for black and red soils."
    },
    "Groundnut": {
        "N": (15, 40), "P": (30, 60), "K": (30, 70),
        "temp": (22, 35), "humidity": (50, 80), "ph": (5.5, 7.0), "rainfall": (50, 130),
        "season": "Kharif (June - October)",
        "description": "Important oilseed and food crop. Requires sandy loam or red soil with good drainage."
    },
    "Sunflower": {
        "N": (50, 100), "P": (40, 70), "K": (30, 60),
        "temp": (18, 32), "humidity": (40, 70), "ph": (6.0, 7.5), "rainfall": (50, 120),
        "season": "Kharif / Rabi (Both Seasons)",
        "description": "Oilseed crop with high yield and adaptability. Tolerant of varied soils, high demand for edible oil."
    },
    # ── Commercial Crops ──
    "Cotton": {
        "N": (90, 150), "P": (30, 60), "K": (30, 60),
        "temp": (25, 38), "humidity": (40, 70), "ph": (6.0, 8.0), "rainfall": (50, 120),
        "season": "Kharif (April - October)",
        "description": "Major cash crop best suited for black cotton soil. Requires warm climate with moderate rainfall."
    },
    "Sugarcane": {
        "N": (100, 180), "P": (40, 80), "K": (50, 100),
        "temp": (20, 35), "humidity": (60, 90), "ph": (6.0, 8.0), "rainfall": (100, 200),
        "season": "Annual (10-18 months)",
        "description": "Long-duration commercial crop used for sugar production. Requires tropical climate and heavy irrigation."
    },
    "Jute": {
        "N": (60, 100), "P": (25, 50), "K": (30, 60),
        "temp": (24, 35), "humidity": (70, 95), "ph": (5.5, 7.0), "rainfall": (150, 300),
        "season": "Kharif (March - August)",
        "description": "Natural fiber crop requiring hot and humid climate. Best grown in alluvial soil of West Bengal and Assam."
    },
    # ── Vegetables ──
    "Potato": {
        "N": (80, 150), "P": (40, 80), "K": (60, 120),
        "temp": (12, 22), "humidity": (60, 85), "ph": (5.0, 6.5), "rainfall": (50, 100),
        "season": "Rabi (October - February)",
        "description": "Cool-season vegetable crop. India is the second-largest producer. Requires well-drained, loose, sandy loam soil."
    },
    "Tomato": {
        "N": (80, 130), "P": (50, 80), "K": (50, 100),
        "temp": (18, 30), "humidity": (50, 80), "ph": (6.0, 7.0), "rainfall": (40, 100),
        "season": "Year-round (varies by region)",
        "description": "Major vegetable crop grown across India. Requires moderate climate and well-drained fertile soil."
    },
    "Onion": {
        "N": (80, 120), "P": (40, 70), "K": (40, 80),
        "temp": (15, 25), "humidity": (50, 70), "ph": (6.0, 7.0), "rainfall": (50, 100),
        "season": "Rabi (October - February)",
        "description": "Essential vegetable crop with strong market demand. Requires moderate climate and well-drained loamy soil."
    },
    "Garlic": {
        "N": (80, 130), "P": (40, 70), "K": (60, 100),
        "temp": (12, 22), "humidity": (45, 70), "ph": (6.0, 7.0), "rainfall": (40, 80),
        "season": "Rabi (October - February)",
        "description": "High-value bulb crop. Prefers cool weather during bulb development. Well-drained loamy soils produce best quality."
    },
    # ── Fruits ──
    "Banana": {
        "N": (100, 200), "P": (50, 100), "K": (80, 150),
        "temp": (22, 35), "humidity": (65, 90), "ph": (5.5, 7.0), "rainfall": (100, 250),
        "season": "Year-round (tropical)",
        "description": "High-value fruit crop suited for tropical and subtropical regions. Requires well-drained fertile soil and high humidity."
    },
    "Mango": {
        "N": (60, 120), "P": (30, 60), "K": (50, 100),
        "temp": (24, 40), "humidity": (50, 80), "ph": (5.5, 7.5), "rainfall": (75, 200),
        "season": "Summer (March - June)",
        "description": "King of fruits — requires distinct dry and wet seasons. Deep, well-drained alluvial or loamy soils are ideal."
    },
}

# ──────────────────────────────────────────────────────────
#  Lazy model loader (module-level cache)
# ──────────────────────────────────────────────────────────
_model   = None
_encoder = None
_metadata= None


def _load_model():
    """Load model from disk once and cache it in memory."""
    global _model, _encoder, _metadata
    if _model is not None:
        return _model, _encoder, _metadata

    try:
        import joblib
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
        _model   = joblib.load(MODEL_PATH)
        _encoder = joblib.load(ENCODER_PATH)
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH) as f:
                _metadata = json.load(f)
        print(f"[CROP] ✅ Loaded ML model from {MODEL_PATH}")
        if _metadata:
            print(f"       Accuracy: {_metadata.get('accuracy', 'N/A')} | "
                  f"Crops: {_metadata.get('n_classes', 'N/A')} | "
                  f"Samples: {_metadata.get('total_samples', 'N/A')}")
    except Exception as exc:
        print(f"[CROP] ⚠️  ML model unavailable — {exc}")
        _model = _encoder = _metadata = None

    return _model, _encoder, _metadata


# ──────────────────────────────────────────────────────────
#  Scoring helper (fallback algorithm)
# ──────────────────────────────────────────────────────────
def _score(value: float, optimal_range: tuple) -> float:
    lo, hi = optimal_range
    if lo <= value <= hi:
        mid      = (lo + hi) / 2.0
        distance = abs(value - mid) / max((hi - lo), 1e-9) * 2
        return max(0.0, 100 - distance * 30)
    elif value < lo:
        diff_pct = (lo - value) / max(lo, 1e-9) * 100
        return max(0.0, 70 - diff_pct)
    else:
        diff_pct = (value - hi) / max(hi, 1e-9) * 100
        return max(0.0, 70 - diff_pct)


def _fallback_predict(req: CropPredictionRequest) -> list:
    results = []
    for name, params in CROP_DATABASE.items():
        scores = [
            _score(req.nitrogen,    params["N"]),
            _score(req.phosphorus,  params["P"]),
            _score(req.potassium,   params["K"]),
            _score(req.temperature, params["temp"]),
            _score(req.humidity,    params["humidity"]),
            _score(req.ph,          params["ph"]),
            _score(req.rainfall,    params["rainfall"]),
        ]
        results.append({
            "name":        name,
            "confidence":  round(sum(scores) / len(scores), 1),
            "season":      params["season"],
            "description": params["description"],
        })
    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results[:6]


# ──────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────
def predict_crop(request: CropPredictionRequest) -> dict:
    """
    Returns top crop recommendations.

    Uses the trained ensemble ML model (no external API calls).
    Falls back to rule-based scoring if model file is absent.
    """
    model, le, metadata = _load_model()

    if model is not None and le is not None:
        # ── ML model path ──────────────────────────────────
        X = np.array([[
            request.nitrogen, request.phosphorus, request.potassium,
            request.temperature, request.humidity, request.ph, request.rainfall
        ]], dtype=np.float32)

        proba       = model.predict_proba(X)[0]
        top_indices = np.argsort(proba)[::-1][:6]

        crops = []
        for idx in top_indices:
            raw_name  = le.classes_[idx]          # lowercase from training
            title_name= raw_name.title()           # "rice" → "Rice"
            db_info   = CROP_DATABASE.get(title_name, {})

            # If metadata has richer info, use it
            meta_crop = {}
            if metadata and "crops_config" in metadata:
                meta_crop = metadata["crops_config"].get(raw_name, {})

            crops.append({
                "name":        title_name,
                "confidence":  round(float(proba[idx]) * 100, 1),
                "season":      db_info.get("season", meta_crop.get("season", "")),
                "description": db_info.get("description", meta_crop.get("description", "")),
            })

        model_label = (metadata or {}).get(
            "model_type", "Random Forest + Gradient Boosting Ensemble"
        )
        return {
            "crops":      crops,
            "model_used": model_label,
            "tips":       generate_tips(request),
        }

    # ── Fallback: rule-based scoring ───────────────────────
    print("[CROP] Using fallback scoring algorithm.")
    return {
        "crops":      _fallback_predict(request),
        "model_used": "Rule-Based Suitability Scoring",
        "tips":       generate_tips(request),
    }


def generate_tips(req: CropPredictionRequest) -> list:
    tips = []

    # pH
    if req.ph < 5.5:
        tips.append("Soil pH is very acidic (< 5.5). Apply agricultural lime at 2–4 t/ha to raise pH.")
    elif req.ph < 6.0:
        tips.append("Soil is mildly acidic. Small lime application (1–2 t/ha) will benefit most crops.")
    elif req.ph > 8.0:
        tips.append("Soil pH is high (alkaline). Apply gypsum or sulfur to lower pH closer to 6.5–7.0.")

    # Nitrogen
    if req.nitrogen < 40:
        tips.append("Nitrogen is low. Apply urea (46% N) at 100–120 kg/ha or use green manuring with legumes.")
    elif req.nitrogen > 150:
        tips.append("Very high nitrogen — risk of lodging and pest build-up. Consider split application.")

    # Phosphorus
    if req.phosphorus < 25:
        tips.append("Phosphorus is below optimal. Apply DAP (Di-Ammonium Phosphate) at 50–75 kg/ha.")

    # Potassium
    if req.potassium < 20:
        tips.append("Potassium is low. Apply Muriate of Potash (MOP) at 40–60 kg/ha.")

    # Rainfall
    if req.rainfall < 50:
        tips.append("Very low rainfall. Choose drought-tolerant crops (sorghum, mustard, chickpea) or invest in drip irrigation.")
    elif req.rainfall < 80:
        tips.append("Limited rainfall. Consider micro-irrigation for water-sensitive crops.")

    # Humidity
    if req.humidity > 85:
        tips.append("High humidity. Monitor for fungal diseases; maintain proper plant spacing and air circulation.")
    elif req.humidity < 35:
        tips.append("Low humidity. Mulching can help retain soil moisture between irrigations.")

    # Temperature
    if req.temperature > 38:
        tips.append("High temperature stress likely. Use heat-tolerant varieties and irrigate during cooler hours.")
    elif req.temperature < 10:
        tips.append("Cold conditions. Choose Rabi crops like wheat, barley, or mustard that tolerate low temperatures.")

    if not tips:
        tips.append("Soil and climate parameters are within good ranges for most crops. Maintain current practices.")

    return tips


def analyze_soil(request: CropPredictionRequest) -> dict:
    analysis = {
        "nitrogen_status":   ("High" if request.nitrogen   > 80  else "Medium" if request.nitrogen   > 40  else "Low"),
        "phosphorus_status": ("High" if request.phosphorus > 60  else "Medium" if request.phosphorus > 25  else "Low"),
        "potassium_status":  ("High" if request.potassium  > 60  else "Medium" if request.potassium  > 20  else "Low"),
        "ph_status":         ("Acidic" if request.ph < 6.0 else "Alkaline" if request.ph > 7.5 else "Neutral"),
        "overall_fertility": "",
        "recommendations":   [],
    }

    score = sum([
        1 if request.nitrogen   > 40  else 0,
        1 if request.phosphorus > 25  else 0,
        1 if request.potassium  > 20  else 0,
        1 if 6.0 <= request.ph <= 7.5 else 0,
    ])
    analysis["overall_fertility"] = "High" if score >= 4 else "Medium" if score >= 2 else "Low"

    if analysis["nitrogen_status"]   == "Low":
        analysis["recommendations"].append("Apply urea (46% N) at 100 kg/ha or FYM at 10 t/ha.")
    if analysis["phosphorus_status"] == "Low":
        analysis["recommendations"].append("Apply DAP at 50–75 kg/ha or bone meal for organic farming.")
    if analysis["potassium_status"]  == "Low":
        analysis["recommendations"].append("Apply MOP at 40–60 kg/ha to improve quality and disease resistance.")
    if analysis["ph_status"] == "Acidic":
        analysis["recommendations"].append("Apply agricultural lime at 2–4 t/ha to correct acidity.")
    elif analysis["ph_status"] == "Alkaline":
        analysis["recommendations"].append("Apply gypsum at 2–5 t/ha and increase organic matter to reduce alkalinity.")

    if not analysis["recommendations"]:
        analysis["recommendations"].append("Soil parameters are within optimal ranges. Maintain current nutrient practices.")

    return analysis
