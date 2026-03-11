"""
Plant Disease Detection Service
Uses YOLOv8 (Ultralytics) model for local on-device inference when model is available.
Falls back to advanced multi-factor image analysis when model is not yet trained.
"""
import io
import os
import json
import traceback
import numpy as np
from PIL import Image

# ─── Model loading ───
_model = None
_classes = []
_disease_info = {}

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "disease_model")
MODEL_PATH = os.path.join(MODEL_DIR, "disease_model_yolo.pt")
CLASSES_PATH = os.path.join(MODEL_DIR, "disease_classes.json")
IMG_SIZE = 224


def _load_disease_info():
    """Load disease treatment/info database from training script"""
    global _disease_info
    try:
        import sys
        sys.path.insert(0, MODEL_DIR)
        from train_disease_model import DISEASE_INFO, HEALTHY_INFO
        _disease_info = DISEASE_INFO
        _disease_info["_healthy_"] = HEALTHY_INFO
    except Exception:
        _disease_info = {}


def _get_model():
    """Lazy-load the YOLOv8 model"""
    global _model, _classes

    if _model is not None:
        return _model

    if os.path.exists(CLASSES_PATH):
        with open(CLASSES_PATH, "r") as f:
            data = json.load(f)
            _classes = data.get("classes", [])

    _load_disease_info()

    if os.path.exists(MODEL_PATH):
        try:
            from ultralytics import YOLO
            _model = YOLO(MODEL_PATH)
            print(f"[INFO] Disease model loaded: {MODEL_PATH}")
            return _model
        except ImportError:
            print("[WARN] Ultralytics not installed.")
        except Exception as e:
            print(f"[ERROR] Failed to load model: {e}")
    else:
        print(f"[WARN] Disease model not found at {MODEL_PATH}. Using advanced fallback analysis.")

    return None


def _format_class_name(raw_class: str) -> dict:
    """Convert raw class name to human-readable disease name and crop type"""
    if raw_class in _disease_info:
        info = _disease_info[raw_class]
        return {
            "disease_name": info.get("disease_name", raw_class),
            "crop_type": info.get("crop_type", ""),
            "description": info.get("description", ""),
            "treatment": info.get("treatment", []),
            "pesticide": info.get("pesticide", []),
            "prevention": info.get("prevention", []),
        }

    if "healthy" in raw_class.lower():
        crop = raw_class.split("___")[0].replace("_", " ").replace("(", "").replace(")", "").strip()
        healthy_info = _disease_info.get("_healthy_", {})
        return {
            "disease_name": "Healthy Plant",
            "crop_type": crop,
            "description": healthy_info.get("description", f"The {crop} plant appears healthy with no signs of disease."),
            "treatment": healthy_info.get("treatment", ["No treatment needed — plant is healthy!"]),
            "pesticide": [],
            "prevention": healthy_info.get("prevention", [
                "Continue regular care and monitoring",
                "Maintain proper watering schedule",
                "Practice crop rotation"
            ]),
        }

    parts = raw_class.split("___")
    if len(parts) == 2:
        crop = parts[0].replace("_", " ").replace(",", ", ").strip()
        disease = parts[1].replace("_", " ").strip()
        return {
            "disease_name": disease,
            "crop_type": crop,
            "description": f"{disease} detected on {crop}.",
            "treatment": [f"Consult with a local agricultural expert for treatment of {disease} on {crop}."],
            "pesticide": [],
            "prevention": ["Practice crop rotation", "Ensure good drainage", "Monitor plants regularly"],
        }

    return {
        "disease_name": raw_class.replace("_", " "),
        "crop_type": "Unknown",
        "description": f"Disease class: {raw_class}",
        "treatment": ["Consult a plant pathologist for specific treatment."],
        "pesticide": [],
        "prevention": ["Monitor crops regularly for early detection"],
    }


