
from fastapi import FastAPI

from app.routes.businesses import router as businesses_router
from app.routes.transactions import router as transactions_router
from app.routes.ai_analysis import router as ai_analysis_router


app = FastAPI(
    title="Oyeja AI",
    description="AI-powered business intelligence for Nigerian SMEs.",
    version="0.1.0",
)


app.include_router(businesses_router)
app.include_router(transactions_router)
app.include_router(ai_analysis_router)


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
