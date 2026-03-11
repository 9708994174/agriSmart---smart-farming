from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from database import get_database
from models.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate
from middleware.auth import hash_password, verify_password, create_access_token, get_current_user
import traceback

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available. Please ensure MongoDB is running.")

        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        # Get role value - handle both enum and string
        role_value = user_data.role.value if hasattr(user_data.role, 'value') else str(user_data.role)

        user_doc = {
            "name": user_data.name,
            "email": user_data.email,
            "password": hash_password(user_data.password),
            "phone": user_data.phone or "",
            "role": role_value,
            "language": user_data.language or "en",
            "location": user_data.location.model_dump() if user_data.location else {"state": "", "district": "", "city": ""},
            "farm_details": user_data.farm_details.model_dump() if user_data.farm_details else {"farm_size": "", "farm_size_unit": "acres", "crops": [], "soil_type": "", "irrigation_type": ""},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        access_token = create_access_token({
            "sub": user_id, "email": user_data.email, "role": role_value
        })

        return TokenResponse(
            access_token=access_token,
            user=UserResponse(
                id=user_id, name=user_data.name, email=user_data.email,
                phone=user_data.phone or "", role=role_value, language=user_data.language or "en",
                location=user_doc["location"], farm_details=user_doc["farm_details"],
                created_at=user_doc["created_at"]
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Registration failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available. Please ensure MongoDB is running.")

        user = await db.users.find_one({"email": login_data.email})
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        if not verify_password(login_data.password, user["password"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        user_id = str(user["_id"])
        access_token = create_access_token({
            "sub": user_id, "email": user["email"], "role": user["role"]
        })

        return TokenResponse(
            access_token=access_token,
            user=UserResponse(
                id=user_id, name=user["name"], email=user["email"],
                phone=user.get("phone", ""), role=user["role"], language=user.get("language", "en"),
                location=user.get("location", {}), farm_details=user.get("farm_details", {}),
                created_at=user.get("created_at", "")
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Login failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=str(user["_id"]), name=user["name"], email=user["email"],
        phone=user.get("phone", ""), role=user["role"], language=user.get("language", "en"),
        location=user.get("location", {}), farm_details=user.get("farm_details", {}),
        created_at=user.get("created_at", "")
    )


@router.put("/profile")
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    from bson import ObjectId

    update_dict = {}
    for k, v in update_data.model_dump(exclude_none=True).items():
        if hasattr(v, 'model_dump'):
            update_dict[k] = v.model_dump()
        else:
            update_dict[k] = v
    update_dict["updated_at"] = datetime.utcnow().isoformat()

    await db.users.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$set": update_dict}
    )
    return {"message": "Profile updated successfully"}
