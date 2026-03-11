from fastapi import APIRouter, Depends, Query
from datetime import datetime
from database import get_database
from middleware.auth import get_current_user
from services.weather_service import get_weather, get_forecast
from services.market_service import get_market_prices, get_price_trends

router = APIRouter()


@router.get("/weather")
async def weather_current(
    city: str = Query(default="Delhi", description="City name"),
    current_user: dict = Depends(get_current_user)
):
    weather_data = await get_weather(city=city)

    db = get_database()
    if db is not None:
        try:
            await db.search_history.insert_one({
                "user_id": current_user["user_id"],
                "query": f"Weather: {city}",
                "type": "weather",
                "result": {"city": city, "temp": weather_data.get("temperature")},
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception:
            pass

    return weather_data


@router.get("/weather/forecast")
async def weather_forecast(
    city: str = Query(default="Delhi", description="City name"),
    current_user: dict = Depends(get_current_user)
):
    return await get_forecast(city=city)


@router.get("/market-prices")
async def market_prices(
    crop: str = Query(default=None, description="Crop name"),
    state: str = Query(default=None, description="State name"),
    current_user: dict = Depends(get_current_user)
):
    prices = await get_market_prices(crop=crop, state=state)

    db = get_database()
    if db is not None:
        try:
            await db.search_history.insert_one({
                "user_id": current_user["user_id"],
                "query": f"Market prices: {crop or 'all'} in {state or 'all'}",
                "type": "market",
                "result": {"crop": crop, "state": state},
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception:
            pass

    return prices


@router.get("/market-prices/trends")
async def market_trends(
    crop: str = Query(..., description="Crop name"),
    current_user: dict = Depends(get_current_user)
):
    return await get_price_trends(crop=crop)
