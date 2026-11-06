from app.routes.case import router as case_router
from app.routes.ioc import router as ioc_router
from app.routes.dashboard import router as dashboard_router
from app.routes.seed import router as seed_router
from app.routes.news import router as news_router

__all__ = ["case_router", "ioc_router", "dashboard_router", "seed_router", "news_router"]
