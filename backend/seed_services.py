"""Seed script to restore the complete 202-service catalogue to Neon PostgreSQL for admin@hexns.com.

Ensures:
1. All 202 genuine services across Sections 01-16 are inserted/updated with exact rates and categories.
2. Synthetic test records (e.g., 'AI Brand Video Production <hash>') are safely unlinked and removed.
3. Constraint uq_services_owner_name_cat allows identical service names across different categories.
4. Fully idempotent - safe to run multiple times.
"""

import asyncio
import os
import re
import sys
import uuid
from decimal import Decimal
from pathlib import Path

# Ensure backend package can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import select, text, delete, update
from app.core.database import AsyncSessionLocal, engine
from app.models.user import User
from app.models.crm import Service, PackageItem, QuotationLineItem, InvoiceLineItem

def parse_catalogue_services():
    """Parse 202 genuine services from seedData.ts which mirrors the Markdown rate master."""
    seed_path = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "seedData.ts"
    with open(seed_path, "r", encoding="utf-8") as f:
        content = f.read()

    services_match = re.search(r'export const SEED_SERVICES: ServiceItem\[\] = \[(.*?)\n\];', content, re.DOTALL)
    if not services_match:
        raise ValueError("Could not find SEED_SERVICES in seedData.ts")

    blocks = re.findall(r'\{([^{}]+)\}', services_match.group(1))
    services = []
    for b in blocks:
        def get_val(pattern, default=""):
            m = re.search(pattern, b)
            return m.group(1) if m else default

        s_name = get_val(r'serviceName:\s*"([^"]+)"')
        s_cat = get_val(r'category:\s*"([^"]+)"')
        s_desc = get_val(r'description:\s*"([^"]+)"')
        s_unit = get_val(r'billingUnit:\s*"([^"]+)"')
        s_sac = get_val(r'sacCode:\s*"([^"]+)"', "998311")
        s_min = Decimal(get_val(r'minPrice:\s*(\d+(?:\.\d+)?)', "0"))
        s_def = Decimal(get_val(r'defaultPrice:\s*(\d+(?:\.\d+)?)', "0"))
        s_max = Decimal(get_val(r'maxPrice:\s*(\d+(?:\.\d+)?)', str(float(s_def) * 1.3)))
        s_cost = Decimal(get_val(r'internalCostPrice:\s*(\d+(?:\.\d+)?)', str(float(s_def) * 0.5)))
        s_gst = Decimal(get_val(r'gstRate:\s*(\d+(?:\.\d+)?)', "18"))
        s_stat = get_val(r'status:\s*"([^"]+)"', "Active")

        # Ensure check constraint compliance: min >= 0, def >= min, max >= def
        if s_def < s_min:
            s_def = s_min
        if s_max < s_def:
            s_max = s_def

        services.append({
            "service_name": s_name,
            "category": s_cat,
            "description": s_desc,
            "billing_unit": s_unit,
            "sac_code": s_sac,
            "min_price": s_min,
            "default_price": s_def,
            "max_price": s_max,
            "internal_cost_price": s_cost,
            "gst_rate": s_gst,
            "status": s_stat,
        })
    return services


async def apply_database_constraints():
    """Ensure constraint uq_services_owner_name_cat is applied in Neon DB."""
    async with engine.begin() as conn:
        # Check existing constraints
        constraints_res = await conn.execute(text("""
            SELECT conname FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'services';
        """))
        existing_constraints = {row[0] for row in constraints_res.fetchall()}

        if "services_service_name_key" in existing_constraints:
            print("Dropping legacy unique constraint 'services_service_name_key'...")
            await conn.execute(text("ALTER TABLE services DROP CONSTRAINT services_service_name_key;"))

        if "uq_services_owner_name_cat" not in existing_constraints:
            print("Adding scoped multi-tenant constraint 'uq_services_owner_name_cat'...")
            await conn.execute(text("""
                ALTER TABLE services 
                ADD CONSTRAINT uq_services_owner_name_cat 
                UNIQUE (owner_id, service_name, category);
            """))


