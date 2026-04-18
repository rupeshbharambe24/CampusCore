"""Authentication and authorization dependencies.

Supports two modes:
1. **Local auth** (when SUPABASE_JWT_SECRET is unset): FastAPI issues its own JWTs
   signed with a local secret. Used for dev / early testing.
2. **Supabase auth** (when SUPABASE_JWT_SECRET is set): validates JWTs issued by
   Supabase Auth against the project's JWT secret.

Both modes extract `sub` (user UUID) from the token and load the User row.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select

from app.core.config import Settings, get_settings
from app.core.db import DbSession
from app.models.user import User

# ---------------------------------------------------------------------------
# Password hashing (local auth only) — uses bcrypt directly (passlib is unmaintained)
# ---------------------------------------------------------------------------
_LOCAL_JWT_SECRET = "campuscore-local-dev-secret-change-in-prod"
_JWT_ALGORITHM = "HS256"
_ACCESS_TOKEN_EXPIRE_MINUTES = 60

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: uuid.UUID, settings: Settings | None = None) -> str:
    """Create a local JWT. Used only when Supabase is not configured."""
    secret = (settings and settings.supabase_jwt_secret) or _LOCAL_JWT_SECRET
    expire = datetime.now(UTC) + timedelta(minutes=_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    token: str = jwt.encode(payload, secret, algorithm=_JWT_ALGORITHM)
    return token


def _get_jwt_secret(settings: Settings) -> str:
    return settings.supabase_jwt_secret or _LOCAL_JWT_SECRET


async def _get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing authorization header")

    secret = _get_jwt_secret(settings)
    try:
        payload = jwt.decode(credentials.credentials, secret, algorithms=[_JWT_ALGORITHM])
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc

    result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    return user


CurrentUser = Annotated[User, Depends(_get_current_user)]
