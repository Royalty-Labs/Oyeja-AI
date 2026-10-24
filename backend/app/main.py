
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.businesses import router as businesses_router
from app.routes.transactions import router as transactions_router
from app.routes.ai_analysis import router as ai_analysis_router
from app.routes.ai_assistant import router as ai_assistant_router


app = FastAPI(
    title="Oyeja AI",
    description="AI-powered business intelligence for Nigerian SMEs.",
    version="0.1.0",
)

frontend_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

configured_origins = os.getenv("FRONTEND_ORIGIN", "")

frontend_origins.extend(
    origin.strip()
    for origin in configured_origins.split(",")
    if origin.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(businesses_router)
app.include_router(transactions_router)
app.include_router(ai_analysis_router)
app.include_router(ai_assistant_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to Oyeja AI",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Oyeja AI",
    }
