from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.modules.crm.finance import apply_document_totals, money
from app.modules.crm.router import default_company_settings


def test_document_totals_use_decimal_and_split_gst():
    class Line:
        taxable_amount = Decimal("1000")
        gst_rate = Decimal("18")
        tax_amount = Decimal("0")
        line_total = Decimal("1000")

    line = Line()
    totals = apply_document_totals(
        [line],
        {
            "subtotal": Decimal("1000"),
            "item_discount": Decimal("0"),
            "taxable_before_document_discount": Decimal("1000"),
        },
        "percentage",
        Decimal("10"),
        False,
    )
    assert totals["document_discount_amount"] == Decimal("100.00")
    assert totals["total_taxable_amount"] == Decimal("900.00")
    assert totals["cgst_amount"] == Decimal("81.00")
    assert totals["sgst_amount"] == Decimal("81.00")
    assert totals["grand_total"] == Decimal("1062.00")
    assert line.taxable_amount == Decimal("900.00")


def test_document_totals_reject_invalid_discount():
    class Line:
        taxable_amount = Decimal("100")
        gst_rate = Decimal("18")
        tax_amount = Decimal("0")
        line_total = Decimal("100")

    with pytest.raises(Exception):
        apply_document_totals(
            [Line()],
            {
                "subtotal": Decimal("100"),
                "item_discount": Decimal("0"),
                "taxable_before_document_discount": Decimal("100"),
            },
            "percentage",
            Decimal("101"),
            True,
        )


@pytest.mark.asyncio
async def test_every_crm_endpoint_requires_authentication():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for path in (
            "/api/v1/clients",
            "/api/v1/services",
            "/api/v1/packages",
            "/api/v1/quotations",
            "/api/v1/invoices",
            "/api/v1/payments",
            "/api/v1/expenses",
            "/api/v1/retainers",
            "/api/v1/settings/company",
        ):
            response = await client.get(path)
            assert response.status_code == 401, path


def test_money_rounding_is_decimal():
    assert money(Decimal("1.005")) == Decimal("1.01")
    assert isinstance(money(Decimal("2.00")), Decimal)


def test_company_settings_can_be_initialized_without_manual_database_insertion():
    settings = default_company_settings(uuid4())
    assert settings.owner_id is not None
    assert settings.default_validity_days == 15
    assert settings.corporate_email == "placeholder@example.com"
