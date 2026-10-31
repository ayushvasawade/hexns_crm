import asyncio
import time
import httpx
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.user import User
from app.modules.auth.security import hash_password, verify_password, create_access_token, decode_access_token

async def run_measurements():
    print("--- BENCHMARKING BACKEND AUTH STAGES ---")
    
    # 1. Test Password Hash Verification
    sample_password = "Hexns@12345"
    sample_hash = hash_password(sample_password)
    
    t0 = time.perf_counter()
    res = verify_password(sample_password, sample_hash)
    t1 = time.perf_counter()
    verify_duration_ms = (t1 - t0) * 1000
    print(f"4. Password hash verification: {verify_duration_ms:.2f} ms")
    
    # 2. Test Database Connection and User Lookup
    t0 = time.perf_counter()
    async with AsyncSessionLocal() as db:
        t_conn = time.perf_counter()
        user = await db.scalar(select(User).where(User.email == "admin@hexns.com"))
        t_query = time.perf_counter()
    db_conn_ms = (t_conn - t0) * 1000
    db_lookup_ms = (t_query - t_conn) * 1000
    total_db_ms = (t_query - t0) * 1000
    print(f"3a. Neon DB connection pool checkout/connect: {db_conn_ms:.2f} ms")
    print(f"3b. Neon DB user SELECT query: {db_lookup_ms:.2f} ms")
    print(f"3. Total Neon PostgreSQL user lookup: {total_db_ms:.2f} ms")
    
    # 3. Test JWT Generation
    if user:
        t0 = time.perf_counter()
        token = create_access_token(user.id)
        t1 = time.perf_counter()
        jwt_gen_ms = (t1 - t0) * 1000
        print(f"5. JWT generation: {jwt_gen_ms:.2f} ms")
        
        # Test JWT Decode
        t0 = time.perf_counter()
        sub = decode_access_token(token)
        t1 = time.perf_counter()
        jwt_dec_ms = (t1 - t0) * 1000
        print(f"5b. JWT decode/validate: {jwt_dec_ms:.2f} ms")
    
    # 4. Measure via FastAPI TestClient (or httpx AsyncClient)
    from app.main import create_application
    app = create_application()
    
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Measure /auth/login
        t0 = time.perf_counter()
        login_res = await client.post("/api/v1/auth/login", json={"email": "admin@hexns.com", "password": "Hexns@12345"})
        t1 = time.perf_counter()
        login_endpoint_ms = (t1 - t0) * 1000
        print(f"2. FastAPI /auth/login total endpoint: {login_endpoint_ms:.2f} ms (Status: {login_res.status_code})")
        
        token = login_res.json().get("access_token")
        
        # Measure /auth/me
        t0 = time.perf_counter()
        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        t1 = time.perf_counter()
        me_endpoint_ms = (t1 - t0) * 1000
        print(f"6. FastAPI /auth/me total endpoint: {me_endpoint_ms:.2f} ms (Status: {me_res.status_code})")

if __name__ == "__main__":
    asyncio.run(run_measurements())

