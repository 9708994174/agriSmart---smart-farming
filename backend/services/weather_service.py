"""
Weather Service - Open-Meteo API Integration
Free, open-source weather API — NO API key required.
https://open-meteo.com/en/docs

Uses:
  - Geocoding API: Convert city names to lat/lon
  - Forecast API: Get current + hourly + daily weather data
"""
import httpx
import time
from datetime import datetime
from typing import Optional

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL  = "https://api.open-meteo.com/v1/forecast"

# ── Simple in-memory cache (avoids repeated API hits → prevents 429) ──────────
_geo_cache: dict   = {}   # city_name → (geo_data, timestamp)   TTL: 24 h
_weather_cache: dict = {}  # city_name → (weather_data, timestamp) TTL: 5 min
_GEO_TTL     = 86400  # 24 hours in seconds
_WEATHER_TTL = 300    # 5 minutes in seconds


def _get_geo_cached(city: str) -> Optional[dict]:
    """Return cached geocode data if still fresh."""
    entry = _geo_cache.get(city.lower())
    if entry and (time.time() - entry[1]) < _GEO_TTL:
        return entry[0]
    return None


def _set_geo_cache(city: str, data: dict):
    _geo_cache[city.lower()] = (data, time.time())


def _get_weather_cached(city: str) -> Optional[dict]:
    entry = _weather_cache.get(city.lower())
    if entry and (time.time() - entry[1]) < _WEATHER_TTL:
        return entry[0]
    return None


def _set_weather_cache(city: str, data: dict):
    _weather_cache[city.lower()] = (data, time.time())


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
    """Convert city name to lat/lon using Open-Meteo Geocoding API (with cache)"""
    # Check cache first
    cached = _get_geo_cached(city)
    if cached:
        return cached

    for attempt in range(2):  # retry once on 429
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

                if response.status_code == 429:
                    if attempt == 0:
                        import asyncio
                        await asyncio.sleep(1)
                        continue
                    return None

                if response.status_code != 200:
                    return None

                data    = response.json()
                results = data.get("results", [])

                if not results:
                    return None

                # Prefer Indian cities
                india_match = next((r for r in results if r.get("country_code") == "IN"), None)
                best = india_match or results[0]

                geo = {
                    "name"        : best.get("name", city),
                    "latitude"    : best["latitude"],
                    "longitude"   : best["longitude"],
                    "country"     : best.get("country", ""),
                    "country_code": best.get("country_code", ""),
                    "admin1"      : best.get("admin1", ""),
                    "timezone"    : best.get("timezone", "Asia/Kolkata"),
                }
                _set_geo_cache(city, geo)
                return geo

        except Exception as e:
            print(f"[ERROR] Geocoding failed for '{city}': {e}")
            return None
    return None


async def get_weather(city: str) -> dict:
    """Get current weather data using Open-Meteo API (free, no API key required)"""

    # Return cached weather if fresh (prevents 429 rate-limiting)
    cached = _get_weather_cached(city)
    if cached:
        return cached

    # Geocode city name to lat/lon (also cached for 24 h)
    geo = await _geocode_city(city)
    if not geo:
        return {"error": True, "msg": f"City '{city}' not found. Please check the spelling and try again."}

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
