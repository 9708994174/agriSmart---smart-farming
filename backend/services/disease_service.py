"""
Plant Disease Detection Service
Uses YOLOv8 (Ultralytics) model for local on-device inference when model is available.
Falls back to Groq AI (Llama 4 Scout Vision) for analysis when model is not trained.
"""
import io
import os
import json
import base64
import traceback
import numpy as np
from PIL import Image
from config import get_settings

settings = get_settings()

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
        print(f"[WARN] Disease model not found at {MODEL_PATH}. Using Groq AI fallback.")

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
    Uses local YOLOv8 model when available, otherwise uses Groq AI vision.
    """
    model = _get_model()

    if model is None:
        return await _groq_ai_detection(image_bytes)

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
        return await _groq_ai_detection(image_bytes)


async def _groq_ai_detection(image_bytes: bytes) -> dict:
    """
    Use Groq AI (Llama 4 Scout Vision) for plant disease detection
    when the local YOLOv8 model is not available.
    """
    if not settings.GROQ_API_KEY or not settings.GROQ_API_KEY.strip():
        # If no API key, use the basic color analysis fallback
        return _basic_fallback_detection(image_bytes)

    try:
        from groq import Groq

        client = Groq(api_key=settings.GROQ_API_KEY)

        # Resize image to reduce base64 payload size
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image.thumbnail((512, 512), Image.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=80)
        compressed_bytes = buffer.getvalue()

        image_b64 = base64.b64encode(compressed_bytes).decode("utf-8")
        image_url = f"data:image/jpeg;base64,{image_b64}"

        analysis_prompt = """You are an expert plant pathologist specializing in Indian agriculture.
Analyze this plant leaf image and respond STRICTLY in this JSON format ONLY (no markdown, no extra text):

{
  "disease_name": "Name of the disease or 'Healthy Plant'",
  "confidence": 75,
  "crop_type": "Name of the crop plant",
  "description": "Detailed description of the disease, symptoms visible, and severity",
  "treatment": ["Treatment step 1 with specific pesticide/fertilizer names and dosages", "Treatment step 2", "Treatment step 3"],
  "pesticide": ["Specific pesticide name 1", "Specific pesticide name 2"],
  "prevention": ["Prevention tip 1", "Prevention tip 2", "Prevention tip 3"]
}

