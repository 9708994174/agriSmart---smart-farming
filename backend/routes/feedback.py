"""
Feedback Service - User feedback collection
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from database import get_database
from middleware.auth import get_current_user

router = APIRouter()


class FeedbackCreate(BaseModel):
    type: str = Field(..., description="feedback, bug, suggestion")
    content: str = Field(..., min_length=5, max_length=2000)
    rating: Optional[int] = Field(None, ge=1, le=5)
    page: Optional[str] = None


@router.post("/feedback")
async def submit_feedback(
    feedback: FeedbackCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()

    record = {
        "user_id": current_user["user_id"],
        "type": feedback.type,
        "content": feedback.content,
        "rating": feedback.rating,
        "page": feedback.page,
        "timestamp": datetime.utcnow().isoformat()
    }

    if db is not None:
        try:
            await db.feedback.insert_one(record)
        except Exception:
            pass

    return {"message": "Feedback submitted successfully. Thank you."}


@router.get("/feedback")
async def get_feedback(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    if db is None:
        return {"feedback": []}

    # Admin sees all, regular users see their own
    query = {} if current_user.get("role") == "admin" else {"user_id": current_user["user_id"]}
    cursor = db.feedback.find(query).sort("timestamp", -1).limit(limit)

    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)

    return {"feedback": items}
