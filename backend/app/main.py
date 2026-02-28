"""FastAPI application entry point for BBDSL Platform."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, compare, export, registry, validate
from app.core.config import settings
from app.core.database import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create tables on startup."""
    await create_tables()
    yield


app = FastAPI(
    title="BBDSL Platform API",
    description="Convention Registry, Online Editor & Community for Bridge Bidding Systems",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(registry.router, prefix="/api/v1", tags=["registry"])
app.include_router(validate.router, prefix="/api/v1", tags=["validate"])
app.include_router(export.router, prefix="/api/v1", tags=["export"])
app.include_router(compare.router, prefix="/api/v1", tags=["compare"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "0.1.0"}
