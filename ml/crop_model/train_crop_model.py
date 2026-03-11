"""
Crop Recommendation Model Training Script
Uses Random Forest Classifier on agricultural dataset

Dataset: Crop Recommendation Dataset (Kaggle)
Features: N, P, K, temperature, humidity, ph, rainfall
Target: crop label
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib
import os
import json

# ─── Configuration ───
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "crop_model.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

# ─── Generate synthetic training data ───
# In production, replace with real dataset: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset
def generate_training_data(n_samples=2200):
    """Generate synthetic crop recommendation dataset"""
    np.random.seed(42)

    crops_config = {
        "rice":       {"N": (60, 120), "P": (30, 70),  "K": (30, 60),  "temp": (20, 35), "hum": (60, 95), "ph": (5.5, 7.0), "rain": (150, 300)},
        "wheat":      {"N": (80, 150), "P": (40, 80),  "K": (20, 50),  "temp": (10, 25), "hum": (40, 70), "ph": (6.0, 7.5), "rain": (50, 120)},
        "maize":      {"N": (60, 140), "P": (30, 60),  "K": (20, 50),  "temp": (18, 32), "hum": (50, 80), "ph": (5.5, 7.5), "rain": (60, 150)},
        "cotton":     {"N": (90, 150), "P": (30, 60),  "K": (30, 60),  "temp": (25, 38), "hum": (40, 70), "ph": (6.0, 8.0), "rain": (50, 120)},
        "sugarcane":  {"N": (100, 180),"P": (40, 80),  "K": (50, 100), "temp": (20, 35), "hum": (60, 90), "ph": (6.0, 8.0), "rain": (100, 200)},
        "mustard":    {"N": (40, 80),  "P": (20, 50),  "K": (10, 30),  "temp": (10, 25), "hum": (30, 60), "ph": (6.0, 7.5), "rain": (30, 80)},
        "chickpea":   {"N": (20, 50),  "P": (40, 80),  "K": (15, 40),  "temp": (15, 30), "hum": (30, 60), "ph": (6.0, 8.0), "rain": (40, 100)},
        "soybean":    {"N": (20, 50),  "P": (40, 80),  "K": (20, 50),  "temp": (20, 32), "hum": (50, 80), "ph": (6.0, 7.5), "rain": (60, 150)},
        "groundnut":  {"N": (15, 40),  "P": (30, 60),  "K": (30, 70),  "temp": (22, 35), "hum": (50, 80), "ph": (5.5, 7.0), "rain": (50, 130)},
        "potato":     {"N": (80, 150), "P": (40, 80),  "K": (60, 120), "temp": (12, 22), "hum": (60, 85), "ph": (5.0, 6.5), "rain": (50, 100)},
        "tomato":     {"N": (80, 130), "P": (50, 80),  "K": (50, 100), "temp": (18, 30), "hum": (50, 80), "ph": (6.0, 7.0), "rain": (40, 100)},
    }

    data = []
    samples_per_crop = n_samples // len(crops_config)

    for crop, params in crops_config.items():
        for _ in range(samples_per_crop):
            row = {
                "N": np.random.uniform(*params["N"]),
                "P": np.random.uniform(*params["P"]),
                "K": np.random.uniform(*params["K"]),
                "temperature": np.random.uniform(*params["temp"]),
                "humidity": np.random.uniform(*params["hum"]),
                "ph": np.random.uniform(*params["ph"]),
                "rainfall": np.random.uniform(*params["rain"]),
                "label": crop
            }
            data.append(row)

    return pd.DataFrame(data)


def train_model():
    """Train the Random Forest crop recommendation model"""
    print("=" * 60)
    print("  AgriSmart - Crop Recommendation Model Training")
    print("=" * 60)

    # Generate/load data
    print("\n[DATA] Generating training data...")
    df = generate_training_data(2200)
    print(f"   Dataset size: {len(df)} samples, {df['label'].nunique()} crops")

    # Prepare features and labels
    features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X = df[features].values
    y = df["label"].values

    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    print(f"   Classes: {list(le.classes_)}")

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    print(f"   Train: {len(X_train)} | Test: {len(X_test)}")

    # Train Random Forest
    print("\n[TRAIN] Training Random Forest Classifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n[RESULT] Model Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")
    print("\n[REPORT] Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Feature importance
    importances = dict(zip(features, model.feature_importances_))
    print("[FEATURES] Feature Importance:")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        print(f"   {feat:15s}: {imp:.4f} {'█' * int(imp * 50)}")

    # Save model
    print(f"\n[SAVE] Saving model to {MODEL_PATH}")
    joblib.dump(model, MODEL_PATH)
    joblib.dump(le, ENCODER_PATH)

    # Save metadata
    metadata = {
        "model_type": "RandomForestClassifier",
        "n_estimators": 100,
        "accuracy": round(accuracy, 4),
        "features": features,
        "classes": list(le.classes_),
        "feature_importance": {k: round(v, 4) for k, v in importances.items()},
        "training_samples": len(X_train),
        "test_samples": len(X_test),
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print("\n[DONE] Training complete!")
    return model, le


def predict(model, le, nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall):
    """Make a prediction with the trained model"""
    X = np.array([[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]])
    proba = model.predict_proba(X)[0]
    top_indices = np.argsort(proba)[::-1][:5]

    results = []
    for idx in top_indices:
        results.append({
            "crop": le.classes_[idx],
            "confidence": round(proba[idx] * 100, 1)
        })
    return results


if __name__ == "__main__":
    model, le = train_model()

    # Test prediction
    print("\n" + "=" * 60)
    print("  Test Prediction")
    print("=" * 60)
    test_input = {"nitrogen": 90, "phosphorus": 42, "potassium": 43,
                  "temperature": 25, "humidity": 82, "ph": 6.5, "rainfall": 200}
    print(f"\n   Input: {test_input}")
    results = predict(model, le, **test_input)
    print("\n   Top Recommendations:")
    for i, r in enumerate(results):
        print(f"   {i+1}. {r['crop']:15s} - {r['confidence']}% confidence")
