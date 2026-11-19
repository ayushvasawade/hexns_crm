from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.modules.auth.dependencies import CurrentUser
from app.modules.auth.schemas import LoginRequest, TokenResponse, UserResponse
from app.modules.auth.security import create_access_token, verify_password

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
@router.post("/login/", response_model=TokenResponse, include_in_schema=False)
async def login(
    credentials: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == credentials.email))
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user),
    )


@router.get("/login", include_in_schema=False)
@router.get("/login/", include_in_schema=False)
async def login_get_not_allowed() -> None:
    """Explicit handler returning clear diagnostics if a client or redirect sends a GET request to /login."""
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail=(
            "Login requires an HTTP POST request with JSON payload (email and password). "
            "If this error occurred in the web UI, ensure NEXT_PUBLIC_API_URL uses https:// "
            "(not http://) so requests are not converted to GET by hosting redirects."
        ),
        headers={"Allow": "POST, OPTIONS"},
    )


@router.get("/me", response_model=UserResponse)
@router.get("/me/", response_model=UserResponse, include_in_schema=False)
async def current_user(user: CurrentUser) -> User:
    return user
