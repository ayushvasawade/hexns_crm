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




def test_document_totals_prompt_scenarios():
    class Line:
        taxable_amount = Decimal("10000")
        gst_rate = Decimal("18")
        tax_amount = Decimal("0")
        line_total = Decimal("10000")

    values = {
        "subtotal": Decimal("10000"),
        "item_discount": Decimal("0"),
        "taxable_before_document_discount": Decimal("10000"),
    }

    # 1. No discount
    line1 = Line()
    totals1 = apply_document_totals([line1], values, "percentage", Decimal("0"), False)
    assert totals1["document_discount_amount"] == Decimal("0.00")
    assert totals1["total_taxable_amount"] == Decimal("10000.00")
    assert totals1["cgst_amount"] == Decimal("900.00")
    assert totals1["sgst_amount"] == Decimal("900.00")
    assert totals1["grand_total"] == Decimal("11800.00")

    # 2. 10% discount (Prompt example: Subtotal: 10,000, Disc: 1,000, Taxable: 9,000, CGST: 810, SGST: 810, Total: 10,620)
    line2 = Line()
    totals2 = apply_document_totals([line2], values, "percentage", Decimal("10"), False)
    assert totals2["document_discount_amount"] == Decimal("1000.00")
    assert totals2["total_taxable_amount"] == Decimal("9000.00")
    assert totals2["cgst_amount"] == Decimal("810.00")
    assert totals2["sgst_amount"] == Decimal("810.00")
    assert totals2["grand_total"] == Decimal("10620.00")

    # 3. Fixed ₹500 discount (Prompt example: Subtotal: 10,000, Disc: 500, Taxable: 9,500, CGST: 855, SGST: 855, Total: 11,210)
    line3 = Line()
    totals3 = apply_document_totals([line3], values, "fixed", Decimal("500"), False)
    assert totals3["document_discount_amount"] == Decimal("500.00")
    assert totals3["total_taxable_amount"] == Decimal("9500.00")
    assert totals3["cgst_amount"] == Decimal("855.00")
    assert totals3["sgst_amount"] == Decimal("855.00")
    assert totals3["grand_total"] == Decimal("11210.00")

    # 4. Inter-state with 10% discount
    line4 = Line()
    totals4 = apply_document_totals([line4], values, "percentage", Decimal("10"), True)
    assert totals4["igst_amount"] == Decimal("1620.00")
    assert totals4["cgst_amount"] == Decimal("0.00")
    assert totals4["sgst_amount"] == Decimal("0.00")
    assert totals4["grand_total"] == Decimal("10620.00")

    # 5. Negative discount rejected
    with pytest.raises(Exception):
        apply_document_totals([Line()], values, "percentage", Decimal("-5"), False)

    # 6. Fixed discount exceeding subtotal rejected
    with pytest.raises(Exception):
        apply_document_totals([Line()], values, "fixed", Decimal("15000"), False)

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
