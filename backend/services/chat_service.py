"""
Chat Service - Uses OpenAI API for real AI-powered farming assistance.
Always uses the API for actual intelligent responses.
"""
import traceback
from config import get_settings
from typing import Optional

settings = get_settings()


async def generate_chat_response(
    message: str,
    language: str = "en",
    context: Optional[str] = None,
    user_id: Optional[str] = None
) -> dict:
    """Generate a real AI response using OpenAI API."""

    intent = classify_intent(message)

    if not settings.OPENAI_API_KEY or not settings.OPENAI_API_KEY.strip():
        return {
            "response": "OpenAI API key is not configured. Please set OPENAI_API_KEY in the .env file to enable AI assistance.",
            "category": "error",
            "language": language,
            "suggestions": ["Configure OpenAI API key", "Check .env file"]
        }

    try:
        import openai
        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        lang_instruction = {
            "en": "Respond entirely in English.",
            "hi": "Respond entirely in Hindi (हिन्दी). Use Devanagari script only. Do NOT mix English.",
            "pa": "Respond entirely in Punjabi (ਪੰਜਾਬੀ). Use Gurmukhi script only. Do NOT mix English.",
            "mr": "Respond entirely in Marathi (मराठी). Use Devanagari script only.",
            "ta": "Respond entirely in Tamil (தமிழ்).",
            "te": "Respond entirely in Telugu (తెలుగు).",
            "bn": "Respond entirely in Bengali (বাংলা).",
        }.get(language, "Respond in English.")

        system_prompt = f"""You are Kisan AI, an expert agricultural assistant built for Indian farmers.

LANGUAGE: {lang_instruction}

YOUR ROLE:
- You are a knowledgeable farming expert for India
- Provide practical, actionable farming advice
- Reference Indian government schemes (PM-KISAN, KCC, PMFBY, etc.) when relevant
- Use Indian context: seasons (Kharif/Rabi/Zaid), crops, soil types, climate zones
- Reference Indian brands of pesticides, fertilizers when recommending products
- Mention MSP rates, mandi prices, APMC, e-NAM when discussing markets
- Be warm, supportive, and use farmer-friendly simple language

FORMATTING:
- Use bullet points and clear sections
- Keep responses concise but informative (max 400 words)
- Include specific quantities, timings, and dosages when applicable

You can help with:
- Crop recommendations based on soil, climate, and season
- Plant disease identification and treatment
- Weather-based farming decisions
- Market prices, MSP, and selling strategies
- Government schemes, subsidies, and loans
- Soil health, fertilizer management, irrigation
- Organic farming, IPM, and sustainable practices
- Livestock and dairy management
- Post-harvest storage and processing"""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        ai_response = response.choices[0].message.content

        return {
            "response": ai_response,
            "category": intent,
            "language": language,
            "suggestions": get_suggestions(intent, language)
        }

    except Exception as e:
        print(f"[ERROR] Chat API failed: {e}")
        traceback.print_exc()
        return {
            "response": f"I'm sorry, I encountered an error processing your request. Please try again. Error: {str(e)}",
            "category": "error",
            "language": language,
            "suggestions": ["Try again", "Ask a different question"]
        }


INTENT_KEYWORDS = {
    "crop_recommendation": ["crop", "grow", "plant", "cultivate", "sow", "harvest", "farming", "seed", "fasal"],
    "disease": ["disease", "pest", "infection", "yellow", "spot", "wilt", "blight", "rot", "fungus", "insect", "rog"],
    "weather": ["weather", "rain", "temperature", "climate", "forecast", "monsoon", "drought", "mausam"],
    "government_policy": ["scheme", "policy", "government", "subsidy", "loan", "insurance", "pm-kisan", "credit", "kcc", "yojana", "sarkari"],
    "soil": ["soil", "ph", "nitrogen", "phosphorus", "potassium", "fertility", "organic", "fertilizer", "mitti", "khad"],
    "market": ["price", "market", "sell", "mandi", "rate", "cost", "msp", "bazaar"],
    "irrigation": ["water", "irrigation", "drip", "sprinkler", "moisture", "sinchai", "paani"],
}


def classify_intent(message: str) -> str:
    message_lower = message.lower()
    scores = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in message_lower)
        if score > 0:
            scores[intent] = score
    if scores:
        return max(scores, key=scores.get)
    return "general"


def get_suggestions(intent: str, language: str = "en") -> list:
    if language == "hi":
        suggestions_map = {
            "crop_recommendation": ["मेरे खेत के लिए कौन सी फसल अच्छी है?", "गेहूं कब बोना चाहिए?", "खरीफ की फसलें बताएं"],
            "disease": ["पत्तों पर पीले धब्बे का इलाज", "जैविक कीट नियंत्रण", "गेहूं के रोग"],
            "government_policy": ["PM-KISAN के लिए कैसे आवेदन करें?", "फसल बीमा योजना", "KCC लोन ब्याज दर"],
            "soil": ["मिट्टी की उर्वरता कैसे बढ़ाएं?", "चावल के लिए खाद", "जैविक खाद"],
            "weather": ["इस हफ्ते बारिश होगी?", "पाला से बचाव", "मानसून कब आएगा?"],
            "market": ["गेहूं का भाव", "MSP दर", "मंडी में कब बेचें"],
        }
    else:
        suggestions_map = {
            "crop_recommendation": ["What crops grow best in summer?", "Recommend crops for clay soil", "Best Kharif season crops"],
            "disease": ["How to treat leaf blight?", "Organic pest control methods", "Common wheat diseases"],
            "government_policy": ["How to apply for PM-KISAN?", "Crop insurance schemes", "KCC loan interest rate"],
            "soil": ["How to improve soil fertility?", "Best fertilizers for rice", "Organic soil amendments"],
            "weather": ["Rain forecast for this week", "Frost protection tips", "When will monsoon arrive?"],
            "market": ["Current wheat prices", "Best time to sell cotton", "Nearby mandi rates"],
            "irrigation": ["Drip irrigation cost", "Irrigation schedule for wheat", "Government irrigation subsidies"],
        }
    return suggestions_map.get(intent, ["What crop should I grow?", "Government schemes for farmers", "How to detect plant diseases?"])
