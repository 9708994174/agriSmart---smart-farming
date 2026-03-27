"""
Crop Recommendation Model Training Script
=========================================
Uses Random Forest Classifier + Gradient Boosting Ensemble
Dataset:  Synthetic high-fidelity agronomic data  (6,000+ records, 22 crops)

Features  : N, P, K, temperature, humidity, ph, rainfall
Target    : crop label (22 classes)

Run:
    python ml/crop_model/train_crop_model.py
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder
from sklearn.utils import shuffle
import joblib
import os
import json

# ──────────────────────────────────────────────────────────
#  Configuration
# ──────────────────────────────────────────────────────────
MODEL_DIR      = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH     = os.path.join(MODEL_DIR, "crop_model.pkl")
ENCODER_PATH   = os.path.join(MODEL_DIR, "label_encoder.pkl")
METADATA_PATH  = os.path.join(MODEL_DIR, "model_metadata.json")

# ──────────────────────────────────────────────────────────
#  Crop Agronomic Profiles
#  Each entry: (min, max) for N, P, K, temp, humidity, ph, rainfall
# ──────────────────────────────────────────────────────────
CROPS_CONFIG = {
    # ── Cereals ──────────────────────────────────────────
    "rice": {
        "N": (60, 120), "P": (30, 70), "K": (30, 60),
        "temp": (20, 35), "hum": (60, 95), "ph": (5.5, 7.0), "rain": (150, 300),
        "season": "Kharif (June - October)",
        "description": "A staple cereal crop ideal for warm, humid conditions with heavy irrigation. Grows best in paddy fields with clay or loamy soil."
    },
    "wheat": {
        "N": (80, 150), "P": (40, 80), "K": (20, 50),
        "temp": (10, 25), "hum": (40, 70), "ph": (6.0, 7.5), "rain": (50, 120),
        "season": "Rabi (November - March)",
        "description": "India's primary Rabi crop. Requires cool growing conditions and moderate water. Ideal for Indo-Gangetic plains."
    },
    "maize": {
        "N": (60, 140), "P": (30, 60), "K": (20, 50),
        "temp": (18, 32), "hum": (50, 80), "ph": (5.5, 7.5), "rain": (60, 150),
        "season": "Kharif / Rabi (Dual Season)",
        "description": "Versatile cereal crop used for food, fodder, and industrial purposes. Grows well in diverse climatic conditions."
    },
    "barley": {
        "N": (60, 120), "P": (30, 60), "K": (20, 40),
        "temp": (7, 20), "hum": (30, 60), "ph": (6.0, 7.5), "rain": (40, 100),
        "season": "Rabi (October - March)",
        "description": "Hardy cereal crop tolerant of poor soils. Used for food, malt, and animal feed. Grows well in cooler regions."
    },
    "sorghum": {
        "N": (50, 100), "P": (20, 50), "K": (20, 40),
        "temp": (22, 35), "hum": (30, 70), "ph": (5.5, 7.5), "rain": (40, 120),
        "season": "Kharif (June - September)",
        "description": "Drought-tolerant cereal ideal for dryland farming. Good for semi-arid regions with limited water supply."
    },
    # ── Pulses ───────────────────────────────────────────
    "chickpea": {
        "N": (20, 50), "P": (40, 80), "K": (15, 40),
        "temp": (15, 30), "hum": (30, 60), "ph": (6.0, 8.0), "rain": (40, 100),
        "season": "Rabi (October - March)",
        "description": "A key pulse crop that fixes atmospheric nitrogen. Drought-tolerant and suitable for rainfed conditions."
    },
    "lentil": {
        "N": (15, 40), "P": (30, 60), "K": (15, 35),
        "temp": (12, 25), "hum": (30, 60), "ph": (6.0, 7.5), "rain": (30, 80),
        "season": "Rabi (October - February)",
        "description": "High-protein pulse crop best in cool, dry weather. Fixes nitrogen and improves soil health."
    },
    "moong": {
        "N": (15, 35), "P": (30, 60), "K": (20, 40),
        "temp": (25, 35), "hum": (55, 80), "ph": (6.0, 7.5), "rain": (60, 120),
        "season": "Kharif (June - September)",
        "description": "Short-duration summer pulse rich in protein. Well-suited for sandy loam soils with moderate rainfall."
    },
    "pigeonpea": {
        "N": (20, 40), "P": (40, 70), "K": (20, 40),
        "temp": (22, 35), "hum": (50, 80), "ph": (5.5, 7.5), "rain": (60, 150),
        "season": "Kharif (June - October)",
        "description": "Drought-tolerant perennial/annual pulse. Widely grown in peninsular India on various soil types."
    },
    # ── Oilseeds ─────────────────────────────────────────
    "mustard": {
        "N": (40, 80), "P": (20, 50), "K": (10, 30),
        "temp": (10, 25), "hum": (30, 60), "ph": (6.0, 7.5), "rain": (30, 80),
        "season": "Rabi (October - March)",
        "description": "Important oilseed crop for northern India. Requires cool, dry weather during growth and warm conditions for maturity."
    },
    "soybean": {
        "N": (20, 50), "P": (40, 80), "K": (20, 50),
        "temp": (20, 32), "hum": (50, 80), "ph": (6.0, 7.5), "rain": (60, 150),
        "season": "Kharif (June - October)",
        "description": "High-protein oilseed crop. Major crop in Madhya Pradesh and Maharashtra. Suitable for black and red soils."
    },
    "groundnut": {
        "N": (15, 40), "P": (30, 60), "K": (30, 70),
        "temp": (22, 35), "hum": (50, 80), "ph": (5.5, 7.0), "rain": (50, 130),
        "season": "Kharif (June - October)",
        "description": "Important oilseed and food crop. Requires sandy loam or red soil with good drainage."
    },
    "sunflower": {
        "N": (50, 100), "P": (40, 70), "K": (30, 60),
        "temp": (18, 32), "hum": (40, 70), "ph": (6.0, 7.5), "rain": (50, 120),
        "season": "Kharif / Rabi (Both Seasons)",
        "description": "Oilseed crop with high yield and adaptability. Tolerant of varied soils, high demand for edible oil."
    },
    # ── Commercial Crops ──────────────────────────────────
    "cotton": {
        "N": (90, 150), "P": (30, 60), "K": (30, 60),
        "temp": (25, 38), "hum": (40, 70), "ph": (6.0, 8.0), "rain": (50, 120),
        "season": "Kharif (April - October)",
        "description": "Major cash crop best suited for black cotton soil (regur). Requires warm climate with moderate rainfall."
    },
    "sugarcane": {
        "N": (100, 180), "P": (40, 80), "K": (50, 100),
        "temp": (20, 35), "hum": (60, 90), "ph": (6.0, 8.0), "rain": (100, 200),
        "season": "Annual (10-18 months)",
        "description": "Long-duration commercial crop used for sugar production. Requires tropical climate and heavy irrigation."
    },
    "jute": {
        "N": (60, 100), "P": (25, 50), "K": (30, 60),
        "temp": (24, 35), "hum": (70, 95), "ph": (5.5, 7.0), "rain": (150, 300),
        "season": "Kharif (March - August)",
        "description": "Natural fiber crop requiring hot and humid climate. Best grown in alluvial soil of West Bengal and Assam."
    },
    # ── Vegetables ────────────────────────────────────────
    "potato": {
        "N": (80, 150), "P": (40, 80), "K": (60, 120),
        "temp": (12, 22), "hum": (60, 85), "ph": (5.0, 6.5), "rain": (50, 100),
        "season": "Rabi (October - February)",
        "description": "Cool-season vegetable crop. India is the second-largest producer. Requires well-drained, loose, sandy loam soil."
    },
    "tomato": {
        "N": (80, 130), "P": (50, 80), "K": (50, 100),
        "temp": (18, 30), "hum": (50, 80), "ph": (6.0, 7.0), "rain": (40, 100),
        "season": "Year-round (varies by region)",
        "description": "Major vegetable crop grown across India. Requires moderate climate and well-drained fertile soil."
    },
    "onion": {
        "N": (80, 120), "P": (40, 70), "K": (40, 80),
        "temp": (15, 25), "hum": (50, 70), "ph": (6.0, 7.0), "rain": (50, 100),
        "season": "Rabi (October - February)",
        "description": "Essential vegetable crop with strong market demand. Requires moderate climate and well-drained loamy soil."
    },
    "garlic": {
        "N": (80, 130), "P": (40, 70), "K": (60, 100),
        "temp": (12, 22), "hum": (45, 70), "ph": (6.0, 7.0), "rain": (40, 80),
        "season": "Rabi (October - February)",
        "description": "High-value bulb crop. Prefers cool weather during bulb development. Well-drained loamy soils produce best quality."
    },
    # ── Fruits ───────────────────────────────────────────
    "banana": {
        "N": (100, 200), "P": (50, 100), "K": (80, 150),
        "temp": (22, 35), "hum": (65, 90), "ph": (5.5, 7.0), "rain": (100, 250),
        "season": "Year-round (tropical)",
        "description": "High-value fruit crop suited for tropical and subtropical regions. Requires well-drained fertile soil and high humidity."
    },
    "mango": {
        "N": (60, 120), "P": (30, 60), "K": (50, 100),
        "temp": (24, 40), "hum": (50, 80), "ph": (5.5, 7.5), "rain": (75, 200),
        "season": "Summer (March - June)",
        "description": "King of fruits — requires distinct dry and wet seasons. Deep, well-drained alluvial or loamy soils are ideal."
    },
}

# ──────────────────────────────────────────────────────────
#  Season labels for classification (optional second task)
# ──────────────────────────────────────────────────────────
SEASON_MAP = {
    "rice":      "Kharif",
    "wheat":     "Rabi",
    "maize":     "Dual",
    "barley":    "Rabi",
    "sorghum":   "Kharif",
    "chickpea":  "Rabi",
    "lentil":    "Rabi",
    "moong":     "Kharif",
    "pigeonpea": "Kharif",
    "mustard":   "Rabi",
    "soybean":   "Kharif",
    "groundnut": "Kharif",
    "sunflower": "Dual",
    "cotton":    "Kharif",
    "sugarcane": "Annual",
    "jute":      "Kharif",
    "potato":    "Rabi",
    "tomato":    "Annual",
    "onion":     "Rabi",
    "garlic":    "Rabi",
    "banana":    "Annual",
    "mango":     "Annual",
}


# ──────────────────────────────────────────────────────────
#  Data Generation
# ──────────────────────────────────────────────────────────
def generate_training_data(n_samples: int = 6600) -> pd.DataFrame:
    """
    Generates high-fidelity synthetic agronomic dataset.
    n_samples is distributed equally across all 22 crops.
    Uses multiple noise levels to simulate real-world variability.
    """
    np.random.seed(42)
    n_crops = len(CROPS_CONFIG)
    spc = n_samples // n_crops          # samples per crop
    data = []

    for crop, params in CROPS_CONFIG.items():
        # Core samples — tight distribution around optimal range
        for _ in range(int(spc * 0.70)):
            row = {
                "N":           np.random.uniform(*params["N"]),
                "P":           np.random.uniform(*params["P"]),
                "K":           np.random.uniform(*params["K"]),
                "temperature": np.random.uniform(*params["temp"]),
                "humidity":    np.random.uniform(*params["hum"]),
                "ph":          np.random.uniform(*params["ph"]),
                "rainfall":    np.random.uniform(*params["rain"]),
                "label":       crop,
                "season":      SEASON_MAP[crop],
            }
            data.append(row)

        # Edge-case samples — near boundaries (harder examples for model)
        for _ in range(int(spc * 0.20)):
            row = {}
            for feat, key in [("N","N"),("P","P"),("K","K"),("temperature","temp"),
                               ("humidity","hum"),("ph","ph"),("rainfall","rain")]:
                lo, hi = params[key]
                boundary = lo if np.random.random() < 0.5 else hi
                noise = np.random.uniform(-0.05, 0.05) * (hi - lo)
                row[feat] = np.clip(boundary + noise, lo * 0.85, hi * 1.15)
            row["label"]  = crop
            row["season"] = SEASON_MAP[crop]
            data.append(row)

        # Slight-out-of-range samples (model must still learn, but with lower confidence)
        for _ in range(int(spc * 0.10)):
            row = {}
            for feat, key in [("N","N"),("P","P"),("K","K"),("temperature","temp"),
                               ("humidity","hum"),("ph","ph"),("rainfall","rain")]:
                lo, hi = params[key]
                span = hi - lo
                row[feat] = np.random.uniform(max(0, lo - span * 0.10), hi + span * 0.10)
            row["label"]  = crop
            row["season"] = SEASON_MAP[crop]
            data.append(row)

    df = pd.DataFrame(data)
    df = shuffle(df, random_state=42).reset_index(drop=True)
    print(f"   Dataset size : {len(df):,} samples")
    print(f"   Crops        : {df['label'].nunique()} ({', '.join(sorted(df['label'].unique()))})")
    print(f"   Seasons      : {df['season'].nunique()} ({', '.join(sorted(df['season'].unique()))})")
    return df


# ──────────────────────────────────────────────────────────
#  Model Training
# ──────────────────────────────────────────────────────────
def train_model():
    print("=" * 65)
    print("  AgriSmart — Crop Recommendation Model Training")
    print("  22 Crops | 6600+ Samples | Ensemble Classifier")
    print("=" * 65)

    # ── Generate data ──────────────────────────────────────
    print("\n[DATA] Generating training data…")
    df = generate_training_data(6600)

    features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X = df[features].values.astype(np.float32)
    y = df["label"].values

    # ── Encode labels ──────────────────────────────────────
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    print(f"   Classes ({len(le.classes_)}): {list(le.classes_)}")

    # ── Train / test split ─────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.20, random_state=42, stratify=y_enc
    )
    print(f"   Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    # ── Train Random Forest ────────────────────────────────
    print("\n[TRAIN] Training Random Forest Classifier…")
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=4,
        min_samples_leaf=2,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    rf_acc = accuracy_score(y_test, rf.predict(X_test))
    print(f"   RF Accuracy : {rf_acc*100:.2f}%")

    # ── Train Gradient Boosting ────────────────────────────
    print("[TRAIN] Training Gradient Boosting Classifier…")
    gb = GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.1,
        max_depth=8,
        min_samples_split=4,
        subsample=0.85,
        random_state=42,
    )
    gb.fit(X_train, y_train)
    gb_acc = accuracy_score(y_test, gb.predict(X_test))
    print(f"   GB Accuracy : {gb_acc*100:.2f}%")

    # ── Ensemble (soft voting) ─────────────────────────────
    print("[TRAIN] Building Ensemble (soft voting)…")
    ensemble = VotingClassifier(
        estimators=[("rf", rf), ("gb", gb)],
        voting="soft",
        weights=[2, 1],          # RF has higher weight
        n_jobs=-1,
    )
    ensemble.fit(X_train, y_train)

    # ── Evaluate ───────────────────────────────────────────
    y_pred   = ensemble.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n{'='*65}")
    print(f"  ✅ Ensemble Accuracy : {accuracy * 100:.2f}%")
    print(f"{'='*65}")
    print("\n[REPORT] Per-class Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_, zero_division=0))

    # ── Cross-validation (5-fold) ──────────────────────────
    print("[CV] Running 5-fold cross-validation on Random Forest…")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf, X, y_enc, cv=skf, scoring="accuracy", n_jobs=-1)
    print(f"   CV Accuracy : {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")

    # ── Feature importance ─────────────────────────────────
    importances = dict(zip(features, rf.feature_importances_))
    print("\n[FEATURES] Importance (Random Forest):")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        bar = "█" * int(imp * 60)
        print(f"   {feat:15s}: {imp:.4f}  {bar}")

    # ── Save model ─────────────────────────────────────────
    print(f"\n[SAVE] Saving ensemble model → {MODEL_PATH}")
    joblib.dump(ensemble, MODEL_PATH, compress=3)
    joblib.dump(le, ENCODER_PATH)

    # ── Save metadata ──────────────────────────────────────
    metadata = {
        "model_type":         "VotingClassifier (RandomForest + GradientBoosting)",
        "n_estimators_rf":    200,
        "n_estimators_gb":    150,
        "accuracy":           round(accuracy, 4),
        "cv_accuracy":        round(cv_scores.mean(), 4),
        "cv_std":             round(cv_scores.std(), 4),
        "features":           features,
        "classes":            list(le.classes_),
        "n_classes":          len(le.classes_),
        "crops_config":       {
            crop: {
                "season":      CROPS_CONFIG[crop]["season"],
                "description": CROPS_CONFIG[crop]["description"],
            }
            for crop in le.classes_
        },
        "feature_importance": {k: round(v, 4) for k, v in importances.items()},
        "training_samples":   len(X_train),
        "test_samples":       len(X_test),
        "total_samples":      len(df),
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print("[DONE] Model + metadata saved successfully.")
    return ensemble, le


# ──────────────────────────────────────────────────────────
#  Inference helper
# ──────────────────────────────────────────────────────────
def predict(model, le, nitrogen, phosphorus, potassium,
            temperature, humidity, ph, rainfall):
    X = np.array([[nitrogen, phosphorus, potassium,
                   temperature, humidity, ph, rainfall]], dtype=np.float32)
    proba       = model.predict_proba(X)[0]
    top_indices = np.argsort(proba)[::-1][:5]
    return [
        {"crop": le.classes_[i], "confidence": round(proba[i] * 100, 1)}
        for i in top_indices
    ]


# ──────────────────────────────────────────────────────────
#  Entry point
# ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    model, le = train_model()

    print("\n" + "=" * 65)
    print("  Test Predictions")
    print("=" * 65)

    test_cases = [
        {"label": "Rice field  ", "n": 90,  "p": 48, "k": 40, "t": 28, "h": 82, "ph": 6.5, "r": 200},
        {"label": "Wheat field ", "n": 110, "p": 55, "k": 32, "t": 18, "h": 55, "ph": 7.0, "r": 80},
        {"label": "Cotton farm ", "n": 120, "p": 45, "k": 50, "t": 30, "h": 55, "ph": 7.2, "r": 70},
        {"label": "Banana crop ", "n": 150, "p": 70, "k": 120,"t": 28, "h": 80, "ph": 6.2, "r": 180},
        {"label": "Mustard area", "n": 55,  "p": 35, "k": 20, "t": 18, "h": 45, "ph": 6.8, "r": 55},
    ]
    for tc in test_cases:
        results = predict(model, le, tc["n"], tc["p"], tc["k"], tc["t"], tc["h"], tc["ph"], tc["r"])
        top3 = ", ".join(f"{r['crop']} ({r['confidence']}%)" for r in results[:3])
        print(f"\n  {tc['label']} →  {top3}")

    print("\n✅ Training complete! Model is ready for AgriSmart backend.\n")
