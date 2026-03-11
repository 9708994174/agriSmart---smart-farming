from fastapi import APIRouter, Depends
from datetime import datetime
from database import get_database
from models.chat import ChatRequest, ChatResponse
from middleware.auth import get_current_user
from services.chat_service import generate_chat_response

router = APIRouter()


@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    response = await generate_chat_response(
        message=request.message,
        language=request.language,
        context=request.context,
        user_id=current_user["user_id"]
    )

    db = get_database()
    if db is not None:
        try:
            await db.chat_history.insert_one({
                "user_id": current_user["user_id"],
                "message": request.message,
                "response": response["response"],
                "category": response["category"],
                "language": request.language,
                "created_at": datetime.utcnow().isoformat()
            })
            await db.search_history.insert_one({
                "user_id": current_user["user_id"],
                "query": request.message,
                "type": "chat",
                "result": {"response": response["response"][:200]},
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception:
            pass

    return ChatResponse(**response)


@router.get("/history")
async def get_chat_history(limit: int = 50, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"history": []}

    cursor = db.chat_history.find(
        {"user_id": current_user["user_id"]}
    ).sort("created_at", -1).limit(limit)

    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        history.append(doc)

    return {"history": history}


@router.delete("/history")
async def clear_chat_history(current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"message": "Chat history cleared"}
    await db.chat_history.delete_many({"user_id": current_user["user_id"]})
    return {"message": "Chat history cleared"}
