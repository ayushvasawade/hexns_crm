from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

MONEY = Numeric(12, 2)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OwnedMixin:
    owner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)


class Client(OwnedMixin, TimestampMixin, Base):
    __tablename__ = "clients"
    __table_args__ = (Index("ix_clients_status", "status"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legal_entity_name: Mapped[str] = mapped_column(String(200))
    brand_trade_name: Mapped[str] = mapped_column(String(200))
    primary_contact_person: Mapped[str] = mapped_column(String(160))
    official_phone: Mapped[str] = mapped_column(String(40))
    mobile: Mapped[str] = mapped_column(String(40))
    billing_email: Mapped[str] = mapped_column(String(320))
    registered_address: Mapped[str] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(100))
    pin_code: Mapped[str] = mapped_column(String(20))
    gst_registered: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    gstin: Mapped[str | None] = mapped_column(String(30))
    pan: Mapped[str | None] = mapped_column(String(20))
    state_code: Mapped[str | None] = mapped_column(String(10))
    place_of_supply: Mapped[str] = mapped_column(String(100))
    reverse_charge: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    tax_exempt: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    tax_exempt_reason: Mapped[str | None] = mapped_column(Text)
    client_segment: Mapped[str] = mapped_column(String(20), default="One-Off")
    industry_category: Mapped[str] = mapped_column(String(120))
    assigned_account_lead: Mapped[str] = mapped_column(String(160))
    internal_notes: Mapped[str | None] = mapped_column(Text)
    default_payment_terms: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Active", server_default="Active")


class Service(OwnedMixin, TimestampMixin, Base):
    __tablename__ = "services"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_name: Mapped[str] = mapped_column(String(200), unique=True)
    category: Mapped[str] = mapped_column(String(120))
    group_category: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    billing_unit: Mapped[str] = mapped_column(String(80))
    sac_code: Mapped[str] = mapped_column(String(30))
    min_price: Mapped[Decimal] = mapped_column(MONEY)
    default_price: Mapped[Decimal] = mapped_column(MONEY)
    max_price: Mapped[Decimal] = mapped_column(MONEY)
    internal_cost_price: Mapped[Decimal] = mapped_column(MONEY)
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    status: Mapped[str] = mapped_column(String(20), default="Active", server_default="Active")
    __table_args__ = (
        CheckConstraint("min_price >= 0 AND default_price >= min_price AND max_price >= default_price", name="ck_services_prices"),
        CheckConstraint("gst_rate >= 0 AND gst_rate <= 100", name="ck_services_gst_rate"),
    )


class Package(OwnedMixin, TimestampMixin, Base):
    __tablename__ = "packages"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[str] = mapped_column(Text)
    standard_price: Mapped[Decimal] = mapped_column(MONEY)
    package_discount: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default="0")
    final_price: Mapped[Decimal] = mapped_column(MONEY)
    min_price: Mapped[Decimal | None] = mapped_column(MONEY)
    duration: Mapped[str | None] = mapped_column(String(80))
    scope: Mapped[str | None] = mapped_column(Text)
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    presentation_mode: Mapped[str] = mapped_column(String(20), default="Itemized")
    status: Mapped[str] = mapped_column(String(20), default="Active", server_default="Active")
    items: Mapped[list["PackageItem"]] = relationship(back_populates="package", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("standard_price >= 0 AND package_discount >= 0 AND final_price >= 0", name="ck_packages_prices"),)


class PackageItem(Base):
    __tablename__ = "package_items"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("packages.id", ondelete="CASCADE"))
    service_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("services.id", ondelete="RESTRICT"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    unit: Mapped[str] = mapped_column(String(80))
    default_unit_price: Mapped[Decimal] = mapped_column(MONEY)
    package: Mapped[Package] = relationship(back_populates="items")
    service: Mapped[Service] = relationship()
    __table_args__ = (UniqueConstraint("package_id", "service_id", name="uq_package_service"), CheckConstraint("quantity > 0", name="ck_package_item_quantity"))


class DocumentLineMixin:
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("services.id", ondelete="SET NULL"))
    service_name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    sac_code: Mapped[str] = mapped_column(String(30))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    billing_unit: Mapped[str] = mapped_column(String(80))
    min_price: Mapped[Decimal] = mapped_column(MONEY)
    default_price: Mapped[Decimal] = mapped_column(MONEY)
    max_price: Mapped[Decimal] = mapped_column(MONEY)
    selected_tier: Mapped[str] = mapped_column(String(20))
    negotiated_unit_price: Mapped[Decimal] = mapped_column(MONEY)
    item_discount_type: Mapped[str] = mapped_column(String(20), default="percentage")
    item_discount_value: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default="0")
    item_discount_amount: Mapped[Decimal] = mapped_column(MONEY)
    line_subtotal: Mapped[Decimal] = mapped_column(MONEY)
    taxable_amount: Mapped[Decimal] = mapped_column(MONEY)
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    tax_amount: Mapped[Decimal] = mapped_column(MONEY)
    line_total: Mapped[Decimal] = mapped_column(MONEY)


