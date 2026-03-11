"""
Market Price Service - Real Commodity Data Integration
Fetches from data.gov.in API and Agmarknet for Indian agriculture markets.
Falls back to official MSP data published by Government of India.
"""
import httpx
from datetime import datetime
from typing import Optional
from config import get_settings

settings = get_settings()


# Official MSP (Minimum Support Price) data for 2024-25
# Source: Commission for Agricultural Costs and Prices (CACP), Government of India
MSP_DATA = {
    "rice": {"msp": 2300, "unit": "quintal", "season": "Kharif", "category": "Cereal"},
    "wheat": {"msp": 2275, "unit": "quintal", "season": "Rabi", "category": "Cereal"},
    "maize": {"msp": 2090, "unit": "quintal", "season": "Kharif", "category": "Cereal"},
    "cotton": {"msp": 7121, "unit": "quintal", "season": "Kharif", "category": "Commercial"},
    "soybean": {"msp": 4892, "unit": "quintal", "season": "Kharif", "category": "Oilseed"},
    "mustard": {"msp": 5650, "unit": "quintal", "season": "Rabi", "category": "Oilseed"},
    "chickpea": {"msp": 5440, "unit": "quintal", "season": "Rabi", "category": "Pulse"},
    "sugarcane": {"msp": 315, "unit": "quintal", "season": "Annual", "category": "Commercial"},
    "groundnut": {"msp": 6377, "unit": "quintal", "season": "Kharif", "category": "Oilseed"},
    "moong": {"msp": 8558, "unit": "quintal", "season": "Kharif", "category": "Pulse"},
    "urad": {"msp": 6950, "unit": "quintal", "season": "Kharif", "category": "Pulse"},
    "tur": {"msp": 7000, "unit": "quintal", "season": "Kharif", "category": "Pulse"},
    "barley": {"msp": 1850, "unit": "quintal", "season": "Rabi", "category": "Cereal"},
    "jowar": {"msp": 3180, "unit": "quintal", "season": "Kharif", "category": "Cereal"},
    "bajra": {"msp": 2500, "unit": "quintal", "season": "Kharif", "category": "Cereal"},
    "ragi": {"msp": 3846, "unit": "quintal", "season": "Kharif", "category": "Cereal"},
    "lentil": {"msp": 6425, "unit": "quintal", "season": "Rabi", "category": "Pulse"},
    "sunflower": {"msp": 6760, "unit": "quintal", "season": "Rabi", "category": "Oilseed"},
    "sesame": {"msp": 8635, "unit": "quintal", "season": "Kharif", "category": "Oilseed"},
    "jute": {"msp": 5050, "unit": "quintal", "season": "Kharif", "category": "Commercial"},
}


async def get_market_prices(crop: Optional[str] = None, state: Optional[str] = None) -> dict:
    """
    Fetch market prices from data.gov.in Agmarknet API.
    Falls back to MSP data if API is unavailable.
    """
    prices = []

    # Try fetching from Agmarknet / data.gov.in
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            api_key = settings.DATA_GOV_API_KEY
            if not api_key:
                print("Market API key not found in settings")
                raise Exception("API Key Missing")
                
            params = {"api-key": api_key}
            params["format"] = "json"
            params["limit"] = 50
            if crop:
                params["filters[commodity]"] = crop.upper()
            if state:
                params["filters[state]"] = state.upper()

            response = await client.get(
                "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
                params=params
            )

            if response.status_code == 200:
                data = response.json()
                records = data.get("records", [])
                for record in records:
                    crop_name = record.get("commodity", "").lower().strip()
                    msp_info = MSP_DATA.get(crop_name, {})
                    prices.append({
                        "crop": record.get("commodity", ""),
                        "state": record.get("state", ""),
                        "district": record.get("district", ""),
                        "market": record.get("market", ""),
                        "variety": record.get("variety", ""),
                        "min_price": float(record.get("min_price", 0)),
                        "max_price": float(record.get("max_price", 0)),
                        "modal_price": float(record.get("modal_price", 0)),
                        "arrival_date": record.get("arrival_date", ""),
                        "msp": msp_info.get("msp"),
                        "season": msp_info.get("season", ""),
                        "unit": "Rs/Quintal",
                    })

                if prices:
                    return {
                        "prices": prices,
                        "total": len(prices),
                        "source": "Agmarknet - Government of India",
                        "last_updated": datetime.utcnow().isoformat()
                    }

    except Exception as e:
        print(f"Agmarknet API error: {e}")

    # Fallback: Return official MSP data
    filter_key = crop.lower().strip() if crop else None
    for crop_name, info in MSP_DATA.items():
        if filter_key and filter_key not in crop_name:
            continue
        prices.append({
            "crop": crop_name.title(),
            "state": state or "All India",
            "district": "-",
            "market": "MSP (Minimum Support Price)",
            "variety": "Standard",
            "min_price": info["msp"] * 0.85,
            "max_price": info["msp"] * 1.15,
            "modal_price": info["msp"],
            "arrival_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "msp": info["msp"],
            "season": info["season"],
            "category": info["category"],
            "unit": f"Rs/{info['unit']}",
        })

    return {
        "prices": prices,
        "total": len(prices),
        "source": "CACP - Government of India MSP Data 2024-25",
        "last_updated": datetime.utcnow().isoformat(),
        "note": "Showing official MSP rates. Live mandi prices available when Agmarknet API is accessible."
    }


async def get_price_trends(crop: str) -> dict:
    """Get price trend data for a specific crop"""
    crop_lower = crop.lower().strip()
    msp_info = MSP_DATA.get(crop_lower)

    if not msp_info:
        return {"error": f"Crop '{crop}' not found in database. Available crops: {', '.join(MSP_DATA.keys())}"}

    base_price = msp_info["msp"]

    return {
        "crop": crop.title(),
        "msp": base_price,
        "unit": f"Rs/{msp_info['unit']}",
        "season": msp_info["season"],
        "category": msp_info["category"],
        "current_price": base_price,
        "source": "CACP - Government of India",
        "recommendation": "Check your nearest mandi for today's actual trading prices. Consider using e-NAM platform for better price discovery.",
        "tips": [
            "Compare prices at multiple mandis before selling",
            "Use government warehouses for storage if prices are below MSP",
            "Contact your nearest FPO (Farmer Producer Organization) for collective bargaining",
            "Register on e-NAM for transparent online trading"
        ]
    }
