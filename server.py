from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'pcp_navigator')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'campus-navigator-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title="Campus Navigator API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# =============== MODELS ===============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class Wing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    code: str
    department: str
    floors: List[int]
    description: str
    lat: float
    lng: float

class Room(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    wing_id: str
    name: str
    room_number: str
    floor: int
    room_type: str
    x: float
    y: float
    width: float
    height: float
    qr_code: str

class NavigationPath(BaseModel):
    from_room_id: str
    to_room_id: str

class PathStep(BaseModel):
    instruction: str
    direction: str
    floor: int
    x: float
    y: float

class NavigationResponse(BaseModel):
    from_room: str
    to_room: str
    from_floor: int
    to_floor: int
    total_distance: str
    estimated_time: str
    steps: List[PathStep]
    voice_instructions: List[str]

class FavoriteCreate(BaseModel):
    room_id: str

class FavoriteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    room_id: str
    created_at: str

# =============== AUTH HELPERS ===============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# =============== AUTH ROUTES ===============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    hashed = hash_password(user_data.password)
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed,
        "created_at": now
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

# =============== CAMPUS INFO ===============

CAMPUS_INFO = {
    "name": "Pimpri Chinchwad Polytechnic",
    "address": "Sector 26, Pradhikaran, Nigdi, near Akurdi Railway Station, Pune - 411044",
    "center_lat": 18.6525,
    "center_lng": 73.7619,
    "google_maps": "https://maps.app.goo.gl/VT9RUenepKkkiwmr8"
}

@api_router.get("/campus")
async def get_campus_info():
    return CAMPUS_INFO

# =============== WINGS ROUTES ===============

@api_router.get("/wings", response_model=List[Wing])
async def get_wings():
    wings = await db.wings.find({}, {"_id": 0}).to_list(100)
    return wings

@api_router.get("/wings/{wing_id}", response_model=Wing)
async def get_wing(wing_id: str):
    wing = await db.wings.find_one({"id": wing_id}, {"_id": 0})
    if not wing:
        raise HTTPException(status_code=404, detail="Wing not found")
    return wing

# =============== ROOMS ROUTES ===============

@api_router.get("/rooms", response_model=List[Room])
async def get_rooms(wing_id: Optional[str] = None, floor: Optional[int] = None, room_type: Optional[str] = None):
    query = {}
    if wing_id:
        query["wing_id"] = wing_id
    if floor is not None:
        query["floor"] = floor
    if room_type:
        query["room_type"] = room_type
    rooms = await db.rooms.find(query, {"_id": 0}).to_list(500)
    return rooms

@api_router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@api_router.get("/rooms/qr/{qr_code}")
async def get_room_by_qr(qr_code: str):
    room = await db.rooms.find_one({"qr_code": qr_code}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found for this QR code")
    wing = await db.wings.find_one({"id": room["wing_id"]}, {"_id": 0})
    return {"room": room, "wing": wing}

@api_router.get("/search")
async def search(q: str):
    rooms = await db.rooms.find(
        {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"room_number": {"$regex": q, "$options": "i"}},
            {"room_type": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    ).to_list(50)

    wings = await db.wings.find(
        {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"department": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    ).to_list(10)

    return {"rooms": rooms, "wings": wings}

# =============== NAVIGATION ROUTES ===============

@api_router.post("/navigate", response_model=NavigationResponse)
async def get_navigation(req: NavigationPath):
    from_room = await db.rooms.find_one({"id": req.from_room_id}, {"_id": 0})
    to_room = await db.rooms.find_one({"id": req.to_room_id}, {"_id": 0})

    if not from_room or not to_room:
        raise HTTPException(status_code=404, detail="Room not found")

    steps = []
    voice_instructions = []

    dx = to_room["x"] - from_room["x"]
    dy = to_room["y"] - from_room["y"]
    floor_diff = to_room["floor"] - from_room["floor"]

    distance = math.sqrt(dx**2 + dy**2) * 5
    if floor_diff != 0:
        distance += abs(floor_diff) * 15

    walking_speed = 1.2
    time_minutes = max(1, int(distance / walking_speed / 60))

    voice_instructions.append(f"Starting navigation from {from_room['name']} to {to_room['name']}")

    steps.append(PathStep(
        instruction=f"Exit {from_room['name']}",
        direction="forward",
        floor=from_room["floor"],
        x=from_room["x"],
        y=from_room["y"]
    ))
    voice_instructions.append(f"Exit {from_room['name']} and enter the corridor")

    if floor_diff != 0:
        direction = "stairs-up" if floor_diff > 0 else "stairs-down"
        verb = "up" if floor_diff > 0 else "down"
        steps.append(PathStep(
            instruction=f"Take stairs {verb} to Floor {to_room['floor']}",
            direction=direction,
            floor=from_room["floor"],
            x=from_room["x"] + 50,
            y=from_room["y"]
        ))
        voice_instructions.append(f"Walk to the staircase and go {verb} {abs(floor_diff)} floor{'s' if abs(floor_diff) > 1 else ''}")

    h_direction = "right" if dx > 0 else "left"
    if abs(dx) > 10:
        steps.append(PathStep(
            instruction=f"Turn {h_direction} and walk along the corridor",
            direction=h_direction,
            floor=to_room["floor"],
            x=from_room["x"] + dx/2,
            y=from_room["y"]
        ))
        voice_instructions.append(f"Turn {h_direction} and continue walking")

    steps.append(PathStep(
        instruction=f"Arrive at {to_room['name']} ({to_room['room_number']})",
        direction="arrive",
        floor=to_room["floor"],
        x=to_room["x"],
        y=to_room["y"]
    ))
    voice_instructions.append(f"You have arrived at {to_room['name']}. It will be on your {h_direction}.")

    return NavigationResponse(
        from_room=from_room["name"],
        to_room=to_room["name"],
        from_floor=from_room["floor"],
        to_floor=to_room["floor"],
        total_distance=f"{int(distance)}m",
        estimated_time=f"{time_minutes} min walk",
        steps=steps,
        voice_instructions=voice_instructions
    )

# =============== FAVORITES ROUTES ===============

@api_router.get("/favorites", response_model=List[FavoriteResponse])
async def get_favorites(current_user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return favorites

@api_router.post("/favorites", response_model=FavoriteResponse)
async def add_favorite(fav: FavoriteCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": current_user["id"], "room_id": fav.room_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")

    fav_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    fav_doc = {"id": fav_id, "user_id": current_user["id"], "room_id": fav.room_id, "created_at": now}
    await db.favorites.insert_one(fav_doc)
    return FavoriteResponse(**fav_doc)

@api_router.delete("/favorites/{room_id}")
async def remove_favorite(room_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.favorites.delete_one({"user_id": current_user["id"], "room_id": room_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Favorite removed"}

# =============== SEED DATA ===============

SAMPLE_WINGS = [
    {"id": "a-wing", "name": "A-Wing", "code": "A", "department": "Computer Engineering", "floors": [0, 1, 2], "description": "Computer Engineering Department", "lat": 18.6527, "lng": 73.7617},
    {"id": "b-wing", "name": "B-Wing", "code": "B", "department": "Civil Engineering & First Year", "floors": [0, 1], "description": "Civil Engineering and First Year", "lat": 18.6525, "lng": 73.7621},
    {"id": "c-wing", "name": "C-Wing", "code": "C", "department": "Automobile Engineering", "floors": [0, 1, 2, 3], "description": "Automobile Engineering", "lat": 18.6523, "lng": 73.7617},
    {"id": "d-wing", "name": "D-Wing", "code": "D", "department": "Electronics & IT", "floors": [0, 1, 2, 3], "description": "Electronics, Telecom & IT", "lat": 18.6525, "lng": 73.7615},
    {"id": "e-wing", "name": "E-Wing", "code": "E", "department": "Mechanical Engineering", "floors": [0, 1, 2], "description": "Mechanical Engineering", "lat": 18.6528, "lng": 73.7621}
]

SAMPLE_ROOMS = [
    {"id": "a0-1", "wing_id": "a-wing", "name": "Trust Admin Office", "room_number": "A0-1", "floor": 0, "room_type": "office", "x": 50, "y": 50, "width": 80, "height": 60, "qr_code": "CAMPUS-A0-1"},
    {"id": "a0-2", "wing_id": "a-wing", "name": "Poly Admin Office", "room_number": "A0-2", "floor": 0, "room_type": "office", "x": 150, "y": 50, "width": 80, "height": 60, "qr_code": "CAMPUS-A0-2"},
    {"id": "a0-5", "wing_id": "a-wing", "name": "Principal Cabin", "room_number": "A0-5", "floor": 0, "room_type": "office", "x": 360, "y": 50, "width": 100, "height": 80, "qr_code": "CAMPUS-A0-5"},
    {"id": "a1-6", "wing_id": "a-wing", "name": "HOD Cabin (CO)", "room_number": "A1-6", "floor": 1, "room_type": "office", "x": 50, "y": 50, "width": 80, "height": 60, "qr_code": "CAMPUS-A1-6"},
    {"id": "a1-l1", "wing_id": "a-wing", "name": "Software Testing Lab", "room_number": "A1-L1", "floor": 1, "room_type": "lab", "x": 150, "y": 50, "width": 120, "height": 80, "qr_code": "CAMPUS-A1-L1"},
    {"id": "a2-cr1", "wing_id": "a-wing", "name": "Class Room", "room_number": "A2-CR1", "floor": 2, "room_type": "classroom", "x": 290, "y": 50, "width": 100, "height": 80, "qr_code": "CAMPUS-A2-CR1"},
]

@api_router.post("/seed")
async def seed_database():
    await db.wings.delete_many({})
    await db.rooms.delete_many({})
    await db.wings.insert_many(SAMPLE_WINGS)
    await db.rooms.insert_many(SAMPLE_ROOMS)
    return {"message": "Database seeded", "wings": len(SAMPLE_WINGS), "rooms": len(SAMPLE_ROOMS)}

# =============== APP SETUP ===============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    count = await db.wings.count_documents({})
    if count == 0:
        await db.wings.insert_many(SAMPLE_WINGS)
        await db.rooms.insert_many(SAMPLE_ROOMS)
        logger.info("Database seeded with campus data")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