class Quotation(OwnedMixin, TimestampMixin, Base):
    __tablename__ = "quotations"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_number: Mapped[str] = mapped_column(String(60), unique=True)
    revision_number: Mapped[int] = mapped_column(Integer, default=1)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="RESTRICT"))
    project_title: Mapped[str] = mapped_column(String(240))
    quotation_date: Mapped[date] = mapped_column(Date)
    valid_until: Mapped[date] = mapped_column(Date)
    place_of_supply: Mapped[str] = mapped_column(String(100))
    is_inter_state: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    sales_executive: Mapped[str] = mapped_column(String(160))
    document_discount_type: Mapped[str] = mapped_column(String(20), default="percentage")
    document_discount_value: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default="0")
    total_line_subtotal: Mapped[Decimal] = mapped_column(MONEY)
    total_item_discount: Mapped[Decimal] = mapped_column(MONEY)
    document_discount_amount: Mapped[Decimal] = mapped_column(MONEY)
    total_taxable_amount: Mapped[Decimal] = mapped_column(MONEY)
    cgst_amount: Mapped[Decimal] = mapped_column(MONEY)
    sgst_amount: Mapped[Decimal] = mapped_column(MONEY)
    igst_amount: Mapped[Decimal] = mapped_column(MONEY)
    grand_total: Mapped[Decimal] = mapped_column(MONEY)
    payment_terms: Mapped[str] = mapped_column(Text)
    delivery_timeline: Mapped[str] = mapped_column(Text)
    validity_days: Mapped[int] = mapped_column(Integer)
    scope_notes: Mapped[str] = mapped_column(Text)
    exclusions: Mapped[str] = mapped_column(Text)
    terms_and_conditions: Mapped[str] = mapped_column(Text)
    internal_notes: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Draft", server_default="Draft")
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    converted_to_invoice_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    lines: Mapped[list["QuotationLineItem"]] = relationship(back_populates="quotation", cascade="all, delete-orphan")
    created_by: Mapped["User | None"] = relationship(
        back_populates="quotations",
        foreign_keys=[created_by_id],
    )
    __table_args__ = (CheckConstraint("grand_total >= 0 AND total_taxable_amount >= 0", name="ck_quotations_totals"),)


class QuotationLineItem(DocumentLineMixin, Base):
    __tablename__ = "quotation_line_items"
    quotation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quotations.id", ondelete="CASCADE"))
    quotation: Mapped[Quotation] = relationship(back_populates="lines")


class Invoice(OwnedMixin, TimestampMixin, Base):
    __tablename__ = "invoices"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number: Mapped[str] = mapped_column(String(60), unique=True)
    quotation_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("quotations.id", ondelete="SET NULL"))
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="RESTRICT"))
    project_title: Mapped[str] = mapped_column(String(240))
    invoice_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    place_of_supply: Mapped[str] = mapped_column(String(100))
    is_inter_state: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    document_discount_type: Mapped[str] = mapped_column(String(20), default="percentage")
    document_discount_value: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default="0")
    total_line_subtotal: Mapped[Decimal] = mapped_column(MONEY)
    total_item_discount: Mapped[Decimal] = mapped_column(MONEY)
    document_discount_amount: Mapped[Decimal] = mapped_column(MONEY)
    total_taxable_amount: Mapped[Decimal] = mapped_column(MONEY)
    cgst_amount: Mapped[Decimal] = mapped_column(MONEY)
    sgst_amount: Mapped[Decimal] = mapped_column(MONEY)
    igst_amount: Mapped[Decimal] = mapped_column(MONEY)
    grand_total: Mapped[Decimal] = mapped_column(MONEY)
    amount_paid: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default="0")
    balance_due: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default="0")
    status: Mapped[str] = mapped_column(String(20), default="Draft", server_default="Draft")
    notes: Mapped[str] = mapped_column(Text)
    bank_details: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    lines: Mapped[list["InvoiceLineItem"]] = relationship(back_populates="invoice", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="invoice")
    created_by: Mapped["User | None"] = relationship(
        back_populates="invoices",
        foreign_keys=[created_by_id],
    )
    __table_args__ = (CheckConstraint("grand_total >= 0 AND amount_paid >= 0 AND balance_due >= 0 AND amount_paid <= grand_total", name="ck_invoices_balances"),)


class InvoiceLineItem(DocumentLineMixin, Base):
    __tablename__ = "invoice_line_items"
    invoice_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"))
    invoice: Mapped[Invoice] = relationship(back_populates="lines")


