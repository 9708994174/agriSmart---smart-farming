"""
Weather Service - Open-Meteo API Integration
Free, open-source weather API — NO API key required.
https://open-meteo.com/en/docs
"""
import httpx
import time
from typing import Optional

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL  = "https://api.open-meteo.com/v1/forecast"

# ── In-memory weather cache (5-min TTL) — prevents repeated API hits ──────────
_weather_cache: dict = {}
_WEATHER_TTL = 300   # 5 minutes

def _get_weather_cached(city: str) -> Optional[dict]:
    entry = _weather_cache.get(city.lower())
    if entry and (time.time() - entry[1]) < _WEATHER_TTL:
        return entry[0]
    return None

def _set_weather_cache(city: str, data: dict):
    _weather_cache[city.lower()] = (data, time.time())


# ── Built-in coordinates for 80+ major Indian cities ──────────────────────────
# Using these avoids geocoding API calls entirely (no rate-limit risk)
INDIAN_CITIES: dict = {
    # North India
    "delhi":       {"name": "Delhi",       "lat": 28.6139, "lon": 77.2090, "state": "Delhi",          "tz": "Asia/Kolkata"},
    "new delhi":   {"name": "New Delhi",   "lat": 28.6139, "lon": 77.2090, "state": "Delhi",          "tz": "Asia/Kolkata"},
    "noida":       {"name": "Noida",       "lat": 28.5355, "lon": 77.3910, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "gurgaon":     {"name": "Gurgaon",     "lat": 28.4595, "lon": 77.0266, "state": "Haryana",        "tz": "Asia/Kolkata"},
    "gurugram":    {"name": "Gurugram",    "lat": 28.4595, "lon": 77.0266, "state": "Haryana",        "tz": "Asia/Kolkata"},
    "faridabad":   {"name": "Faridabad",   "lat": 28.4089, "lon": 77.3178, "state": "Haryana",        "tz": "Asia/Kolkata"},
    "chandigarh":  {"name": "Chandigarh",  "lat": 30.7333, "lon": 76.7794, "state": "Chandigarh",     "tz": "Asia/Kolkata"},
    "ludhiana":    {"name": "Ludhiana",    "lat": 30.9010, "lon": 75.8573, "state": "Punjab",         "tz": "Asia/Kolkata"},
    "amritsar":    {"name": "Amritsar",    "lat": 31.6340, "lon": 74.8723, "state": "Punjab",         "tz": "Asia/Kolkata"},
    "jalandhar":   {"name": "Jalandhar",   "lat": 31.3260, "lon": 75.5762, "state": "Punjab",         "tz": "Asia/Kolkata"},
    "ambala":      {"name": "Ambala",      "lat": 30.3782, "lon": 76.7767, "state": "Haryana",        "tz": "Asia/Kolkata"},
    "shimla":      {"name": "Shimla",      "lat": 31.1048, "lon": 77.1734, "state": "Himachal Pradesh","tz": "Asia/Kolkata"},
    "dehradun":    {"name": "Dehradun",    "lat": 30.3165, "lon": 78.0322, "state": "Uttarakhand",    "tz": "Asia/Kolkata"},
    "haridwar":    {"name": "Haridwar",    "lat": 29.9457, "lon": 78.1642, "state": "Uttarakhand",    "tz": "Asia/Kolkata"},
    "srinagar":    {"name": "Srinagar",    "lat": 34.0837, "lon": 74.7973, "state": "J&K",            "tz": "Asia/Kolkata"},
    "jammu":       {"name": "Jammu",       "lat": 32.7266, "lon": 74.8570, "state": "J&K",            "tz": "Asia/Kolkata"},
    # UP & Bihar
    "lucknow":     {"name": "Lucknow",     "lat": 26.8467, "lon": 80.9462, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "kanpur":      {"name": "Kanpur",      "lat": 26.4499, "lon": 80.3319, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "agra":        {"name": "Agra",        "lat": 27.1767, "lon": 78.0081, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "varanasi":    {"name": "Varanasi",    "lat": 25.3176, "lon": 82.9739, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "allahabad":   {"name": "Prayagraj",   "lat": 25.4358, "lon": 81.8463, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "prayagraj":   {"name": "Prayagraj",   "lat": 25.4358, "lon": 81.8463, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "meerut":      {"name": "Meerut",      "lat": 28.9845, "lon": 77.7064, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "gorakhpur":   {"name": "Gorakhpur",   "lat": 26.7606, "lon": 83.3732, "state": "Uttar Pradesh",  "tz": "Asia/Kolkata"},
    "patna":       {"name": "Patna",       "lat": 25.5941, "lon": 85.1376, "state": "Bihar",          "tz": "Asia/Kolkata"},
    "gaya":        {"name": "Gaya",        "lat": 24.7914, "lon": 84.9994, "state": "Bihar",          "tz": "Asia/Kolkata"},
    "muzaffarpur": {"name": "Muzaffarpur", "lat": 26.1209, "lon": 85.3647, "state": "Bihar",          "tz": "Asia/Kolkata"},
    # Rajasthan
    "jaipur":      {"name": "Jaipur",      "lat": 26.9124, "lon": 75.7873, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    "jodhpur":     {"name": "Jodhpur",     "lat": 26.2389, "lon": 73.0243, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    "udaipur":     {"name": "Udaipur",     "lat": 24.5854, "lon": 73.7125, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    "ajmer":       {"name": "Ajmer",       "lat": 26.4499, "lon": 74.6399, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    "kota":        {"name": "Kota",        "lat": 25.2138, "lon": 75.8648, "state": "Rajasthan",      "tz": "Asia/Kolkata"},
    # Maharashtra & Goa
    "mumbai":      {"name": "Mumbai",      "lat": 19.0760, "lon": 72.8777, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "pune":        {"name": "Pune",        "lat": 18.5204, "lon": 73.8567, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "nagpur":      {"name": "Nagpur",      "lat": 21.1458, "lon": 79.0882, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "nashik":      {"name": "Nashik",      "lat": 19.9975, "lon": 73.7898, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "aurangabad":  {"name": "Aurangabad",  "lat": 19.8762, "lon": 75.3433, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "solapur":     {"name": "Solapur",     "lat": 17.6854, "lon": 75.9064, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "kolhapur":    {"name": "Kolhapur",    "lat": 16.7050, "lon": 74.2433, "state": "Maharashtra",    "tz": "Asia/Kolkata"},
    "goa":         {"name": "Panaji",      "lat": 15.4909, "lon": 73.8278, "state": "Goa",            "tz": "Asia/Kolkata"},
    "panaji":      {"name": "Panaji",      "lat": 15.4909, "lon": 73.8278, "state": "Goa",            "tz": "Asia/Kolkata"},
    # South India
    "bengaluru":   {"name": "Bengaluru",   "lat": 12.9716, "lon": 77.5946, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "bangalore":   {"name": "Bengaluru",   "lat": 12.9716, "lon": 77.5946, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "mysuru":      {"name": "Mysuru",      "lat": 12.2958, "lon": 76.6394, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "mysore":      {"name": "Mysuru",      "lat": 12.2958, "lon": 76.6394, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "hubli":       {"name": "Hubli",       "lat": 15.3647, "lon": 75.1240, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "mangalore":   {"name": "Mangalore",   "lat": 12.9141, "lon": 74.8560, "state": "Karnataka",      "tz": "Asia/Kolkata"},
    "hyderabad":   {"name": "Hyderabad",   "lat": 17.3850, "lon": 78.4867, "state": "Telangana",      "tz": "Asia/Kolkata"},
    "warangal":    {"name": "Warangal",    "lat": 17.9689, "lon": 79.5941, "state": "Telangana",      "tz": "Asia/Kolkata"},
    "chennai":     {"name": "Chennai",     "lat": 13.0827, "lon": 80.2707, "state": "Tamil Nadu",     "tz": "Asia/Kolkata"},
    "coimbatore":  {"name": "Coimbatore",  "lat": 11.0168, "lon": 76.9558, "state": "Tamil Nadu",     "tz": "Asia/Kolkata"},
    "madurai":     {"name": "Madurai",     "lat": 9.9252,  "lon": 78.1198, "state": "Tamil Nadu",     "tz": "Asia/Kolkata"},
    "trichy":      {"name": "Tiruchirappalli","lat": 10.7905,"lon": 78.7047,"state": "Tamil Nadu",    "tz": "Asia/Kolkata"},
    "kochi":       {"name": "Kochi",       "lat": 9.9312,  "lon": 76.2673, "state": "Kerala",         "tz": "Asia/Kolkata"},
    "thiruvananthapuram":{"name":"Thiruvananthapuram","lat":8.5241,"lon":76.9366,"state":"Kerala",    "tz": "Asia/Kolkata"},
    "trivandrum":  {"name": "Thiruvananthapuram","lat":8.5241,"lon":76.9366,"state":"Kerala",         "tz": "Asia/Kolkata"},
    "kozhikode":   {"name": "Kozhikode",   "lat": 11.2588, "lon": 75.7804, "state": "Kerala",         "tz": "Asia/Kolkata"},
    "vishakhapatnam":{"name":"Visakhapatnam","lat":17.6868,"lon":83.2185,"state":"Andhra Pradesh",   "tz": "Asia/Kolkata"},
    "visakhapatnam":{"name":"Visakhapatnam","lat":17.6868,"lon":83.2185,"state":"Andhra Pradesh",    "tz": "Asia/Kolkata"},
    "vijayawada":  {"name": "Vijayawada",  "lat": 16.5062, "lon": 80.6480, "state": "Andhra Pradesh", "tz": "Asia/Kolkata"},
    # East India
    "kolkata":     {"name": "Kolkata",     "lat": 22.5726, "lon": 88.3639, "state": "West Bengal",    "tz": "Asia/Kolkata"},
    "calcutta":    {"name": "Kolkata",     "lat": 22.5726, "lon": 88.3639, "state": "West Bengal",    "tz": "Asia/Kolkata"},
    "bhubaneswar": {"name": "Bhubaneswar", "lat": 20.2961, "lon": 85.8245, "state": "Odisha",         "tz": "Asia/Kolkata"},
    "cuttack":     {"name": "Cuttack",     "lat": 20.4625, "lon": 85.8828, "state": "Odisha",         "tz": "Asia/Kolkata"},
    "guwahati":    {"name": "Guwahati",    "lat": 26.1445, "lon": 91.7362, "state": "Assam",          "tz": "Asia/Kolkata"},
    "ranchi":      {"name": "Ranchi",      "lat": 23.3441, "lon": 85.3096, "state": "Jharkhand",      "tz": "Asia/Kolkata"},
    "jamshedpur":  {"name": "Jamshedpur",  "lat": 22.8046, "lon": 86.2029, "state": "Jharkhand",      "tz": "Asia/Kolkata"},
    "raipur":      {"name": "Raipur",      "lat": 21.2514, "lon": 81.6296, "state": "Chhattisgarh",   "tz": "Asia/Kolkata"},
    # Central & West
    "bhopal":      {"name": "Bhopal",      "lat": 23.2599, "lon": 77.4126, "state": "Madhya Pradesh", "tz": "Asia/Kolkata"},
    "indore":      {"name": "Indore",      "lat": 22.7196, "lon": 75.8577, "state": "Madhya Pradesh", "tz": "Asia/Kolkata"},
    "jabalpur":    {"name": "Jabalpur",    "lat": 23.1815, "lon": 79.9864, "state": "Madhya Pradesh", "tz": "Asia/Kolkata"},
    "gwalior":     {"name": "Gwalior",     "lat": 26.2183, "lon": 78.1828, "state": "Madhya Pradesh", "tz": "Asia/Kolkata"},
    "ahmedabad":   {"name": "Ahmedabad",   "lat": 23.0225, "lon": 72.5714, "state": "Gujarat",        "tz": "Asia/Kolkata"},
    "surat":       {"name": "Surat",       "lat": 21.1702, "lon": 72.8311, "state": "Gujarat",        "tz": "Asia/Kolkata"},
    "vadodara":    {"name": "Vadodara",    "lat": 22.3072, "lon": 73.1812, "state": "Gujarat",        "tz": "Asia/Kolkata"},
    "rajkot":      {"name": "Rajkot",      "lat": 22.3039, "lon": 70.8022, "state": "Gujarat",        "tz": "Asia/Kolkata"},
}

def _lookup_city(city: str) -> Optional[dict]:
    """Look up city in built-in dictionary (case-insensitive). Returns geo dict or None."""
    key = city.strip().lower()
    if key in INDIAN_CITIES:
        c = INDIAN_CITIES[key]
        return {
            "name"        : c["name"],
            "latitude"    : c["lat"],
            "longitude"   : c["lon"],
            "country"     : "India",
            "country_code": "IN",
            "admin1"      : c["state"],
            "timezone"    : c["tz"],
        }
    return None


# WMO Weather Interpretation Codes → description & icon mapping
WMO_CODES = {
    0: {"description": "Clear sky", "icon": "☀️"},
    1: {"description": "Mainly clear", "icon": "🌤️"},
    2: {"description": "Partly cloudy", "icon": "⛅"},
    3: {"description": "Overcast", "icon": "☁️"},
    45: {"description": "Fog", "icon": "🌫️"},
    48: {"description": "Depositing rime fog", "icon": "🌫️"},
    51: {"description": "Light drizzle", "icon": "🌦️"},
    53: {"description": "Moderate drizzle", "icon": "🌦️"},
    55: {"description": "Dense drizzle", "icon": "🌧️"},
    56: {"description": "Light freezing drizzle", "icon": "🌨️"},
    57: {"description": "Dense freezing drizzle", "icon": "🌨️"},
    61: {"description": "Slight rain", "icon": "🌧️"},
    63: {"description": "Moderate rain", "icon": "🌧️"},
    65: {"description": "Heavy rain", "icon": "🌧️"},
    66: {"description": "Light freezing rain", "icon": "🌨️"},
    67: {"description": "Heavy freezing rain", "icon": "🌨️"},
    71: {"description": "Slight snowfall", "icon": "🌨️"},
    73: {"description": "Moderate snowfall", "icon": "❄️"},
    75: {"description": "Heavy snowfall", "icon": "❄️"},
    77: {"description": "Snow grains", "icon": "❄️"},
    80: {"description": "Slight rain showers", "icon": "🌦️"},
    81: {"description": "Moderate rain showers", "icon": "🌧️"},
    82: {"description": "Violent rain showers", "icon": "⛈️"},
    85: {"description": "Slight snow showers", "icon": "🌨️"},
    86: {"description": "Heavy snow showers", "icon": "❄️"},
    95: {"description": "Thunderstorm", "icon": "⛈️"},
    96: {"description": "Thunderstorm with slight hail", "icon": "⛈️"},
    99: {"description": "Thunderstorm with heavy hail", "icon": "⛈️"},
}


def _get_wmo_info(code: int) -> dict:
    """Get weather description and icon from WMO code"""
    return WMO_CODES.get(code, {"description": "Unknown", "icon": "🌡️"})


def generate_farming_advice(temp: float, humidity: float, wind: float, description: str, rain: float = 0) -> list:
    """Generate farming-specific weather advice"""
    advice = []
    desc_lower = description.lower() if description else ""

    if rain > 5:
        advice.append("Significant rainfall expected. Avoid spraying pesticides or fertilizers today.")
        advice.append("Ensure proper drainage in fields to prevent waterlogging.")
    elif rain > 0:
        advice.append("Light rain expected. Good conditions for transplanting seedlings.")

    if temp > 35:
        advice.append("High temperature alert. Irrigate crops during early morning or late evening to reduce evaporation.")
        advice.append("Consider mulching to retain soil moisture in this heat.")
    elif temp < 10:
        advice.append("Low temperature advisory. Protect sensitive crops and nurseries from frost damage.")
        advice.append("Avoid irrigation during night to prevent frost formation on leaves.")
    elif 20 <= temp <= 30:
        advice.append("Temperature is optimal for most crop growth activities.")

    if humidity > 85:
        advice.append("High humidity increases risk of fungal diseases. Monitor crops for signs of infection.")
    elif humidity < 30:
        advice.append("Low humidity levels. Increase irrigation frequency and consider sprinkler systems.")

    if wind > 25:
        advice.append("Strong winds expected. Secure any temporary structures and staked plants.")

    if "clear" in desc_lower or "sun" in desc_lower:
        advice.append("Clear skies today. Good conditions for harvesting, drying, and field preparation.")

    if "thunderstorm" in desc_lower:
        advice.append("⚡ Thunderstorm expected. Avoid outdoor field work and stay safe.")

    if "fog" in desc_lower:
        advice.append("Foggy conditions. Delay pesticide spray as it can drift. Ideal for some vegetable growth.")

    if not advice:
        advice.append("Weather conditions are moderate. Suitable for regular farming activities.")

    return advice



async def _geocode_city(city: str) -> Optional[dict]:
    """Convert city name to lat/lon.
    1. Check built-in Indian city dictionary first (no API, no rate-limit)
    2. Fall back to Open-Meteo Geocoding API for unknown cities
    """
    # Step 1: built-in lookup (instant, no API call)
    builtin = _lookup_city(city)
    if builtin:
        return builtin

    # Step 2: geocoding API (only for cities not in our dictionary)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                GEOCODING_URL,
                params={
                    "name": city,
                    "count": 5,
                    "language": "en",
                    "format": "json"
                }
            )

            if response.status_code != 200:
                return None

            data    = response.json()
            results = data.get("results", [])
            if not results:
                return None

            india_match = next((r for r in results if r.get("country_code") == "IN"), None)
            best = india_match or results[0]

            return {
                "name"        : best.get("name", city),
                "latitude"    : best["latitude"],
                "longitude"   : best["longitude"],
                "country"     : best.get("country", ""),
                "country_code": best.get("country_code", ""),
                "admin1"      : best.get("admin1", ""),
                "timezone"    : best.get("timezone", "Asia/Kolkata"),
            }

    except Exception as e:
        print(f"[ERROR] Geocoding failed for '{city}': {e}")
        return None


async def get_weather(city: str) -> dict:
    """Get current weather data using Open-Meteo API (free, no API key required)"""

    # Return cached weather if fresh (prevents repeated hits)
    cached = _get_weather_cached(city)
    if cached:
        return cached

    # Resolve city → lat/lon (built-in dict first, then geocoding API fallback)
    geo = _lookup_city(city) or await _geocode_city(city)
    if not geo:
        return {"error": True, "msg": f"City '{city}' not found. Try a nearby major city."}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                FORECAST_URL,
                params={
                    "latitude": geo["latitude"],
                    "longitude": geo["longitude"],
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
                    "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,visibility,wind_speed_10m",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,rain_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max",
                    "timezone": geo.get("timezone", "auto"),
                    "forecast_days": 7,
                }
            )

            if response.status_code == 429:
                return {"error": True, "msg": "Weather service is busy (rate limited). Please wait a moment and try again."}

            if response.status_code != 200:
                return {"error": True, "msg": f"Weather service returned status {response.status_code}. Please try again later."}

            data    = response.json()
            current = data.get("current", {})
            daily   = data.get("daily", {})

            weather_code = current.get("weather_code", 0)
            wmo          = _get_wmo_info(weather_code)

            temp       = round(current.get("temperature_2m", 0), 1)
            humidity   = current.get("relative_humidity_2m", 0)
            wind_speed = round(current.get("wind_speed_10m", 0), 1)
            rain       = current.get("rain", 0) or 0

            temp_min = round(daily.get("temperature_2m_min", [0])[0], 1)
            temp_max = round(daily.get("temperature_2m_max", [0])[0], 1)

            weather_data = {
                "city"         : geo["name"],
                "country"      : geo.get("country_code", ""),
                "state"        : geo.get("admin1", ""),
                "latitude"     : geo["latitude"],
                "longitude"    : geo["longitude"],
                "temperature"  : temp,
                "feels_like"   : round(current.get("apparent_temperature", temp), 1),
                "temp_min"     : temp_min,
                "temp_max"     : temp_max,
                "humidity"     : humidity,
                "pressure"     : current.get("pressure_msl", 0),
                "description"  : wmo["description"],
                "icon"         : wmo["icon"],
                "weather_code" : weather_code,
                "is_day"       : current.get("is_day", 1),
                "wind_speed"   : wind_speed,
                "wind_direction": current.get("wind_direction_10m", 0),
                "wind_gusts"   : round(current.get("wind_gusts_10m", 0), 1),
                "clouds"       : current.get("cloud_cover", 0),
                "rain"         : rain,
                "precipitation": current.get("precipitation", 0),
                "sunrise"      : daily.get("sunrise", [""])[0],
                "sunset"       : daily.get("sunset", [""])[0],
                "uv_index"     : daily.get("uv_index_max", [0])[0],
                "data_source"  : "Open-Meteo (free, no API key)",
            }

            weather_data["farming_advice"] = generate_farming_advice(
                temp, humidity, wind_speed, wmo["description"], rain
            )

            _set_weather_cache(city, weather_data)   # Cache for 5 min
            return weather_data

    except httpx.TimeoutException:
        return {"error": True, "msg": "Weather request timed out. Please try again."}
    except Exception as e:
        return {"error": True, "msg": f"Failed to fetch weather: {str(e)}"}


async def get_forecast(city: str) -> dict:
    """Get 7-day hourly/daily forecast using Open-Meteo API"""

    geo = await _geocode_city(city)
    if not geo:
        return {"error": f"City '{city}' not found. Please check the city name and try again."}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                FORECAST_URL,
                params={
                    "latitude": geo["latitude"],
                    "longitude": geo["longitude"],
                    "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,visibility",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,rain_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max",
                    "timezone": geo.get("timezone", "auto"),
                    "forecast_days": 7,
                }
            )

            if response.status_code != 200:
                return {"error": f"Forecast service returned status {response.status_code}. Please try again."}

            data = response.json()
            daily = data.get("daily", {})
            hourly = data.get("hourly", {})

            # Build daily forecasts
            daily_forecasts = []
            times = daily.get("time", [])
            for i, date in enumerate(times):
                weather_code = daily.get("weather_code", [0])[i] if i < len(daily.get("weather_code", [])) else 0
                wmo = _get_wmo_info(weather_code)

                daily_forecasts.append({
                    "date": date,
                    "weather_code": weather_code,
                    "description": wmo["description"],
                    "icon": wmo["icon"],
                    "temp_max": round(daily.get("temperature_2m_max", [0])[i], 1),
                    "temp_min": round(daily.get("temperature_2m_min", [0])[i], 1),
                    "feels_max": round(daily.get("apparent_temperature_max", [0])[i], 1),
                    "feels_min": round(daily.get("apparent_temperature_min", [0])[i], 1),
                    "precipitation_sum": round(daily.get("precipitation_sum", [0])[i], 1),
                    "rain_sum": round(daily.get("rain_sum", [0])[i], 1),
                    "precipitation_hours": daily.get("precipitation_hours", [0])[i],
                    "precipitation_probability": daily.get("precipitation_probability_max", [0])[i],
                    "wind_speed_max": round(daily.get("wind_speed_10m_max", [0])[i], 1),
                    "wind_gusts_max": round(daily.get("wind_gusts_10m_max", [0])[i], 1),
                    "uv_index": daily.get("uv_index_max", [0])[i],
                    "sunrise": daily.get("sunrise", [""])[i],
                    "sunset": daily.get("sunset", [""])[i],
                })

            # Build hourly forecasts (next 48 hours)
            hourly_forecasts = []
            h_times = hourly.get("time", [])
            for i in range(min(48, len(h_times))):
                weather_code = hourly.get("weather_code", [0])[i] if i < len(hourly.get("weather_code", [])) else 0
                wmo = _get_wmo_info(weather_code)

                hourly_forecasts.append({
                    "datetime": h_times[i],
                    "temperature": round(hourly.get("temperature_2m", [0])[i], 1),
                    "humidity": hourly.get("relative_humidity_2m", [0])[i],
                    "precipitation_probability": hourly.get("precipitation_probability", [0])[i],
                    "precipitation": round(hourly.get("precipitation", [0])[i], 1),
                    "weather_code": weather_code,
                    "description": wmo["description"],
                    "icon": wmo["icon"],
                    "wind_speed": round(hourly.get("wind_speed_10m", [0])[i], 1),
                    "visibility": round((hourly.get("visibility", [10000])[i] or 10000) / 1000, 1),
                })

            return {
                "city": geo["name"],
                "country": geo.get("country_code", ""),
                "state": geo.get("admin1", ""),
                "latitude": geo["latitude"],
                "longitude": geo["longitude"],
                "daily": daily_forecasts,
                "hourly": hourly_forecasts,
                "data_source": "Open-Meteo (free, no API key)",
            }

    except httpx.TimeoutException:
        return {"error": "Forecast service request timed out. Please try again."}
    except Exception as e:
        return {"error": f"Failed to fetch forecast data: {str(e)}"}
