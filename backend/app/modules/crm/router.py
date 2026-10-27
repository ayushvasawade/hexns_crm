from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Annotated, Any, TypeVar
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.crm import (
    Client, CompanySettings, Expense, Invoice, InvoiceLineItem, Package,
    PackageItem, Payment, Quotation, QuotationLineItem, Retainer, Service,
)
from app.modules.auth.dependencies import CurrentUser
from app.modules.crm.finance import (
    apply_document_totals, build_lines, money, owned_client, owned_service,
)
from app.modules.crm.schemas import (
    ClientCreate, ClientResponse, ClientUpdate, CompanySettingsResponse,
    CompanySettingsUpdate, ExpenseCreate, ExpenseResponse, ExpenseUpdate,
    InvoiceCreate, InvoiceResponse, InvoiceUpdate, PackageCreate, PackageResponse,
    PackageUpdate, PaymentCreate, PaymentResponse, PaymentUpdate, QuotationCreate,
    QuotationResponse, QuotationUpdate, RetainerCreate, RetainerResponse,
    RetainerUpdate, ServiceCreate, ServiceResponse, ServiceUpdate,
    LineItemInput,
)

router = APIRouter()
Db = Annotated[AsyncSession, Depends(get_db)]

T = TypeVar("T")


async def page_query(
    db: AsyncSession,
    model: type[T],
    owner_id: UUID,
    page: int,
    page_size: int,
    search: str | None = None,
    status_filter: str | None = None,
    extra: Any = None,
    options: tuple[Any, ...] = (),
) -> tuple[list[T], int]:
    conditions = [model.owner_id == owner_id]
    if status_filter and hasattr(model, "status"):
        conditions.append(model.status == status_filter)
    if search:
        searchable = [
            getattr(model, name).ilike(f"%{search}%")
            for name in ("name", "title", "brand_trade_name", "legal_entity_name",
                         "service_name", "quotation_number", "invoice_number",
                         "payment_number", "transaction_reference", "expense_number",
                         "retainer_name")
            if hasattr(model, name)
        ]
        if searchable:
            from sqlalchemy import or_
            conditions.append(or_(*searchable))
    if extra is not None:
        conditions.append(extra)
    count = await db.scalar(select(func.count()).select_from(model).where(*conditions))
    result = await db.scalars(
        select(model)
        .where(*conditions)
        .options(*options)
        .order_by(model.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result), int(count or 0)


def paging(page: int, page_size: int) -> tuple[int, int]:
    if page < 1 or page_size < 1 or page_size > 100:
        raise HTTPException(status_code=422, detail="page must be >= 1 and page_size must be between 1 and 100")
    return page, page_size


async def owned_or_404(db: AsyncSession, model: type[T], owner_id: UUID, item_id: UUID, options: tuple[Any, ...] = ()) -> T:
    item = await db.scalar(select(model).where(model.id == item_id, model.owner_id == owner_id).options(*options))
    if item is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return item


async def commit_or_conflict(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="The record conflicts with existing data") from exc


@router.get("/clients", response_model=dict)
async def list_clients(
    db: Db, user: CurrentUser, page: int = 1, page_size: int = 25,
    search: str | None = None, status_filter: str | None = Query(None, alias="status"),
) -> dict:
    page, page_size = paging(page, page_size)
    items, total = await page_query(db, Client, user.id, page, page_size, search, status_filter)
    return {"items": [ClientResponse.model_validate(x) for x in items], "total": total, "page": page, "page_size": page_size}


@router.post("/clients", response_model=ClientResponse, status_code=201)
async def create_client(payload: ClientCreate, db: Db, user: CurrentUser) -> Client:
    item = Client(owner_id=user.id, **payload.model_dump())
    db.add(item)
    await commit_or_conflict(db)
    await db.refresh(item)
    return item


@router.get("/clients/{item_id}", response_model=ClientResponse)
async def get_client(item_id: UUID, db: Db, user: CurrentUser) -> Client:
    return await owned_or_404(db, Client, user.id, item_id)


@router.patch("/clients/{item_id}", response_model=ClientResponse)
async def update_client(item_id: UUID, payload: ClientUpdate, db: Db, user: CurrentUser) -> Client:
    item = await owned_or_404(db, Client, user.id, item_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await commit_or_conflict(db)
    await db.refresh(item)
    return item


@router.delete("/clients/{item_id}", status_code=204)
async def delete_client(item_id: UUID, db: Db, user: CurrentUser) -> Response:
    item = await owned_or_404(db, Client, user.id, item_id)
    item.status = "Archived"
    await commit_or_conflict(db)
    return Response(status_code=204)


@router.get("/services", response_model=dict)
async def list_services(
    db: Db, user: CurrentUser, page: int = 1, page_size: int = 25,
    search: str | None = None, status_filter: str | None = Query(None, alias="status"),
) -> dict:
    page, page_size = paging(page, page_size)
    items, total = await page_query(db, Service, user.id, page, page_size, search, status_filter)
    return {"items": [ServiceResponse.model_validate(x) for x in items], "total": total, "page": page, "page_size": page_size}


@router.post("/services", response_model=ServiceResponse, status_code=201)
async def create_service(payload: ServiceCreate, db: Db, user: CurrentUser) -> Service:
    item = Service(owner_id=user.id, **payload.model_dump())
    db.add(item)
    await commit_or_conflict(db)
    await db.refresh(item)
    return item


@router.get("/services/{item_id}", response_model=ServiceResponse)
async def get_service(item_id: UUID, db: Db, user: CurrentUser) -> Service:
    return await owned_or_404(db, Service, user.id, item_id)


@router.patch("/services/{item_id}", response_model=ServiceResponse)
async def update_service(item_id: UUID, payload: ServiceUpdate, db: Db, user: CurrentUser) -> Service:
    item = await owned_or_404(db, Service, user.id, item_id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(item, key, value)
    if not item.min_price <= item.default_price <= item.max_price:
        raise HTTPException(status_code=422, detail="Prices must satisfy min_price <= default_price <= max_price")
    await commit_or_conflict(db)
    await db.refresh(item)
    return item


@router.delete("/services/{item_id}", status_code=204)
async def delete_service(item_id: UUID, db: Db, user: CurrentUser) -> Response:
    item = await owned_or_404(db, Service, user.id, item_id)
    item.status = "Inactive"
    await commit_or_conflict(db)
    return Response(status_code=204)


async def package_options() -> tuple[Any, ...]:
    return (selectinload(Package.items).selectinload(PackageItem.service),)


@router.get("/packages", response_model=dict)
async def list_packages(
    db: Db, user: CurrentUser, page: int = 1, page_size: int = 25,
    search: str | None = None, status_filter: str | None = Query(None, alias="status"),
) -> dict:
    page, page_size = paging(page, page_size)
    items, total = await page_query(db, Package, user.id, page, page_size, search, status_filter, options=await package_options())
    return {"items": [PackageResponse.model_validate(x) for x in items], "total": total, "page": page, "page_size": page_size}


async def replace_package_items(db: AsyncSession, package: Package, inputs: list[Any], owner_id: UUID) -> None:
    for entry in inputs:
        await owned_service(db, owner_id, entry.service_id)
    await db.execute(delete(PackageItem).where(PackageItem.package_id == package.id))
    new_items = [
        PackageItem(
            package_id=package.id,
            service_id=entry.service_id,
            quantity=entry.quantity,
            unit=entry.unit,
            default_unit_price=entry.default_unit_price,
        )
        for entry in inputs
    ]
    db.add_all(new_items)


@router.post("/packages", response_model=PackageResponse, status_code=201)
async def create_package(payload: PackageCreate, db: Db, user: CurrentUser) -> Package:
    values = payload.model_dump(exclude={"items"})
    item = Package(owner_id=user.id, **values)
    db.add(item)
    await db.flush()
    await replace_package_items(db, item, payload.items, user.id)
    await commit_or_conflict(db)
    return await owned_or_404(db, Package, user.id, item.id, await package_options())


@router.get("/packages/{item_id}", response_model=PackageResponse)
async def get_package(item_id: UUID, db: Db, user: CurrentUser) -> Package:
    return await owned_or_404(db, Package, user.id, item_id, await package_options())


@router.patch("/packages/{item_id}", response_model=PackageResponse)
async def update_package(item_id: UUID, payload: PackageUpdate, db: Db, user: CurrentUser) -> Package:
    item = await owned_or_404(db, Package, user.id, item_id, await package_options())
    updates = payload.model_dump(exclude_unset=True, exclude={"items"})
    for key, value in updates.items():
        setattr(item, key, value)
    if payload.items is not None:
        await replace_package_items(db, item, payload.items, user.id)
    await commit_or_conflict(db)
    return await owned_or_404(db, Package, user.id, item.id, await package_options())


@router.delete("/packages/{item_id}", status_code=204)
async def delete_package(item_id: UUID, db: Db, user: CurrentUser) -> Response:
    item = await owned_or_404(db, Package, user.id, item_id)
    await db.delete(item)
    await commit_or_conflict(db)
    return Response(status_code=204)


async def quotation_options() -> tuple[Any, ...]:
    return (selectinload(Quotation.lines),)


async def invoice_options() -> tuple[Any, ...]:
    return (selectinload(Invoice.lines),)


def quotation_status_transition(current: str, new: str) -> None:
    allowed = {
        "Draft": {"Draft", "Sent", "Rejected"},
        "Sent": {"Sent", "Viewed", "Accepted", "Rejected", "Expired"},
        "Viewed": {"Viewed", "Accepted", "Rejected", "Expired"},
        "Accepted": {"Accepted", "Converted"},
        "Rejected": {"Rejected", "Draft"},
        "Expired": {"Expired", "Draft"},
        "Converted": {"Converted"},
    }
    if new not in allowed.get(current, {current}):
        raise HTTPException(status_code=422, detail=f"Invalid quotation status transition: {current} -> {new}")


def invoice_status_transition(current: str, new: str) -> None:
    allowed = {
        "Draft": {"Draft", "Sent", "Cancelled"},
        "Sent": {"Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"},
        "Partially Paid": {"Partially Paid", "Paid", "Overdue", "Cancelled"},
        "Overdue": {"Overdue", "Partially Paid", "Paid", "Cancelled"},
        "Paid": {"Paid"},
        "Cancelled": {"Cancelled"},
    }
    if new not in allowed.get(current, {current}):
        raise HTTPException(status_code=422, detail=f"Invalid invoice status transition: {current} -> {new}")


async def prepare_document_lines(
    db: AsyncSession,
    owner_id: UUID,
    inputs: list[Any],
    model: type[QuotationLineItem] | type[InvoiceLineItem],
    parent_field: str,
    parent_id: UUID,
) -> tuple[list[object], dict[str, Decimal]]:
    lines, values = await build_lines(db, owner_id, inputs, model, parent_field)
    for line in lines:
        setattr(line, parent_field, parent_id)
    return lines, values


async def rebuild_document_totals(
    db: AsyncSession,
    owner_id: UUID,
    existing_lines: list[Any],
    line_model: type[QuotationLineItem] | type[InvoiceLineItem],
    parent_field: str,
    parent_id: UUID,
    discount_type: str,
    discount_value: Decimal,
    inter_state: bool,
) -> dict[str, Any]:
    inputs = [LineItemInput.model_validate(line) for line in existing_lines]
    lines, values = await prepare_document_lines(
        db, owner_id, inputs, line_model, parent_field, parent_id
    )
    totals = apply_document_totals(lines, values, discount_type, discount_value, inter_state)
    return {"lines": lines, **totals}


@router.get("/quotations", response_model=dict)
async def list_quotations(
    db: Db, user: CurrentUser, page: int = 1, page_size: int = 25,
    search: str | None = None, status_filter: str | None = Query(None, alias="status"),
    client_id: UUID | None = None,
) -> dict:
    page, page_size = paging(page, page_size)
    extra = Quotation.client_id == client_id if client_id else None
    items, total = await page_query(db, Quotation, user.id, page, page_size, search, status_filter, extra, await quotation_options())
    return {"items": [QuotationResponse.model_validate(x) for x in items], "total": total, "page": page, "page_size": page_size}


@router.post("/quotations", response_model=QuotationResponse, status_code=201)
async def create_quotation(payload: QuotationCreate, db: Db, user: CurrentUser) -> Quotation:
    await owned_client(db, user.id, payload.client_id)
    item = Quotation(
        owner_id=user.id,
        created_by_id=user.id,
        quotation_number=payload.quotation_number,
        revision_number=1,
        client_id=payload.client_id,
        project_title=payload.project_title,
        quotation_date=payload.quotation_date,
        valid_until=payload.valid_until,
        place_of_supply=payload.place_of_supply,
        is_inter_state=payload.is_inter_state,
        sales_executive=payload.sales_executive,
        document_discount_type=payload.document_discount_type,
        document_discount_value=payload.document_discount_value,
        payment_terms=payload.payment_terms,
        delivery_timeline=payload.delivery_timeline,
        validity_days=payload.validity_days,
        scope_notes=payload.scope_notes,
        exclusions=payload.exclusions,
        terms_and_conditions=payload.terms_and_conditions,
        internal_notes=payload.internal_notes,
        status=payload.status or "Draft",
        total_line_subtotal=0,
        total_item_discount=0,
        document_discount_amount=0,
        total_taxable_amount=0,
        cgst_amount=0,
        sgst_amount=0,
        igst_amount=0,
        grand_total=0,
    )
    db.add(item)
    await db.flush()
    lines, values = await prepare_document_lines(db, user.id, payload.line_items, QuotationLineItem, "quotation_id", item.id)
    db.add_all(lines)
    totals = apply_document_totals(lines, values, payload.document_discount_type, payload.document_discount_value, payload.is_inter_state)
    for key, value in totals.items():
        setattr(item, key, value)
    await commit_or_conflict(db)
    return await owned_or_404(db, Quotation, user.id, item.id, await quotation_options())


@router.get("/quotations/{item_id}", response_model=QuotationResponse)
async def get_quotation(item_id: UUID, db: Db, user: CurrentUser) -> Quotation:
    return await owned_or_404(db, Quotation, user.id, item_id, await quotation_options())


@router.post("/quotations/{item_id}/convert", response_model=InvoiceResponse, status_code=201)
async def convert_quotation(
    item_id: UUID,
    db: Db,
    user: CurrentUser,
    invoice_number: str = Query(min_length=1, max_length=60),
    due_date: date = Query(...),
) -> Invoice:
    quote = await owned_or_404(db, Quotation, user.id, item_id, await quotation_options())
    if quote.status not in {"Accepted", "Converted"}:
        raise HTTPException(status_code=422, detail="Only accepted quotations can be converted")
    if quote.status == "Converted" or quote.converted_to_invoice_id:
        raise HTTPException(status_code=409, detail="Quotation has already been converted")
    invoice = Invoice(
        owner_id=user.id,
        created_by_id=user.id,
        invoice_number=invoice_number,
        quotation_id=quote.id,
        client_id=quote.client_id,
        project_title=quote.project_title,
        invoice_date=date.today(),
        due_date=due_date,
        place_of_supply=quote.place_of_supply,
        is_inter_state=quote.is_inter_state,
        document_discount_type=quote.document_discount_type,
        document_discount_value=quote.document_discount_value,
        total_line_subtotal=quote.total_line_subtotal,
        total_item_discount=quote.total_item_discount,
        document_discount_amount=quote.document_discount_amount,
        total_taxable_amount=quote.total_taxable_amount,
        cgst_amount=quote.cgst_amount,
        sgst_amount=quote.sgst_amount,
        igst_amount=quote.igst_amount,
        grand_total=quote.grand_total,
        amount_paid=Decimal("0"),
        balance_due=quote.grand_total,
        status="Sent",
        notes=f"Generated from quotation {quote.quotation_number}. Payment terms: {quote.payment_terms}",
        bank_details={},
    )
    db.add(invoice)
    await db.flush()
    invoice_lines = [
        InvoiceLineItem(
            invoice_id=invoice.id,
            service_id=line.service_id,
            service_name=line.service_name,
            category=line.category,
            description=line.description,
            sac_code=line.sac_code,
            quantity=line.quantity,
            billing_unit=line.billing_unit,
            min_price=line.min_price,
            default_price=line.default_price,
            max_price=line.max_price,
            selected_tier=line.selected_tier,
            negotiated_unit_price=line.negotiated_unit_price,
            item_discount_type=line.item_discount_type,
            item_discount_value=line.item_discount_value,
            item_discount_amount=line.item_discount_amount,
            line_subtotal=line.line_subtotal,
            taxable_amount=line.taxable_amount,
            gst_rate=line.gst_rate,
            tax_amount=line.tax_amount,
            line_total=line.line_total,
        )
        for line in quote.lines
    ]
    db.add_all(invoice_lines)
    quote.status = "Converted"
    quote.converted_to_invoice_id = invoice.id
    await commit_or_conflict(db)
    return await owned_or_404(db, Invoice, user.id, invoice.id, await invoice_options())


@router.patch("/quotations/{item_id}", response_model=QuotationResponse)
async def update_quotation(item_id: UUID, payload: QuotationUpdate, db: Db, user: CurrentUser) -> Quotation:
    item = await owned_or_404(db, Quotation, user.id, item_id, await quotation_options())
    updates = payload.model_dump(exclude_unset=True, exclude={"line_items"})
    if "status" in updates:
        quotation_status_transition(item.status, updates["status"])
    for key, value in updates.items():
        setattr(item, key, value)
    needs_recalculation = payload.line_items is not None or any(
        field in updates for field in ("document_discount_type", "document_discount_value", "is_inter_state")
    )
    if needs_recalculation:
        source_lines = payload.line_items if payload.line_items is not None else list(item.lines)
        item.lines.clear()
        await db.flush()
        recalculated = await rebuild_document_totals(
            db, user.id, source_lines, QuotationLineItem, "quotation_id", item.id,
            item.document_discount_type, item.document_discount_value, item.is_inter_state,
        )
        new_lines = recalculated.pop("lines")
        db.add_all(new_lines)
        totals = recalculated
        for key, value in totals.items():
            setattr(item, key, value)
    await commit_or_conflict(db)
    return await owned_or_404(db, Quotation, user.id, item.id, await quotation_options())


@router.delete("/quotations/{item_id}", status_code=204)
async def delete_quotation(item_id: UUID, db: Db, user: CurrentUser) -> Response:
    item = await owned_or_404(db, Quotation, user.id, item_id)
    if item.status == "Converted":
        raise HTTPException(status_code=409, detail="Converted quotations cannot be deleted")
    await db.delete(item)
    await commit_or_conflict(db)
    return Response(status_code=204)


@router.get("/invoices", response_model=dict)
async def list_invoices(
    db: Db, user: CurrentUser, page: int = 1, page_size: int = 25,
    search: str | None = None, status_filter: str | None = Query(None, alias="status"),
    client_id: UUID | None = None,
) -> dict:
    page, page_size = paging(page, page_size)
    extra = Invoice.client_id == client_id if client_id else None
    items, total = await page_query(db, Invoice, user.id, page, page_size, search, status_filter, extra, await invoice_options())
    return {"items": [InvoiceResponse.model_validate(x) for x in items], "total": total, "page": page, "page_size": page_size}


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
async def create_invoice(payload: InvoiceCreate, db: Db, user: CurrentUser) -> Invoice:
    await owned_client(db, user.id, payload.client_id)
    if payload.quotation_id:
        await owned_or_404(db, Quotation, user.id, payload.quotation_id)
    item = Invoice(
        owner_id=user.id,
        created_by_id=user.id,
        invoice_number=payload.invoice_number,
        quotation_id=payload.quotation_id,
        client_id=payload.client_id,
        project_title=payload.project_title,
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
        place_of_supply=payload.place_of_supply,
        is_inter_state=payload.is_inter_state,
        document_discount_type=payload.document_discount_type,
        document_discount_value=payload.document_discount_value,
        notes=payload.notes,
        bank_details=payload.bank_details,
        status=payload.status or "Draft",
        amount_paid=0,
        balance_due=0,
        total_line_subtotal=0,
        total_item_discount=0,
        document_discount_amount=0,
        total_taxable_amount=0,
        cgst_amount=0,
        sgst_amount=0,
        igst_amount=0,
        grand_total=0,
    )
    db.add(item)
    await db.flush()
    lines, values = await prepare_document_lines(db, user.id, payload.line_items, InvoiceLineItem, "invoice_id", item.id)
    db.add_all(lines)
    totals = apply_document_totals(lines, values, payload.document_discount_type, payload.document_discount_value, payload.is_inter_state)
    for key, value in totals.items():
        setattr(item, key, value)
    item.balance_due = item.grand_total
    await commit_or_conflict(db)
    return await owned_or_404(db, Invoice, user.id, item.id, await invoice_options())


@router.get("/invoices/{item_id}", response_model=InvoiceResponse)
async def get_invoice(item_id: UUID, db: Db, user: CurrentUser) -> Invoice:
    return await owned_or_404(db, Invoice, user.id, item_id, await invoice_options())


@router.patch("/invoices/{item_id}", response_model=InvoiceResponse)
async def update_invoice(item_id: UUID, payload: InvoiceUpdate, db: Db, user: CurrentUser) -> Invoice:
    item = await owned_or_404(db, Invoice, user.id, item_id, await invoice_options())
    if item.amount_paid > 0 and payload.line_items is not None:
        raise HTTPException(status_code=409, detail="Paid invoices cannot have their line items changed")
    updates = payload.model_dump(exclude_unset=True, exclude={"line_items"})
    if "status" in updates:
        invoice_status_transition(item.status, updates["status"])
    for key, value in updates.items():
        setattr(item, key, value)
    needs_recalculation = payload.line_items is not None or any(
        field in updates for field in ("document_discount_type", "document_discount_value", "is_inter_state")
    )
    if needs_recalculation:
        source_lines = payload.line_items if payload.line_items is not None else list(item.lines)
        item.lines.clear()
        await db.flush()
        recalculated = await rebuild_document_totals(
            db, user.id, source_lines, InvoiceLineItem, "invoice_id", item.id,
            item.document_discount_type, item.document_discount_value, item.is_inter_state,
        )
        new_lines = recalculated.pop("lines")
        db.add_all(new_lines)
        totals = recalculated
        for key, value in totals.items():
            setattr(item, key, value)
        item.balance_due = money(item.grand_total - item.amount_paid)
    await commit_or_conflict(db)
    return await owned_or_404(db, Invoice, user.id, item.id, await invoice_options())


@router.delete("/invoices/{item_id}", status_code=204)
async def delete_invoice(item_id: UUID, db: Db, user: CurrentUser) -> Response:
    item = await owned_or_404(db, Invoice, user.id, item_id)
    if item.amount_paid > 0:
        raise HTTPException(status_code=409, detail="Invoices with payments cannot be deleted")
    await db.delete(item)
    await commit_or_conflict(db)
    return Response(status_code=204)


@router.get("/payments", response_model=dict)
async def list_payments(
    db: Db, user: CurrentUser, page: int = 1, page_size: int = 25,
    search: str | None = None, status_filter: str | None = Query(None, alias="status"),
    invoice_id: UUID | None = None,
) -> dict:
    page, page_size = paging(page, page_size)
    extra = Payment.invoice_id == invoice_id if invoice_id else None
    items, total = await page_query(db, Payment, user.id, page, page_size, search, status_filter, extra)
    return {"items": [PaymentResponse.model_validate(x) for x in items], "total": total, "page": page, "page_size": page_size}


async def recalculate_invoice(invoice: Invoice) -> None:
    completed = [payment.amount for payment in invoice.payments if payment.status == "Completed"]
    invoice.amount_paid = money(sum(completed, Decimal("0")))
    invoice.balance_due = money(invoice.grand_total - invoice.amount_paid)
    if invoice.status != "Cancelled":
        if invoice.balance_due <= 0:
            invoice.status = "Paid"
        elif invoice.amount_paid > 0:
            invoice.status = "Partially Paid"


@router.post("/payments", response_model=PaymentResponse, status_code=201)
async def create_payment(payload: PaymentCreate, db: Db, user: CurrentUser) -> Payment:
    invoice = await db.scalar(
        select(Invoice)
        .where(Invoice.id == payload.invoice_id, Invoice.owner_id == user.id)
        .options(selectinload(Invoice.payments))
        .with_for_update()
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.client_id != payload.client_id:
        raise HTTPException(status_code=422, detail="Payment client does not match invoice client")
    await recalculate_invoice(invoice)
    if payload.amount > invoice.balance_due:
        raise HTTPException(status_code=422, detail="Payment exceeds invoice balance")
    payment = Payment(owner_id=user.id, **payload.model_dump())
    db.add(payment)
    await db.flush()
    invoice.payments.append(payment)
    await recalculate_invoice(invoice)
    await commit_or_conflict(db)
    await db.refresh(payment)
    return payment


@router.get("/payments/{item_id}", response_model=PaymentResponse)
async def get_payment(item_id: UUID, db: Db, user: CurrentUser) -> Payment:
    return await owned_or_404(db, Payment, user.id, item_id)


@router.patch("/payments/{item_id}", response_model=PaymentResponse)
async def update_payment(item_id: UUID, payload: PaymentUpdate, db: Db, user: CurrentUser) -> Payment:
    payment = await owned_or_404(db, Payment, user.id, item_id)
    if payload.status is not None and payload.status not in {"Completed", "Refunded"}:
        raise HTTPException(status_code=422, detail="Invalid payment status")
    invoice = await db.scalar(
        select(Invoice).where(Invoice.id == payment.invoice_id, Invoice.owner_id == user.id)
        .options(selectinload(Invoice.payments)).with_for_update()
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(payment, key, value)
    await recalculate_invoice(invoice)
    if invoice.amount_paid > invoice.grand_total:
        raise HTTPException(status_code=422, detail="Payment changes exceed invoice balance")
    await commit_or_conflict(db)
    await db.refresh(payment)
    return payment


@router.delete("/payments/{item_id}", status_code=204)
async def delete_payment(item_id: UUID, db: Db, user: CurrentUser) -> Response:
    payment = await owned_or_404(db, Payment, user.id, item_id)
    invoice = await db.scalar(
        select(Invoice).where(Invoice.id == payment.invoice_id, Invoice.owner_id == user.id)
        .options(selectinload(Invoice.payments)).with_for_update()
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    await db.delete(payment)
    await db.flush()
    await recalculate_invoice(invoice)
    await commit_or_conflict(db)
    return Response(status_code=204)


@router.get("/expenses", response_model=dict)
async def list_expenses(
    db: Db, user: CurrentUser, page: int = 1, page_size: int = 25,
    search: str | None = None, status_filter: str | None = Query(None, alias="status"),
    category: str | None = None,
) -> dict:
    page, page_size = paging(page, page_size)
    extra = Expense.category == category if category else None
    items, total = await page_query(db, Expense, user.id, page, page_size, search, status_filter, extra)
    return {"items": [ExpenseResponse.model_validate(x) for x in items], "total": total, "page": page, "page_size": page_size}


@router.post("/expenses", response_model=ExpenseResponse, status_code=201)
async def create_expense(payload: ExpenseCreate, db: Db, user: CurrentUser) -> Expense:
    item = Expense(owner_id=user.id, **payload.model_dump())
    db.add(item)
    await commit_or_conflict(db)
    await db.refresh(item)
    return item


@router.get("/expenses/{item_id}", response_model=ExpenseResponse)
async def get_expense(item_id: UUID, db: Db, user: CurrentUser) -> Expense:
    return await owned_or_404(db, Expense, user.id, item_id)


@router.patch("/expenses/{item_id}", response_model=ExpenseResponse)
async def update_expense(item_id: UUID, payload: ExpenseUpdate, db: Db, user: CurrentUser) -> Expense:
    item = await owned_or_404(db, Expense, user.id, item_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await commit_or_conflict(db)
    await db.refresh(item)
    return item


@router.delete("/expenses/{item_id}", status_code=204)
async def delete_expense(item_id: UUID, db: Db, user: CurrentUser) -> Response:
    item = await owned_or_404(db, Expense, user.id, item_id)
    await db.delete(item)
    await commit_or_conflict(db)
    return Response(status_code=204)


@router.get("/retainers", response_model=dict)
async def list_retainers(
    db: Db, user: CurrentUser, page: int = 1, page_size: int = 25,
    search: str | None = None, status_filter: str | None = Query(None, alias="status"),
    client_id: UUID | None = None,
) -> dict:
    page, page_size = paging(page, page_size)
    extra = Retainer.client_id == client_id if client_id else None
    items, total = await page_query(db, Retainer, user.id, page, page_size, search, status_filter, extra)
    return {"items": [RetainerResponse.model_validate(x) for x in items], "total": total, "page": page, "page_size": page_size}


@router.post("/retainers", response_model=RetainerResponse, status_code=201)
async def create_retainer(payload: RetainerCreate, db: Db, user: CurrentUser) -> Retainer:
    await owned_client(db, user.id, payload.client_id)
    item = Retainer(owner_id=user.id, **payload.model_dump())
    db.add(item)
    await commit_or_conflict(db)
    await db.refresh(item)
    return item


@router.get("/retainers/{item_id}", response_model=RetainerResponse)
async def get_retainer(item_id: UUID, db: Db, user: CurrentUser) -> Retainer:
    return await owned_or_404(db, Retainer, user.id, item_id)


@router.patch("/retainers/{item_id}", response_model=RetainerResponse)
async def update_retainer(item_id: UUID, payload: RetainerUpdate, db: Db, user: CurrentUser) -> Retainer:
    item = await owned_or_404(db, Retainer, user.id, item_id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(item, key, value)
    if item.expiry_date < item.start_date:
        raise HTTPException(status_code=422, detail="Retainer expiry_date cannot precede start_date")
    await commit_or_conflict(db)
    await db.refresh(item)
    return item


@router.delete("/retainers/{item_id}", status_code=204)
async def delete_retainer(item_id: UUID, db: Db, user: CurrentUser) -> Response:
    item = await owned_or_404(db, Retainer, user.id, item_id)
    await db.delete(item)
    await commit_or_conflict(db)
    return Response(status_code=204)


def default_company_settings(owner_id: UUID) -> CompanySettings:
    return CompanySettings(
        owner_id=owner_id,
        legal_entity_name="",
        registered_address="",
        city="",
        state="",
        state_code="",
        pin_code="",
        gstin="",
        pan="",
        corporate_email="placeholder@example.com",
        corporate_phone="",
        website="",
        bank={},
        default_gst_rate=Decimal("0"),
        default_validity_days=15,
        default_payment_terms="",
        quotation_terms="",
        invoice_statutory_note="",
        quotation_prefix="",
        invoice_prefix="",
        payment_prefix="",
    )


@router.get("/settings/company", response_model=CompanySettingsResponse)
async def get_company_settings(db: Db, user: CurrentUser) -> CompanySettings:
    item = await db.scalar(select(CompanySettings).where(CompanySettings.owner_id == user.id))
    if item is None:
        raise HTTPException(status_code=404, detail="Company settings not found")
    return item


@router.put("/settings/company", response_model=CompanySettingsResponse)
async def update_company_settings(payload: CompanySettingsUpdate, db: Db, user: CurrentUser) -> CompanySettings:
    item = await db.scalar(select(CompanySettings).where(CompanySettings.owner_id == user.id))
    if item is None:
        item = default_company_settings(user.id)
        db.add(item)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await commit_or_conflict(db)
    await db.refresh(item)
    return item