class Payment(OwnedMixin, TimestampMixin, Base):
    __tablename__ = "payments"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_number: Mapped[str] = mapped_column(String(60), unique=True)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="RESTRICT"))
    invoice_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoices.id", ondelete="RESTRICT"))
    payment_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(MONEY)
    payment_mode: Mapped[str] = mapped_column(String(40))
    transaction_reference: Mapped[str] = mapped_column(String(160))
    internal_notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Completed", server_default="Completed")
    invoice: Mapped[Invoice] = relationship(back_populates="payments")
    __table_args__ = (CheckConstraint("amount > 0", name="ck_payments_amount"),)


class Expense(OwnedMixin, TimestampMixin, Base):
    __tablename__ = "expenses"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_number: Mapped[str] = mapped_column(String(60), unique=True)
    title: Mapped[str] = mapped_column(String(240))
    category: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    vendor_or_employee: Mapped[str] = mapped_column(String(200))
    department: Mapped[str | None] = mapped_column(String(120))
    amount: Mapped[Decimal] = mapped_column(MONEY)
    tax_amount: Mapped[Decimal] = mapped_column(MONEY, default=0, server_default="0")
    expense_date: Mapped[date] = mapped_column(Date)
    payment_method: Mapped[str] = mapped_column(String(60))
    payment_reference: Mapped[str | None] = mapped_column(String(160))
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    recurrence: Mapped[str | None] = mapped_column(String(30))
    recurring_start_date: Mapped[date | None] = mapped_column(Date)
    recurring_next_due_date: Mapped[date | None] = mapped_column(Date)
    recurring_end_date: Mapped[date | None] = mapped_column(Date)
    recurring_billing_cycle: Mapped[str | None] = mapped_column(String(80))
    recurring_status: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)
    receipt_file_name: Mapped[str | None] = mapped_column(String(255))
    receipt_file_type: Mapped[str | None] = mapped_column(String(100))
    receipt_file_size: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(30), default="Pending", server_default="Pending")
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    project_title: Mapped[str | None] = mapped_column(String(240))
    is_reimbursement: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    employee_name: Mapped[str | None] = mapped_column(String(160))
    reimbursement_status: Mapped[str | None] = mapped_column(String(30))
    reimbursement_rejection_reason: Mapped[str | None] = mapped_column(Text)
    approval_date: Mapped[date | None] = mapped_column(Date)
    reimbursement_payment_date: Mapped[date | None] = mapped_column(Date)
    __table_args__ = (CheckConstraint("amount >= 0 AND tax_amount >= 0", name="ck_expenses_amounts"),)


class Retainer(OwnedMixin, TimestampMixin, Base):
    __tablename__ = "retainers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    retainer_name: Mapped[str] = mapped_column(String(200))
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="RESTRICT"))
    included_services: Mapped[list] = mapped_column(JSONB, default=list)
    recurring_amount: Mapped[Decimal] = mapped_column(MONEY)
    frequency: Mapped[str] = mapped_column(String(20))
    start_date: Mapped[date] = mapped_column(Date)
    expiry_date: Mapped[date] = mapped_column(Date)
    next_billing_date: Mapped[date] = mapped_column(Date)
    auto_generate_invoice: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    status: Mapped[str] = mapped_column(String(20), default="Active", server_default="Active")
    __table_args__ = (CheckConstraint("recurring_amount >= 0 AND expiry_date >= start_date", name="ck_retainers_dates"),)


class CompanySettings(OwnedMixin, TimestampMixin, Base):
    __tablename__ = "company_settings"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legal_entity_name: Mapped[str] = mapped_column(String(200))
    registered_address: Mapped[str] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(100))
    state_code: Mapped[str] = mapped_column(String(10))
    pin_code: Mapped[str] = mapped_column(String(20))
    gstin: Mapped[str] = mapped_column(String(30))
    pan: Mapped[str] = mapped_column(String(20))
    corporate_email: Mapped[str] = mapped_column(String(320))
    corporate_phone: Mapped[str] = mapped_column(String(40))
    website: Mapped[str] = mapped_column(String(255))
    bank: Mapped[dict] = mapped_column(JSONB, default=dict)
    default_gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    default_validity_days: Mapped[int] = mapped_column(Integer)
    default_payment_terms: Mapped[str] = mapped_column(Text)
    quotation_terms: Mapped[str] = mapped_column(Text)
    invoice_statutory_note: Mapped[str] = mapped_column(Text)
    quotation_prefix: Mapped[str] = mapped_column(String(40))
    invoice_prefix: Mapped[str] = mapped_column(String(40))
    payment_prefix: Mapped[str] = mapped_column(String(40))
    __table_args__ = (UniqueConstraint("owner_id", name="uq_company_settings_owner"),)
