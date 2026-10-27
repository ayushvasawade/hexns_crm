import asyncio
import sys
from uuid import uuid4
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.modules.auth.security import hash_password

async def seed_user(email: str = "admin@hexns.com", password: str = "Hexns@12345", full_name: str = "Vikram Malhotra"):
    async with AsyncSessionLocal() as db:
        existing = await db.scalar(select(User).where(User.email == email))
        if existing:
            print(f"User {email} already exists (ID: {existing.id})")
            return existing
        user = User(
            id=uuid4(),
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            is_active=True,
            is_superuser=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"Created user {email} (ID: {user.id}) successfully!")
        return user

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@hexns.com"
    password = sys.argv[2] if len(sys.argv) > 2 else "Hexns@12345"
    full_name = sys.argv[3] if len(sys.argv) > 3 else "Vikram Malhotra"
    asyncio.run(seed_user(email, password, full_name))
