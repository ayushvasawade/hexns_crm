"""Seed script to restore the complete 202-service catalogue and packages to Neon PostgreSQL for admin@hexns.com.

Ensures:
1. All 202 genuine services across Sections 01-16 are inserted/updated with exact rates and categories from hexnsmedia_crm_service_rates(1)(1).md.
2. Services with Base Rate = 0 and Minimum Rate = 0 are fully preserved as valid source data (not skipped).
3. All 12 packages from Section 17 are seeded and kept up to date.
4. Synthetic test records (e.g., 'AI Brand Video Production <hash>') are safely unlinked and removed.
5. Database constraints (uq_services_owner_name_cat, updated ck_services_prices) are applied.
6. Fully idempotent - safe to run multiple times.
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
from app.models.crm import Service, Package, PackageItem, QuotationLineItem, InvoiceLineItem


def find_markdown_file() -> Path | None:
    """Locate hexnsmedia_crm_service_rates(1)(1).md or similar markdown file."""
    candidates = [
        Path(__file__).resolve().parent.parent / "hexnsmedia_crm_service_rates(1)(1).md",
        Path(__file__).resolve().parent / "hexnsmedia_crm_service_rates(1)(1).md",
        Path.cwd() / "hexnsmedia_crm_service_rates(1)(1).md",
    ]
    for p in candidates:
        if p.exists() and p.stat().st_size > 0:
            return p
    return None


def get_service_descriptions_from_seed():
    """Extract descriptions and sac codes from seedData.ts as reference dictionary."""
    seed_path = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "seedData.ts"
    desc_map = {}
    if not seed_path.exists():
        return desc_map

    try:
        with open(seed_path, "r", encoding="utf-8") as f:
            content = f.read()

        services_match = re.search(r'export const SEED_SERVICES: ServiceItem\[\] = \[(.*?)\n\];', content, re.DOTALL)
        if services_match:
            blocks = re.findall(r'\{([^{}]+)\}', services_match.group(1))
            for b in blocks:
                m_name = re.search(r'serviceName:\s*"([^"]+)"', b)
                m_cat = re.search(r'category:\s*"([^"]+)"', b)
                m_desc = re.search(r'description:\s*"([^"]+)"', b)
                m_sac = re.search(r'sacCode:\s*"([^"]+)"', b)
                if m_name and m_cat:
                    key = (m_name.group(1), m_cat.group(1))
                    desc_map[key] = {
                        "description": m_desc.group(1) if m_desc else "",
                        "sac_code": m_sac.group(1) if m_sac else "998311",
                    }
    except Exception:
        pass
    return desc_map


def parse_catalogue_services():
    """Parse all 202 genuine services directly from Markdown rate master or seedData.ts."""
    md_path = find_markdown_file()
    desc_map = get_service_descriptions_from_seed()

    if md_path:
        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()

        section_pattern = re.compile(r'## Section (\d+) --- ([^\n]+)\n(.*?)(?=(?:## Section \d+|$))', re.DOTALL)
        matches = section_pattern.findall(content)
        services = []

        for sec_num, sec_title, sec_body in matches:
            if int(sec_num) == 17:
                continue  # Packages handled separately
            category = sec_title.strip()
            for line in sec_body.splitlines():
                sline = line.strip()
                if not sline or sline.startswith("Service") or sline.startswith("---") or sline.startswith("-"):
                    continue

                m = re.match(r'^(.*?)\s{2,}(.*?)\s{2,}(\d+)\s+(\d+)$', sline)
                if m:
                    s_name, b_unit, base_r, min_r = m.groups()
                    s_name = s_name.strip()
                    b_unit = b_unit.strip()
                    def_price = Decimal(base_r)
                    min_price = Decimal(min_r)
                    max_price = Decimal(str(round(float(def_price) * 1.3))) if def_price > 0 else Decimal("0")
                    cost_price = Decimal(str(round(float(def_price) * 0.5))) if def_price > 0 else Decimal("0")

                    # Consult seed data for rich description or default
                    info = desc_map.get((s_name, category), {})
                    description = info.get("description") or f"Professional {s_name} ({b_unit}) delivered to brand specifications."
                    sac_code = info.get("sac_code") or "998311"

                    services.append({
                        "service_name": s_name,
                        "category": category,
                        "description": description,
                        "billing_unit": b_unit,
                        "sac_code": sac_code,
                        "min_price": min_price,
                        "default_price": def_price,
                        "max_price": max_price,
                        "internal_cost_price": cost_price,
                        "gst_rate": Decimal("18"),
                        "status": "Active",
                    })

        if len(services) == 202:
            return services

    # Fallback to seedData.ts if md not matching
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
        s_max = Decimal(get_val(r'maxPrice:\s*(\d+(?:\.\d+)?)', "0" if s_def == 0 else str(float(s_def) * 1.3)))
        s_cost = Decimal(get_val(r'internalCostPrice:\s*(\d+(?:\.\d+)?)', "0" if s_def == 0 else str(float(s_def) * 0.5)))
        s_gst = Decimal(get_val(r'gstRate:\s*(\d+(?:\.\d+)?)', "18"))
        s_stat = get_val(r'status:\s*"([^"]+)"', "Active")

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


def parse_catalogue_packages():
    """Parse 12 packages from seedData.ts mirroring Section 17 of rate master."""
    seed_path = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "seedData.ts"
    with open(seed_path, "r", encoding="utf-8") as f:
        content = f.read()

    packages_match = re.search(r'export const SEED_PACKAGES: Package\[\] = \[(.*?)\n\];', content, re.DOTALL)
    if not packages_match:
        return []

    blocks = re.findall(r'\{([^{}]+)\}', packages_match.group(1))
    packages = []
    for b in blocks:
        def get_val(pattern, default=""):
            m = re.search(pattern, b)
            return m.group(1) if m else default

        name = get_val(r'name:\s*"([^"]+)"')
        desc = get_val(r'description:\s*"([^"]+)"')
        duration = get_val(r'duration:\s*"([^"]+)"')
        scope = get_val(r'scope:\s*"([^"]+)"')
        std_price = Decimal(get_val(r'standardPrice:\s*(\d+(?:\.\d+)?)', "0"))
        final_price = Decimal(get_val(r'finalPrice:\s*(\d+(?:\.\d+)?)', str(std_price)))
        min_price = Decimal(get_val(r'minPrice:\s*(\d+(?:\.\d+)?)', str(final_price * Decimal("0.8"))))
        gst_rate = Decimal(get_val(r'gstRate:\s*(\d+(?:\.\d+)?)', "18"))
        pres_mode = get_val(r'presentationMode:\s*"([^"]+)"', "Itemized")

        packages.append({
            "name": name,
            "description": desc,
            "duration": duration,
            "scope": scope,
            "standard_price": std_price,
            "package_discount": Decimal("0"),
            "final_price": final_price,
            "min_price": min_price,
            "gst_rate": gst_rate,
            "presentation_mode": pres_mode,
            "status": "Active"
        })
    return packages


async def apply_database_constraints():
    """Ensure constraint uq_services_owner_name_cat and updated ck_services_prices are applied in Neon DB."""
    async with engine.begin() as conn:
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

        # Update ck_services_prices to allow zero base and zero min rates
        print("Updating check constraint 'ck_services_prices' for zero-rate support...")
        await conn.execute(text("ALTER TABLE services DROP CONSTRAINT IF EXISTS ck_services_prices;"))
        await conn.execute(text("""
            ALTER TABLE services 
            ADD CONSTRAINT ck_services_prices 
            CHECK (
                min_price >= 0 AND default_price >= 0 AND max_price >= 0 
                AND (min_price = 0 OR default_price = 0 OR default_price >= min_price) 
                AND (default_price = 0 OR max_price = 0 OR max_price >= default_price)
            );
        """))


async def restore_service_catalogue():
    print("==================================================")
    print("   HEXNS CRM — Live Service Catalogue Restoration  ")
    print("==================================================")

    # 1. Update schema constraints
    await apply_database_constraints()

    catalogue = parse_catalogue_services()
    packages_data = parse_catalogue_packages()
    print(f"Extracted {len(catalogue)} genuine services from catalogue.")
    print(f"Extracted {len(packages_data)} genuine packages from catalogue.")

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
        if synthetic_records:
            print(f"Identified {len(synthetic_records)} synthetic test records to remove.")

        # 4. Upsert all 202 genuine services
        imported_count = 0
        updated_count = 0

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
            ai_video_svc = inserted_services.get(("AI Video Generation", "AI Services"))
            if not ai_video_svc:
                ai_video_svc = next(iter(inserted_services.values()))

            pkg_update = (
                update(PackageItem)
                .where(PackageItem.service_id.in_(synthetic_ids))
                .values(service_id=ai_video_svc.id)
            )
            pkg_res = await session.execute(pkg_update)

            q_update = (
                update(QuotationLineItem)
                .where(QuotationLineItem.service_id.in_(synthetic_ids))
                .values(service_id=None)
            )
            await session.execute(q_update)

            inv_update = (
                update(InvoiceLineItem)
                .where(InvoiceLineItem.service_id.in_(synthetic_ids))
                .values(service_id=None)
            )
            await session.execute(inv_update)

            del_stmt = delete(Service).where(Service.id.in_(synthetic_ids))
            await session.execute(del_stmt)
            print(f"Deleted {len(synthetic_ids)} synthetic test services from Neon PostgreSQL.")

        # 6. Upsert the 12 Section 17 Packages
        existing_pkgs_res = await session.execute(
            select(Package).where(Package.owner_id == user.id)
        )
        existing_pkg_map = {p.name: p for p in existing_pkgs_res.scalars().all()}
        pkg_inserted = 0
        pkg_updated = 0

        for p_data in packages_data:
            p_name = p_data["name"]
            if p_name in existing_pkg_map:
                pkg_obj = existing_pkg_map[p_name]
                pkg_obj.description = p_data["description"]
                pkg_obj.duration = p_data["duration"]
                pkg_obj.scope = p_data["scope"]
                pkg_obj.standard_price = p_data["standard_price"]
                pkg_obj.package_discount = p_data["package_discount"]
                pkg_obj.final_price = p_data["final_price"]
                pkg_obj.min_price = p_data["min_price"]
                pkg_obj.gst_rate = p_data["gst_rate"]
                pkg_obj.presentation_mode = p_data["presentation_mode"]
                pkg_obj.status = p_data["status"]
                pkg_updated += 1
            else:
                new_pkg = Package(
                    id=uuid.uuid4(),
                    owner_id=user.id,
                    name=p_data["name"],
                    description=p_data["description"],
                    duration=p_data["duration"],
                    scope=p_data["scope"],
                    standard_price=p_data["standard_price"],
                    package_discount=p_data["package_discount"],
                    final_price=p_data["final_price"],
                    min_price=p_data["min_price"],
                    gst_rate=p_data["gst_rate"],
                    presentation_mode=p_data["presentation_mode"],
                    status=p_data["status"]
                )
                session.add(new_pkg)
                pkg_inserted += 1

        # Delete any synthetic packages (e.g. Growth Launch Bundle <hash>)
        syn_pkg_stmt = delete(Package).where(
            Package.owner_id == user.id,
            Package.name.like("Growth Launch Bundle%")
        )
        del_pkgs = await session.execute(syn_pkg_stmt)
        if del_pkgs.rowcount > 0:
            print(f"Deleted {del_pkgs.rowcount} synthetic test packages.")

        await session.commit()
        print("\n[SUCCESS] Transaction committed successfully!")

        # 7. Verification queries
        final_count = await session.scalar(
            select(text("COUNT(*)")).select_from(Service).where(Service.owner_id == user.id)
        )
        zero_rate_count = await session.scalar(
            select(text("COUNT(*)")).select_from(Service).where(
                Service.owner_id == user.id,
                Service.default_price == Decimal("0"),
                Service.min_price == Decimal("0")
            )
        )
        pkg_count = await session.scalar(
            select(text("COUNT(*)")).select_from(Package).where(Package.owner_id == user.id)
        )
        categories_res = await session.execute(
            select(Service.category, text("COUNT(*)")).where(Service.owner_id == user.id).group_by(Service.category).order_by(Service.category)
        )
        cat_counts = categories_res.fetchall()

        print(f"\nFinal Genuine Service Count in Neon for {user.email}: {final_count}")
        print(f"Zero-Rate Services in Neon (Base=0, Min=0): {zero_rate_count}")
        print(f"Final Package Count in Neon: {pkg_count}")
        print(f"Categories verified ({len(cat_counts)}):")
        for cat, cnt in cat_counts:
            print(f"  - {cat}: {cnt} services")

        assert final_count == 202, f"Expected 202 services, got {final_count}"
        assert zero_rate_count == 100, f"Expected 100 zero-rate services, got {zero_rate_count}"
        assert len(cat_counts) == 16, f"Expected 16 categories, got {len(cat_counts)}"
        assert pkg_count == 12, f"Expected 12 packages, got {pkg_count}"
        print("\nAll database assertions passed!")


if __name__ == "__main__":
    asyncio.run(restore_service_catalogue())
