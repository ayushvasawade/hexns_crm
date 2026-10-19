from fastapi import APIRouter
from app.core.config import settings

api_router = APIRouter(prefix=settings.API_V1_STR)


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
