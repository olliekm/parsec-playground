from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path

from app.routes import generate, templates, history, analytics
from app.db.database import init_db

# Load environment variables from .env file
# Get the api directory (parent of app directory)
api_dir = Path(__file__).resolve().parent.parent
dotenv_path = api_dir / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Verify environment variables are loaded
import os
if os.getenv("OPENAI_API_KEY"):
    print(f"✓ OPENAI_API_KEY loaded (starts with: {os.getenv('OPENAI_API_KEY')[:10]}...)")
else:
    print("✗ WARNING: OPENAI_API_KEY not found!")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the database
    init_db()
    yield
    # Shutdown: Add any cleanup code here if necessary

app = FastAPI(
    title="Parsec Playground API",
    description="API for Parsec Playground application",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

@app.get("/")
def read_root():
    return {"message": "Parsec Playground API is running.", "status": "running"}

