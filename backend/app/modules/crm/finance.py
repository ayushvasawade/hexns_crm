from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm import (
    Client, Invoice, InvoiceLineItem, Quotation, QuotationLineItem, Service,
)
from app.modules.crm.schemas import LineItemInput

CENT = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


async def owned_client(db: AsyncSession, owner_id: UUID, client_id: UUID) -> Client:
    client = await db.scalar(select(Client).where(Client.id == client_id, Client.owner_id == owner_id))
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


async def owned_service(db: AsyncSession, owner_id: UUID, service_id: UUID) -> Service:
    service = await db.scalar(select(Service).where(Service.id == service_id, Service.owner_id == owner_id))
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return service


async def build_lines(
    db: AsyncSession,
    owner_id: UUID,
    inputs: Iterable[LineItemInput],
    line_model: type[QuotationLineItem] | type[InvoiceLineItem],
    parent_field: str,
) -> tuple[list[object], dict[str, Decimal]]:
    lines: list[object] = []
    subtotal = Decimal("0")
    item_discount_total = Decimal("0")
    taxable_before_document_discount = Decimal("0")

    for item in inputs:
        service = await owned_service(db, owner_id, item.service_id) if item.service_id else None
        if service:
            service_name = service.service_name
            category = service.category
            description = service.description
            billing_unit = service.billing_unit
            sac_code = service.sac_code
            min_price = service.min_price
            default_price = service.default_price
            max_price = service.max_price
            gst_rate = service.gst_rate
        else:
            service_name = item.service_name
            category = item.category
            description = item.description
            billing_unit = item.billing_unit
            sac_code = item.sac_code
            min_price = item.min_price
            default_price = item.default_price
            max_price = item.max_price
            gst_rate = item.gst_rate

        line_subtotal = money(item.quantity * item.negotiated_unit_price)
        if item.item_discount_type == "percentage":
            if item.item_discount_value > 100:
                raise HTTPException(status_code=422, detail="Item discount percentage cannot exceed 100")
            discount = money(line_subtotal * item.item_discount_value / Decimal("100"))
        elif item.item_discount_type == "fixed":
            discount = money(item.item_discount_value)
            if discount > line_subtotal:
                raise HTTPException(status_code=422, detail="Item discount cannot exceed line subtotal")
        else:
            raise HTTPException(status_code=422, detail="Invalid item discount type")

        taxable = money(line_subtotal - discount)
        subtotal += line_subtotal
        item_discount_total += discount
        taxable_before_document_discount += taxable
        lines.append(
            line_model(
                **{
                    parent_field: None,
                    "service_id": item.service_id,
                    "service_name": service_name,
                    "category": category,
                    "description": description,
                    "sac_code": sac_code,
                    "quantity": item.quantity,
                    "billing_unit": billing_unit,
                    "min_price": min_price,
                    "default_price": default_price,
                    "max_price": max_price,
                    "selected_tier": item.selected_tier,
                    "negotiated_unit_price": item.negotiated_unit_price,
                    "item_discount_type": item.item_discount_type,
                    "item_discount_value": item.item_discount_value,
                    "item_discount_amount": discount,
                    "line_subtotal": line_subtotal,
                    "taxable_amount": taxable,
                    "gst_rate": gst_rate,
                    "tax_amount": Decimal("0"),
                    "line_total": taxable,
                }
            )
        )

    return lines, {
        "subtotal": money(subtotal),
        "item_discount": money(item_discount_total),
        "taxable_before_document_discount": money(taxable_before_document_discount),
    }


def apply_document_totals(
    lines: list[object],
    values: dict[str, Decimal],
    discount_type: str,
    discount_value: Decimal,
    inter_state: bool,
) -> dict[str, Decimal]:
    base = values["taxable_before_document_discount"]
    if discount_type == "percentage":
        if discount_value > 100:
            raise HTTPException(status_code=422, detail="Document discount percentage cannot exceed 100")
        document_discount = money(base * discount_value / Decimal("100"))
    elif discount_type == "fixed":
        document_discount = money(discount_value)
        if document_discount > base:
            raise HTTPException(status_code=422, detail="Document discount cannot exceed taxable subtotal")
    else:
        raise HTTPException(status_code=422, detail="Invalid document discount type")

    taxable_total = money(base - document_discount)
    cgst = Decimal("0")
    sgst = Decimal("0")
    igst = Decimal("0")
    for line in lines:
        original_taxable = line.taxable_amount
        allocated_discount = (
            money(document_discount * original_taxable / base) if base else Decimal("0")
        )
        adjusted_taxable = money(original_taxable - allocated_discount)
        tax = money(adjusted_taxable * line.gst_rate / Decimal("100"))
        line.taxable_amount = adjusted_taxable
        line.tax_amount = tax
        line.line_total = money(adjusted_taxable + tax)
        if inter_state:
            igst += tax
        else:
            cgst += money(tax / Decimal("2"))
            sgst += tax - money(tax / Decimal("2"))

    total_tax = cgst + sgst + igst
    return {
        "total_line_subtotal": values["subtotal"],
        "total_item_discount": values["item_discount"],
        "document_discount_amount": document_discount,
        "total_taxable_amount": taxable_total,
        "cgst_amount": money(cgst),
        "sgst_amount": money(sgst),
        "igst_amount": money(igst),
        "grand_total": money(taxable_total + total_tax),
    }
