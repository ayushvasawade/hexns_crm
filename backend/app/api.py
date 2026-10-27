from fastapi import APIRouter
from app.core.config import settings
from app.modules.auth.router import router as auth_router
from app.modules.crm.router import router as crm_router

api_router = APIRouter(prefix=settings.API_V1_STR)
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(crm_router, tags=["CRM"])


@api_router.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


# Future module routers will be registered here, e.g.:
# api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
# api_router.include_router(clients_router, prefix="/clients", tags=["Clients"])
