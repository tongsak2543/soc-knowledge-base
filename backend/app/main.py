from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routes import (
    case_router,
    ioc_router,
    dashboard_router,
    seed_router,
    news_router,
    feed_router,
    wazuh_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create SQLite database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Internal SOC Knowledge Base & IOC Repository API",
    description="Standalone Knowledge Base for SOC/DFIR investigation cases and Indicators of Compromise.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api prefix
app.include_router(case_router, prefix="/api")
app.include_router(ioc_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(seed_router, prefix="/api")
app.include_router(news_router, prefix="/api")
app.include_router(feed_router, prefix="/api")
app.include_router(wazuh_router, prefix="/api")


@app.get("/")
def root():
    return {
        "portal": "Internal SOC Knowledge Base & IOC Repository",
        "version": "2.0.0",
        "documentation": "/docs",
        "status": "operational",
    }

