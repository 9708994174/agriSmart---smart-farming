"""
Crop Recommendation Service
Uses a scoring algorithm based on soil and climate parameters.
Integrates with trained Random Forest model when available.
"""
import os
import numpy as np
from models.prediction import CropPredictionRequest

CROP_DATABASE = {
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
    "Cotton": {
        "N": (90, 150), "P": (30, 60), "K": (30, 60),
        "temp": (25, 38), "humidity": (40, 70), "ph": (6.0, 8.0), "rainfall": (50, 120),
        "season": "Kharif (April - October)",
        "description": "Major cash crop best suited for black cotton soil (regur). Requires warm climate with moderate rainfall."
    },
    "Sugarcane": {
        "N": (100, 180), "P": (40, 80), "K": (50, 100),
        "temp": (20, 35), "humidity": (60, 90), "ph": (6.0, 8.0), "rainfall": (100, 200),
        "season": "Annual (10-18 months)",
        "description": "Long-duration commercial crop used for sugar production. Requires tropical climate and heavy irrigation."
    },
    "Mustard": {
        "N": (40, 80), "P": (20, 50), "K": (10, 30),
        "temp": (10, 25), "humidity": (30, 60), "ph": (6.0, 7.5), "rainfall": (30, 80),
        "season": "Rabi (October - March)",
        "description": "Important oilseed crop for northern India. Requires cool, dry weather during growth and warm conditions for maturity."
    },
    "Chickpea": {
        "N": (20, 50), "P": (40, 80), "K": (15, 40),
        "temp": (15, 30), "humidity": (30, 60), "ph": (6.0, 8.0), "rainfall": (40, 100),
        "season": "Rabi (October - March)",
        "description": "A key pulse crop that fixes atmospheric nitrogen. Drought-tolerant and suitable for rainfed conditions."
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
}


def calculate_score(value: float, optimal_range: tuple) -> float:
    low, high = optimal_range
    if low <= value <= high:
        mid = (low + high) / 2
        distance = abs(value - mid) / (high - low) * 2
        return max(0, 100 - distance * 30)
    elif value < low:
        diff_pct = (low - value) / low * 100
        return max(0, 70 - diff_pct)
    else:
        diff_pct = (value - high) / high * 100
        return max(0, 70 - diff_pct)


def predict_crop(request: CropPredictionRequest) -> dict:
    """Score each crop based on how well the input parameters match ideal ranges"""

    # Try to use trained ML model first
    model_path = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "crop_model", "crop_model.pkl")
    try:
        import joblib
        if os.path.exists(model_path):
            encoder_path = model_path.replace("crop_model.pkl", "label_encoder.pkl")
            model = joblib.load(model_path)
            le = joblib.load(encoder_path)
            X = np.array([[request.nitrogen, request.phosphorus, request.potassium,
                          request.temperature, request.humidity, request.ph, request.rainfall]])
            proba = model.predict_proba(X)[0]
            top_indices = np.argsort(proba)[::-1][:5]

            ml_crops = []
            for idx in top_indices:
                crop_name = le.classes_[idx].title()
                db_info = CROP_DATABASE.get(crop_name, {})
                ml_crops.append({
                    "name": crop_name,
                    "confidence": round(proba[idx] * 100, 1),
                    "season": db_info.get("season", ""),
                    "description": db_info.get("description", ""),
                })

            return {
                "crops": ml_crops,
                "model_used": "Random Forest Classifier",
                "tips": generate_tips(request),
            }
    except Exception as e:
        print(f"ML model not available, using scoring algorithm: {e}")

    # Fallback: scoring algorithm
    results = []
    for name, params in CROP_DATABASE.items():
        scores = [
            calculate_score(request.nitrogen, params["N"]),
            calculate_score(request.phosphorus, params["P"]),
            calculate_score(request.potassium, params["K"]),
            calculate_score(request.temperature, params["temp"]),
            calculate_score(request.humidity, params["humidity"]),
            calculate_score(request.ph, params["ph"]),
            calculate_score(request.rainfall, params["rainfall"]),
        ]
        avg_score = sum(scores) / len(scores)
        results.append({
            "name": name,
            "confidence": round(avg_score, 1),
            "season": params["season"],
            "description": params["description"],
        })

    results.sort(key=lambda x: x["confidence"], reverse=True)

    return {
        "crops": results[:6],
        "model_used": "Suitability Scoring Algorithm",
        "tips": generate_tips(request),
    }


