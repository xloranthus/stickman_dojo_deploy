from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List

app = FastAPI(title="Stickman Dojo API")



# By default, browsers block requests between different ports or domains
# for security. CORS (Cross-Origin Resource Sharing) allows the frontend
# to safely send requests to the backend API. https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # frontend URL needs to be added here later!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()

# data models, same as in frontend - types.ts
class PlayerMatchData(BaseModel):
    name: str
    color: str
    damageDealt: int
    hitsLanded: int
    blocksExecuted: int
    remainingHp: float

class RoundScores(BaseModel):
    p1: int
    p2: int

class PlayersDict(BaseModel):
    p1: PlayerMatchData
    p2: PlayerMatchData

class MatchPayload(BaseModel):
    matchId: str
    timestamp: datetime
    durationSeconds: float
    winner: str
    players: PlayersDict
    currentSeriesScore: RoundScores

class MatchRecord(BaseModel):
    id: int
    matchId: str
    timestamp: datetime
    winner: str
    durationSeconds: float



fake_db: List[MatchRecord] = []
raw_matches_db: List[MatchPayload] = []


# endpoints

@router.post("/api/v1/matches", status_code=201, response_model=MatchRecord)
async def create_match(payload: MatchPayload):
    record = MatchRecord(
        id=len(fake_db) + 1,
        matchId=payload.matchId,
        timestamp=payload.timestamp,
        winner=payload.winner,
        durationSeconds=payload.durationSeconds
    )
    fake_db.append(record)
    raw_matches_db.append(payload)
    return record

@router.get("/api/v1/matches", response_model=List[MatchRecord])
async def list_matches():
    return fake_db

@router.get("/api/v1/leaderboard")
async def get_leaderboard():
    # mock data
    return [{"player": "Player 1 (Shadow)", "wins": 5}, {"player": "Player 2 (Blaze)", "wins": 3}]

@router.get("/api/v1/statistics")
async def get_statistics():
    return {"total_matches": len(fake_db)}

app.include_router(router)