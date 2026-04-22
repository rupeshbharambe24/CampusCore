"""Local-dev auth endpoints. In production, Supabase Auth handles login/reset directly.

These endpoints only work when users have a `password_hash` (local dev accounts).
"""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import DbSession
from app.core.security import CurrentUser, create_access_token, hash_password, verify_password
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login", status_code=status.HTTP_200_OK, response_model=LoginResponse)
async def login(body: LoginRequest, db: DbSession) -> LoginResponse:
    result = await db.execute(
        select(User).where(User.email == body.email, User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()

    if user is None or user.password_hash is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    user.last_login_at = datetime.now(UTC)
    await db.commit()

    token = create_access_token(user.id, get_settings())
    return LoginResponse(access_token=token)


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Change password for a local-dev user. In production, use Supabase updateUser."""
    if current_user.password_hash is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This account uses Supabase auth — change password via the frontend.",
        )

    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Current password is incorrect")

    current_user.password_hash = hash_password(body.new_password)
    current_user.must_change_password = False
    await db.commit()