IMPORTANT:
- Use Indian brands/products when recommending pesticides (e.g., Dithane M-45, Ridomil Gold, Tilt, Kavach)
- Include specific dosages (g/L or ml/L)
- confidence should be a number between 50-90
- If the plant looks healthy, set disease_name to "Healthy Plant" and confidence to 85+
- Respond with ONLY the JSON object, nothing else"""

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": analysis_prompt},
                        {"type": "image_url", "image_url": {"url": image_url}}
                    ]
                }
            ],
            max_tokens=800,
            temperature=0.3,
        )

        ai_text = response.choices[0].message.content.strip()

        # Parse AI JSON response
        result = _parse_ai_response(ai_text)
        result["analysis_method"] = "Groq AI Vision (Llama 4 Scout)"
        return result

    except Exception as e:
        print(f"[ERROR] Groq AI disease detection failed: {e}")
        traceback.print_exc()
        # Final fallback: basic color analysis
        return _basic_fallback_detection(image_bytes)


def _parse_ai_response(ai_text: str) -> dict:
    """Parse the AI response JSON, handling potential formatting issues."""
    import re

    # Try to extract JSON from the response
    # Sometimes the model wraps it in markdown code blocks
    json_match = re.search(r'\{[\s\S]*\}', ai_text)
    if json_match:
        try:
            data = json.loads(json_match.group())
            return {
                "disease_name": data.get("disease_name", "Unknown Disease"),
                "confidence": min(max(int(data.get("confidence", 65)), 0), 99),
                "crop_type": data.get("crop_type", "Unknown"),
                "description": data.get("description", "AI analysis completed."),
                "treatment": data.get("treatment", []) if isinstance(data.get("treatment"), list) else [str(data.get("treatment", ""))],
                "pesticide": data.get("pesticide", []) if isinstance(data.get("pesticide"), list) else [],
                "prevention": data.get("prevention", []) if isinstance(data.get("prevention"), list) else [],
                "alternatives": [],
            }
        except json.JSONDecodeError:
            pass

    # If JSON parsing fails, create a structured response from the text
    return {
        "disease_name": "AI Analysis Result",
        "confidence": 60,
        "crop_type": "Unknown",
        "description": ai_text[:500],
        "treatment": ["Please consult a local agricultural expert for specific treatment."],
        "pesticide": [],
        "prevention": ["Monitor crops regularly", "Maintain proper plant spacing"],
        "alternatives": [],
    }


def _basic_fallback_detection(image_bytes: bytes) -> dict:
    """
    Basic color analysis fallback when neither the ML model nor AI API is available.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_resized = image.resize((256, 256), Image.LANCZOS)
        img_array = np.array(image_resized).astype(np.float32)

        r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]
        total = r + g + b + 1e-6
        green_ratio = np.mean(g / total)
        brown_mask = (r > 120) & (g < 110) & (b < 90) & (r > g * 1.25)
        brown_ratio = np.sum(brown_mask) / (256 * 256)
        yellow_mask = (r > 150) & (g > 130) & (b < 100) & (r > b * 1.8)
        yellow_ratio = np.sum(yellow_mask) / (256 * 256)

        NOTE = (
            "This result is based on basic color analysis. "
            "For accurate diagnosis, ensure your Groq API key is configured "
            "or train the YOLOv8 model using the PlantVillage dataset."
        )

        if brown_ratio > 0.15:
            return {
                "disease_name": "Leaf Blight / Spot (Suspected)",
                "confidence": round(min(brown_ratio * 200, 70), 1),
                "crop_type": "Unknown",
                "description": f"Brown lesions detected on leaf. {NOTE}",
                "treatment": ["Apply Mancozeb 75% WP (Dithane M-45) at 2.5g/L water"],
                "pesticide": ["Mancozeb 75% WP"],
                "prevention": ["Practice crop rotation", "Remove infected leaves"],
                "analysis_method": "Basic Color Analysis (configure AI for better results)",
            }
        elif yellow_ratio > 0.15:
            return {
                "disease_name": "Chlorosis / Nutrient Deficiency (Suspected)",
                "confidence": round(min(yellow_ratio * 200, 65), 1),
                "crop_type": "Unknown",
                "description": f"Yellowing detected on leaf. {NOTE}",
                "treatment": ["Check soil pH", "Apply micronutrient spray"],
                "pesticide": [],
                "prevention": ["Regular soil testing", "Balanced fertilization"],
                "analysis_method": "Basic Color Analysis (configure AI for better results)",
            }
        elif green_ratio > 0.38:
            return {
                "disease_name": "Healthy Plant",
                "confidence": round(min(green_ratio * 140, 80), 1),
                "crop_type": "Unknown",
                "description": f"Plant appears healthy. {NOTE}",
                "treatment": ["No treatment needed — plant appears healthy!"],
                "pesticide": [],
                "prevention": ["Continue regular care and monitoring"],
                "analysis_method": "Basic Color Analysis (configure AI for better results)",
            }
        else:
            return {
                "disease_name": "Analysis Inconclusive",
                "confidence": 25,
                "crop_type": "Unknown",
                "description": f"Unable to determine disease from image. {NOTE}",
                "treatment": ["Upload a clearer photo of the affected leaf in natural light"],
                "pesticide": [],
                "prevention": ["Take close-up photos in good lighting"],
                "analysis_method": "Basic Color Analysis (configure AI for better results)",
            }

    except Exception as e:
        print(f"[ERROR] Basic fallback detection failed: {e}")
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
