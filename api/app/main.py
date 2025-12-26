from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routes import generate, templates, history, analytics
from app.db.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the database
    await init_db()
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

