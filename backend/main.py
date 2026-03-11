from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from config import get_settings
from database import connect_to_mongo, close_mongo_connection
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.predict import router as predict_router
from routes.weather_market import router as weather_market_router
from routes.dashboard import router as dashboard_router
from routes.feedback import router as feedback_router
from routes.community import router as community_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="AgriSmart API",
    description="AI-Based Decision Support and Chatbot System for Farmers",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chatbot"])
app.include_router(predict_router, prefix="/api/predict", tags=["Predictions"])
app.include_router(weather_market_router, prefix="/api", tags=["Weather and Market"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(feedback_router, prefix="/api", tags=["Feedback"])
app.include_router(community_router, prefix="/api/community", tags=["Community"])


@app.get("/")
async def root():
    return {
        "name": "AgriSmart API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
async def health_check():
    from database import get_database
    db = get_database()
    return {
        "status": "healthy",
        "database": "connected" if db is not None else "disconnected",
        "environment": settings.APP_ENV
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