async def detect_disease(image_bytes: bytes) -> dict:
    """
    Analyze plant leaf image for disease detection.
    Uses local YOLOv8 model when available, otherwise uses advanced image analysis.
    """
    model = _get_model()

    if model is None:
        return await _advanced_fallback_detection(image_bytes)

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = model(image, imgsz=IMG_SIZE, verbose=False)

        if results and len(results) > 0:
            result = results[0]
            probs = result.probs
            top_idx = probs.top1
            top_conf = float(probs.top1conf)

            if top_idx < len(_classes):
                class_name = _classes[top_idx]
            elif top_idx in result.names:
                class_name = result.names[top_idx]
            else:
                class_name = f"Class_{top_idx}"

            info = _format_class_name(class_name)

            top5_indices = probs.top5
            top5_confs = probs.top5conf.tolist()
            alternatives = []
            for idx, conf in zip(top5_indices[1:4], top5_confs[1:4]):
                alt_name = _classes[idx] if idx < len(_classes) else f"Class_{idx}"
                alt_info = _format_class_name(alt_name)
                alternatives.append({
                    "name": alt_info["disease_name"],
                    "confidence": round(conf * 100, 1)
                })

            return {
                "disease_name": info["disease_name"],
                "confidence": round(min(top_conf * 100, 99), 1),
                "crop_type": info["crop_type"],
                "description": info["description"],
                "treatment": info["treatment"],
                "pesticide": info["pesticide"],
                "prevention": info["prevention"],
                "alternatives": alternatives,
                "analysis_method": "YOLOv8 On-Device ML Model",
                "raw_class": class_name,
            }

        return {
            "disease_name": "Unrecognized",
            "confidence": 0,
            "crop_type": "Unknown",
            "description": "Could not classify the image. Please upload a clear photo of a plant leaf.",
            "treatment": [],
            "pesticide": [],
            "prevention": ["Ensure good lighting and a clear photo of the leaf"],
            "analysis_method": "YOLOv8 (no prediction)",
        }

    except Exception as e:
        print(f"[ERROR] YOLOv8 inference failed: {e}")
        traceback.print_exc()
        return await _advanced_fallback_detection(image_bytes)