async def restore_service_catalogue():
    print("==================================================")
    print("   HEXNS CRM — Live Service Catalogue Restoration  ")
    print("==================================================")

    # 1. Update schema constraints
    await apply_database_constraints()

    catalogue = parse_catalogue_services()
    print(f"Extracted {len(catalogue)} genuine services from catalogue.")

    async with AsyncSessionLocal() as session:
        # 2. Verify target owner
        user = await session.scalar(select(User).where(User.email == "admin@hexns.com"))
        if not user:
            raise RuntimeError("Admin user admin@hexns.com not found in Neon database!")
        print(f"Target Account: {user.email} (ID: {user.id})")

        # 3. Identify synthetic test records
        syn_res = await session.execute(
            select(Service).where(
                Service.owner_id == user.id,
                Service.service_name.like("AI Brand Video Production%")
            )
        )
        synthetic_records = syn_res.scalars().all()
        synthetic_ids = [s.id for s in synthetic_records]
        print(f"Identified {len(synthetic_records)} synthetic test records to remove.")
        for s in synthetic_records:
            print(f"  - [TEST ARTIFACT] {s.service_name} ({s.id})")

        # 4. Upsert all 202 genuine services
        imported_count = 0
        updated_count = 0

        # Query existing genuine services for this owner
        existing_res = await session.execute(
            select(Service).where(Service.owner_id == user.id)
        )
        existing_map = {
            (s.service_name, s.category): s for s in existing_res.scalars().all()
            if s.id not in synthetic_ids
        }

        inserted_services = {}
        for s_data in catalogue:
            key = (s_data["service_name"], s_data["category"])
            if key in existing_map:
                # Update existing
                svc = existing_map[key]
                svc.description = s_data["description"]
                svc.billing_unit = s_data["billing_unit"]
                svc.sac_code = s_data["sac_code"]
                svc.min_price = s_data["min_price"]
                svc.default_price = s_data["default_price"]
                svc.max_price = s_data["max_price"]
                svc.internal_cost_price = s_data["internal_cost_price"]
                svc.gst_rate = s_data["gst_rate"]
                svc.status = s_data["status"]
                inserted_services[key] = svc
                updated_count += 1
            else:
                new_svc = Service(
                    id=uuid.uuid4(),
                    owner_id=user.id,
                    service_name=s_data["service_name"],
                    category=s_data["category"],
                    group_category=s_data.get("group_category"),
                    description=s_data["description"],
                    billing_unit=s_data["billing_unit"],
                    sac_code=s_data["sac_code"],
                    min_price=s_data["min_price"],
                    default_price=s_data["default_price"],
                    max_price=s_data["max_price"],
                    internal_cost_price=s_data["internal_cost_price"],
                    gst_rate=s_data["gst_rate"],
                    status=s_data["status"],
                )
                session.add(new_svc)
                inserted_services[key] = new_svc
                imported_count += 1

        await session.flush()
        print(f"Catalogue Upsert: {imported_count} newly inserted, {updated_count} updated.")

        # 5. Clean up references to synthetic records
        if synthetic_ids:
            # Reassign any package items to a genuine service (e.g. AI Video Generation)
            ai_video_svc = inserted_services.get(("AI Video Generation", "AI Services"))
            if not ai_video_svc:
                ai_video_svc = next(iter(inserted_services.values()))

            pkg_update = (
                update(PackageItem)
                .where(PackageItem.service_id.in_(synthetic_ids))
                .values(service_id=ai_video_svc.id)
            )
            pkg_res = await session.execute(pkg_update)
            print(f"Reassigned {pkg_res.rowcount} package item references to '{ai_video_svc.service_name}'.")

            # Nullify service_id on quotation and invoice lines
            q_update = (
                update(QuotationLineItem)
                .where(QuotationLineItem.service_id.in_(synthetic_ids))
                .values(service_id=None)
            )
            q_res = await session.execute(q_update)
            print(f"Cleaned {q_res.rowcount} quotation line item references.")

            inv_update = (
                update(InvoiceLineItem)
                .where(InvoiceLineItem.service_id.in_(synthetic_ids))
                .values(service_id=None)
            )
            inv_res = await session.execute(inv_update)
            print(f"Cleaned {inv_res.rowcount} invoice line item references.")

            # 6. Delete synthetic records
            del_stmt = delete(Service).where(Service.id.in_(synthetic_ids))
            del_res = await session.execute(del_stmt)
            print(f"Deleted {del_res.rowcount} synthetic test services from Neon PostgreSQL.")

        await session.commit()
        print("\n[SUCCESS] Transaction committed successfully!")

        # 7. Verification queries
        final_count = await session.scalar(
            select(text("COUNT(*)")).select_from(Service).where(Service.owner_id == user.id)
        )
        print(f"\nFinal Genuine Service Count in Neon for {user.email}: {final_count}")

        categories_res = await session.execute(
            select(Service.category, text("COUNT(*)")).where(Service.owner_id == user.id).group_by(Service.category).order_by(Service.category)
        )
        cat_counts = categories_res.fetchall()
        print(f"Categories verified ({len(cat_counts)}):")
        for cat, cnt in cat_counts:
            print(f"  - {cat}: {cnt} services")

        assert final_count == 202, f"Expected 202 services, got {final_count}"
        assert len(cat_counts) == 16, f"Expected 16 categories, got {len(cat_counts)}"
        print("\nAll database assertions passed!")


if __name__ == "__main__":
    asyncio.run(restore_service_catalogue())