def generate_tips(req: CropPredictionRequest) -> list:
    tips = []
    if req.ph < 5.5:
        tips.append("Soil pH is low (acidic). Apply agricultural lime to raise pH closer to 6.0-6.5.")
    elif req.ph > 8.0:
        tips.append("Soil pH is high (alkaline). Apply sulfur or organic matter to lower pH.")
    if req.nitrogen < 40:
        tips.append("Nitrogen levels are low. Apply urea at 50-100 kg/hectare or use green manuring with legumes.")
    if req.phosphorus < 25:
        tips.append("Phosphorus is below optimal. Apply DAP (Di-Ammonium Phosphate) at 50 kg/hectare.")
    if req.potassium < 20:
        tips.append("Potassium is low. Apply Muriate of Potash (MOP) to improve fruit quality and disease resistance.")
    if req.rainfall < 60:
        tips.append("Low rainfall area. Consider drought-tolerant crops or invest in irrigation systems (check PM-KSMY subsidies).")
    if req.humidity > 85:
        tips.append("High humidity region. Monitor for fungal diseases regularly and ensure proper plant spacing.")
    if not tips:
        tips.append("Soil and climate parameters are within good ranges for most crops.")
    return tips


def analyze_soil(request: CropPredictionRequest) -> dict:
    analysis = {
        "nitrogen_status": "High" if request.nitrogen > 80 else "Medium" if request.nitrogen > 40 else "Low",
        "phosphorus_status": "High" if request.phosphorus > 60 else "Medium" if request.phosphorus > 25 else "Low",
        "potassium_status": "High" if request.potassium > 60 else "Medium" if request.potassium > 20 else "Low",
        "ph_status": "Acidic" if request.ph < 6.0 else "Alkaline" if request.ph > 7.5 else "Neutral",
        "overall_fertility": "",
        "recommendations": []
    }

    scores = [
        1 if request.nitrogen > 40 else 0,
        1 if request.phosphorus > 25 else 0,
        1 if request.potassium > 20 else 0,
        1 if 6.0 <= request.ph <= 7.5 else 0,
    ]
    fertility_score = sum(scores) / len(scores) * 100
    analysis["overall_fertility"] = "High" if fertility_score > 75 else "Medium" if fertility_score > 50 else "Low"

    if analysis["nitrogen_status"] == "Low":
        analysis["recommendations"].append("Apply urea (46% N) at 100 kg/hectare or use organic sources like FYM at 10 tonnes/hectare.")
    if analysis["phosphorus_status"] == "Low":
        analysis["recommendations"].append("Apply DAP at 50-75 kg/hectare. Consider bone meal for organic farming.")
    if analysis["potassium_status"] == "Low":
        analysis["recommendations"].append("Apply MOP at 40-60 kg/hectare. Potassium improves crop quality and pest resistance.")
    if analysis["ph_status"] == "Acidic":
        analysis["recommendations"].append("Apply agricultural lime at 2-4 tonnes/hectare to correct soil acidity.")
    elif analysis["ph_status"] == "Alkaline":
        analysis["recommendations"].append("Apply gypsum at 2-5 tonnes/hectare and increase organic matter to reduce alkalinity.")

    if not analysis["recommendations"]:
        analysis["recommendations"].append("Soil parameters are within optimal ranges. Maintain current nutrient management practices.")

    return analysis