async def _advanced_fallback_detection(image_bytes: bytes) -> dict:
    """
    Advanced multi-factor image analysis when the trained ML model is unavailable.
    Analyzes: color distribution, spot patterns, texture variance, lesion detection.
    Returns clinically-relevant results based on visual symptom patterns.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Resize for consistent analysis
        image_resized = image.resize((256, 256), Image.LANCZOS)
        img_array = np.array(image_resized).astype(np.float32)

        r = img_array[:, :, 0]
        g = img_array[:, :, 1]
        b = img_array[:, :, 2]

        # ─── Color ratio analysis ───
        total = r + g + b + 1e-6
        green_ratio = np.mean(g / total)
        red_ratio = np.mean(r / total)
        blue_ratio = np.mean(b / total)

        avg_r = np.mean(r)
        avg_g = np.mean(g)
        avg_b = np.mean(b)

        # ─── Yellow detection (early blight, TYLCV, rust) ───
        # Yellow pixels: high R + high G, low B
        yellow_mask = (r > 150) & (g > 130) & (b < 100) & (r > b * 1.8)
        yellow_ratio = np.sum(yellow_mask) / (256 * 256)

        # ─── Brown/necrotic lesion detection (blight, leaf spot) ───
        # Brown: R dominant, medium G, low B
        brown_mask = (r > 120) & (g < 110) & (b < 90) & (r > g * 1.25)
        brown_ratio = np.sum(brown_mask) / (256 * 256)

        # ─── Dark spot detection (fungal diseases) ───
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        dark_mask = gray < 60
        dark_ratio = np.sum(dark_mask) / (256 * 256)

        # ─── White powdery region detection (powdery mildew) ───
        white_mask = (r > 200) & (g > 200) & (b > 200)
        white_ratio = np.sum(white_mask) / (256 * 256)

        # ─── Texture variance (healthy leaves are more uniform) ───
        gray_img = image_resized.convert("L")
        gray_arr = np.array(gray_img).astype(np.float32)
        local_variance = np.var(gray_arr)
        texture_score = min(local_variance / 1000.0, 1.0)

        # ─── Green health index ───
        # Chlorophyll index: (G - R) / (G + R + 1)
        chl_idx = np.mean((g - r) / (g + r + 1.0))

        # ─── Edge/spot density (lesions create sharp local edges) ───
        # Simple gradient magnitude
        grad_h = np.abs(np.diff(gray_arr, axis=0))
        grad_v = np.abs(np.diff(gray_arr, axis=1))
        edge_density = (np.mean(grad_h) + np.mean(grad_v)) / 2.0
        edge_score = min(edge_density / 15.0, 1.0)

        # ─── Decision logic ───
        MODEL_NOTE = (
            "⚠️ Note: The YOLOv8 ML model is not yet trained. "
            "This result is based on advanced image analysis (color, texture, lesion patterns). "
            "Train the model using the PlantVillage dataset for 95%+ accurate diagnosis."
        )

        # POWDERY MILDEW: white powdery coating
        if white_ratio > 0.15 and green_ratio < 0.38:
            return {
                "disease_name": "Powdery Mildew (Suspected)",
                "confidence": round(min(white_ratio * 250, 82), 1),
                "crop_type": "Unknown (image analysis)",
                "description": (
                    "White powdery patches detected on leaf surface — consistent with powdery mildew caused by "
                    "Erysiphales fungi. Affects many crops including wheat, tomato, squash, and cucurbits. " + MODEL_NOTE
                ),
                "treatment": [
                    "Apply Wettable Sulphur (Sulfex) at 3g/L water — effective organic option",
                    "Spray Karathane (Dinocap) 1ml/L for severe infections",
                    "Use Trifloxystrobin + Tebuconazole systemic fungicide",
                    "Remove and destroy heavily infected leaves immediately"
                ],
                "pesticide": ["Wettable Sulphur (Sulfex 80% WP)", "Dinocap (Karathane)", "Hexaconazole 5% EC"],
                "prevention": [
                    "Maintain adequate plant spacing for air circulation",
                    "Avoid overhead irrigation — use drip systems",
                    "Plant resistant varieties whenever available",
                    "Apply preventive sulphur sprays during humid weather"
                ],
                "analysis_method": "Advanced Image Analysis (ML model not trained)",
                "model_status": "pending_training"
            }

        # LATE BLIGHT: dark water-soaked lesions + high edge density
        if brown_ratio > 0.20 and dark_ratio > 0.08 and edge_score > 0.5:
            return {
                "disease_name": "Late Blight (Suspected)",
                "confidence": round(min((brown_ratio + dark_ratio) * 180, 85), 1),
                "crop_type": "Potato / Tomato (likely)",
                "description": (
                    "Dark water-soaked lesions with sharp necrotic borders detected — pattern consistent with "
                    "Late Blight caused by Phytophthora infestans. This is a highly destructive disease that "
                    "spreads rapidly in cool, wet conditions. " + MODEL_NOTE
                ),
                "treatment": [
                    "Apply Metalaxyl + Mancozeb (Ridomil Gold MZ) 2.5g/L immediately",
                    "Spray Cymoxanil + Mancozeb (Curzate) on affected areas",
                    "Destroy severely infected plants to stop further spread",
                    "Do not compost infected material"
                ],
                "pesticide": ["Metalaxyl + Mancozeb (Ridomil Gold MZ)", "Cymoxanil + Mancozeb (Curzate)", "Dimethomorph + Mancozeb"],
                "prevention": [
                    "Use certified blight-resistant varieties (Kufri Jyoti, Arka Rakshak)",
                    "Avoid overhead irrigation — keep foliage dry",
                    "Monitor daily during cool & wet weather (below 20°C + rain)",
                    "Apply preventive copper spray before monsoon season"
                ],
                "analysis_method": "Advanced Image Analysis (ML model not trained)",
                "model_status": "pending_training"
            }

        # EARLY BLIGHT / LEAF SPOT: brown concentric rings, moderate edge density
        if brown_ratio > 0.12 and edge_score > 0.35 and yellow_ratio < 0.10:
            return {
                "disease_name": "Early Blight / Leaf Spot (Suspected)",
                "confidence": round(min(brown_ratio * 220 + edge_score * 30, 80), 1),
                "crop_type": "Tomato / Potato (likely)",
                "description": (
                    "Brown lesions with defined borders detected — pattern consistent with Early Blight "
                    "(Alternaria solani) or related fungal leaf spot diseases. Typically appears on older, "
                    "lower leaves first and progresses upward. " + MODEL_NOTE
                ),
                "treatment": [
                    "Apply Mancozeb 75% WP (Dithane M-45) at 2.5g/L water",
                    "Spray Chlorothalonil (Kavach) 2g/L every 7-10 days",
                    "Remove infected lower leaves from the plant",
                    "Apply Azoxystrobin (Amistar) for severe infections"
                ],
                "pesticide": ["Mancozeb 75% WP (Dithane M-45)", "Chlorothalonil (Kavach)", "Azoxystrobin (Amistar)"],
                "prevention": [
                    "Stake tomato plants and maintain 60×45cm spacing",
                    "Use mulch to prevent soil splash onto leaves",
                    "Apply balanced NPK — avoid excess nitrogen",
                    "Practice 2-3 year crop rotation with non-solanaceous crops"
                ],
                "analysis_method": "Advanced Image Analysis (ML model not trained)",
                "model_status": "pending_training"
            }

        # YELLOWING / VIRAL DISEASE: prominent yellow regions
        if yellow_ratio > 0.20:
            return {
                "disease_name": "Chlorosis / Viral Disease (Suspected)",
                "confidence": round(min(yellow_ratio * 200, 78), 1),
                "crop_type": "Unknown (image analysis)",
                "description": (
                    "Significant yellowing (chlorosis) detected across leaf surface — may indicate "
                    "nutrient deficiency (iron, nitrogen, magnesium), or viral infections such as "
                    "Tomato Yellow Leaf Curl Virus (TYLCV) or mosaic viruses spread by whiteflies/aphids. " + MODEL_NOTE
                ),
                "treatment": [
                    "Check soil pH (ideal 6.0–7.0) and apply micronutrients if deficient",
                    "Apply Ferrous Sulphate (FeSO₄) 0.5% spray for iron deficiency",
                    "Control vector insects: spray Imidacloprid (Confidor) 0.5ml/L for whiteflies",
                    "Remove and destroy virus-infected plants to prevent spread"
                ],
                "pesticide": ["Imidacloprid (Confidor) for vector control", "Ferrous Sulphate 0.5% for iron deficiency"],
                "prevention": [
                    "Use TYLCV/virus-resistant varieties (Arka Ananya, TH-1)",
                    "Monitor whitefly/aphid populations with yellow sticky traps",
                    "Maintain balanced soil nutrition with regular soil testing",
                    "Remove weeds that harbour virus vectors"
                ],
                "analysis_method": "Advanced Image Analysis (ML model not trained)",
                "model_status": "pending_training"
            }

        # RUST DISEASE: rust-colored pustules (reddish-orange with edge spores)
        if red_ratio > 0.36 and texture_score > 0.4 and green_ratio < 0.35:
            return {
                "disease_name": "Rust Disease (Suspected)",
                "confidence": round(min(red_ratio * 160 + texture_score * 40, 76), 1),
                "crop_type": "Wheat / Corn / Legume (likely)",
                "description": (
                    "Reddish-orange coloration with high surface texture detected — consistent with rust "
                    "diseases caused by Puccinia species. Small pustules rupture to release powdery rust-colored "
                    "spores on leaf surfaces. Common in wheat, corn, soybean, and beans. " + MODEL_NOTE
                ),
                "treatment": [
                    "Apply Propiconazole (Tilt 25% EC) at 1ml/L — most effective rust fungicide",
                    "Spray Mancozeb 75% WP at 2.5g/L as protective cover",
                    "Apply Tebuconazole for systemic control in severe cases",
                    "Spray at first pustule appearance for best results"
                ],
                "pesticide": ["Propiconazole (Tilt 25% EC)", "Mancozeb 75% WP", "Tebuconazole 250 EC"],
                "prevention": [
                    "Plant rust-resistant crop varieties",
                    "Early sowing to avoid peak rust season",
                    "Monitor regularly during warm humid weather",
                    "Avoid dense planting — ensure air circulation"
                ],
                "analysis_method": "Advanced Image Analysis (ML model not trained)",
                "model_status": "pending_training"
            }

        # HEALTHY: good green, normal texture, no disease indicators
        if green_ratio > 0.38 and chl_idx > 0.05 and brown_ratio < 0.08 and yellow_ratio < 0.10:
            confidence = round(min(green_ratio * 140 + chl_idx * 60, 90), 1)
            return {
                "disease_name": "Healthy Plant",
                "confidence": confidence,
                "crop_type": "Unknown (image analysis)",
                "description": (
                    "The leaf appears healthy — good green coloration, normal chlorophyll index, and no visible "
                    "lesions or discoloration patterns detected. Continue regular care and monitoring. " + MODEL_NOTE
                ),
                "treatment": ["No treatment needed — plant appears healthy!"],
                "pesticide": [],
                "prevention": [
                    "Continue regular watering and fertilization schedule",
                    "Monitor regularly for early signs of disease",
                    "Maintain proper plant spacing for air circulation",
                    "Practice crop rotation to prevent soil-borne diseases"
                ],
                "analysis_method": "Advanced Image Analysis (ML model not trained)",
                "model_status": "pending_training"
            }

        # INCONCLUSIVE: mixed signals
        dominant = "yellow-brown" if (yellow_ratio + brown_ratio) > 0.15 else "unclear"
        return {
            "disease_name": "Analysis Inconclusive — Upload Clearer Image",
            "confidence": 25,
            "crop_type": "Unknown",
            "description": (
                f"Image analysis returned mixed signals (dominant color: {dominant}). "
                "For accurate results, please upload a clear, close-up photo of a plant leaf in good lighting. " + MODEL_NOTE
            ),
            "treatment": [
                "Upload a close-up photo of the affected leaf in natural daylight",
                "Ensure the leaf fills most of the frame",
                "Avoid harsh shadows or reflections"
            ],
            "pesticide": [],
            "prevention": [
                "Take photos in natural daylight for best accuracy",
                "Include both healthy and affected portions of the leaf",
                "Use a plain background if possible"
            ],
            "analysis_method": "Advanced Image Analysis (ML model not trained)",
            "model_status": "pending_training"
        }

    except Exception as e:
        print(f"[ERROR] Advanced fallback detection failed: {e}")
        traceback.print_exc()
        return {
            "disease_name": "Analysis Error",
            "confidence": 0,
            "crop_type": "Unknown",
            "description": f"Image analysis failed: {str(e)}. Please try again with a clear leaf photo.",
            "treatment": ["Please try uploading a clearer image of the affected leaf."],
            "pesticide": [],
            "prevention": ["Take close-up photos in good lighting for better results."],
            "analysis_method": "Error — see description"
        }
