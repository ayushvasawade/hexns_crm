from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


def camel(name: str) -> str:
    head, *tail = name.split("_")
    return head + "".join(part.capitalize() for part in tail)


class ApiSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=camel,
        populate_by_name=True,
        from_attributes=True,
    )


class Page(ApiSchema):
    items: list[Any]
    total: int
    page: int
    page_size: int


class ClientBase(ApiSchema):
    legal_entity_name: str
    brand_trade_name: str
    primary_contact_person: str
    official_phone: str = ""
    mobile: str = ""
    billing_email: EmailStr
    registered_address: str
    city: str
    state: str
    pin_code: str
    gst_registered: bool = False
    gstin: str | None = None
    pan: str | None = None
    state_code: str | None = None
    place_of_supply: str
    reverse_charge: bool = False
    tax_exempt: bool = False
    tax_exempt_reason: str | None = None
    client_segment: str = "One-Off"
    industry_category: str = ""
    assigned_account_lead: str = ""
    internal_notes: str | None = None
    default_payment_terms: str = ""
    status: str = "Active"


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ApiSchema):
    legal_entity_name: str | None = None
    brand_trade_name: str | None = None
    primary_contact_person: str | None = None
    official_phone: str | None = None
    mobile: str | None = None
    billing_email: EmailStr | None = None
    registered_address: str | None = None
    city: str | None = None
    state: str | None = None
    pin_code: str | None = None
    gst_registered: bool | None = None
    gstin: str | None = None
    pan: str | None = None
    state_code: str | None = None
    place_of_supply: str | None = None
    reverse_charge: bool | None = None
    tax_exempt: bool | None = None
    tax_exempt_reason: str | None = None
    client_segment: str | None = None
    industry_category: str | None = None
    assigned_account_lead: str | None = None
    internal_notes: str | None = None
    default_payment_terms: str | None = None
    status: str | None = None


class ClientResponse(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ServiceBase(ApiSchema):
    service_name: str
    category: str
    group_category: str | None = None
    description: str
    billing_unit: str
    sac_code: str
    min_price: Decimal = Field(ge=0)
    default_price: Decimal = Field(ge=0)
    max_price: Decimal = Field(ge=0)
    internal_cost_price: Decimal = Field(ge=0)
    gst_rate: Decimal = Field(ge=0, le=100)
    status: str = "Active"

    @model_validator(mode="after")
    def valid_prices(self) -> "ServiceBase":
        if not self.min_price <= self.default_price <= self.max_price:
            raise ValueError("Prices must satisfy min_price <= default_price <= max_price")
        return self


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(ApiSchema):
    service_name: str | None = None
    category: str | None = None
    group_category: str | None = None
    description: str | None = None
    billing_unit: str | None = None
    sac_code: str | None = None
    min_price: Decimal | None = Field(default=None, ge=0)
    default_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)
    internal_cost_price: Decimal | None = Field(default=None, ge=0)
    gst_rate: Decimal | None = Field(default=None, ge=0, le=100)
    status: str | None = None


class ServiceResponse(ServiceBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class PackageItemInput(ApiSchema):
    service_id: UUID
    quantity: Decimal = Field(gt=0)
    unit: str
    default_unit_price: Decimal = Field(ge=0)


class PackageItemResponse(PackageItemInput):
    id: UUID
    service_name: str | None = None


class PackageBase(ApiSchema):
    name: str
    description: str
    standard_price: Decimal = Field(ge=0)
    package_discount: Decimal = Field(default=Decimal("0"), ge=0)
    final_price: Decimal = Field(ge=0)
    min_price: Decimal | None = Field(default=None, ge=0)
    duration: str | None = None
    scope: str | None = None
    gst_rate: Decimal = Field(ge=0, le=100)
    presentation_mode: str = "Itemized"
    status: str = "Active"


class PackageCreate(PackageBase):
    items: list[PackageItemInput] = Field(default_factory=list)


class PackageUpdate(ApiSchema):
    name: str | None = None
    description: str | None = None
    standard_price: Decimal | None = Field(default=None, ge=0)
    package_discount: Decimal | None = Field(default=None, ge=0)
    final_price: Decimal | None = Field(default=None, ge=0)
    min_price: Decimal | None = Field(default=None, ge=0)
    duration: str | None = None
    scope: str | None = None
    gst_rate: Decimal | None = Field(default=None, ge=0, le=100)
    presentation_mode: str | None = None
    status: str | None = None
    items: list[PackageItemInput] | None = None


class PackageResponse(PackageBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    items: list[PackageItemResponse] = Field(default_factory=list)


class LineItemInput(ApiSchema):
    service_id: UUID | None = None
    service_name: str
    category: str | None = None
    description: str
    sac_code: str
    quantity: Decimal = Field(gt=0)
    billing_unit: str
    min_price: Decimal = Field(ge=0)
    default_price: Decimal = Field(ge=0)
    max_price: Decimal = Field(ge=0)
    selected_tier: str = "CUSTOM"
    negotiated_unit_price: Decimal = Field(ge=0)
    item_discount_type: str = "percentage"
    item_discount_value: Decimal = Field(default=Decimal("0"), ge=0)
    gst_rate: Decimal = Field(default=Decimal("18"), ge=0, le=100)


class LineItemResponse(LineItemInput):
    id: UUID
    item_discount_amount: Decimal
    line_subtotal: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal
    is_below_min_warning: bool = False


class DocumentBase(ApiSchema):
    client_id: UUID
    project_title: str
    quotation_date: date | None = None
    invoice_date: date | None = None
    valid_until: date | None = None
    due_date: date | None = None
    place_of_supply: str
    is_inter_state: bool = False
    sales_executive: str = ""
    document_discount_type: str = "percentage"
    document_discount_value: Decimal = Field(default=Decimal("0"), ge=0)
    payment_terms: str = ""
    delivery_timeline: str = ""
    validity_days: int = Field(default=15, ge=0)
    scope_notes: str = ""
    exclusions: str = ""
    terms_and_conditions: str = ""
    internal_notes: str = ""
    notes: str = ""
    bank_details: dict[str, Any] = Field(default_factory=dict)
    status: str | None = None
    line_items: list[LineItemInput] = Field(min_length=1)


class QuotationCreate(DocumentBase):
    quotation_number: str
    quotation_date: date
    valid_until: date


class QuotationUpdate(ApiSchema):
    project_title: str | None = None
    valid_until: date | None = None
    place_of_supply: str | None = None
    is_inter_state: bool | None = None
    sales_executive: str | None = None
    document_discount_type: str | None = None
    document_discount_value: Decimal | None = Field(default=None, ge=0)
    payment_terms: str | None = None
    delivery_timeline: str | None = None
    validity_days: int | None = Field(default=None, ge=0)
    scope_notes: str | None = None
    exclusions: str | None = None
    terms_and_conditions: str | None = None
    internal_notes: str | None = None
    status: str | None = None
    rejection_reason: str | None = None
    line_items: list[LineItemInput] | None = None


class QuotationResponse(ApiSchema):
    id: UUID
    quotation_number: str
    revision_number: int
    client_id: UUID
    project_title: str
    quotation_date: date
    valid_until: date
    place_of_supply: str
    is_inter_state: bool
    sales_executive: str
    line_items: list[LineItemResponse]
    document_discount_type: str
    document_discount_value: Decimal
    total_line_subtotal: Decimal
    total_item_discount: Decimal
    document_discount_amount: Decimal
    total_taxable_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    grand_total: Decimal
    payment_terms: str
    delivery_timeline: str
    validity_days: int
    scope_notes: str
    exclusions: str
    terms_and_conditions: str
    internal_notes: str
    status: str
    rejection_reason: str | None = None
    converted_to_invoice_id: UUID | None = None
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def map_lines(cls, value: Any) -> Any:
        if hasattr(value, "lines"):
            data = {field: getattr(value, field) for field in cls.model_fields if hasattr(value, field)}
            data["line_items"] = value.lines
            return data
        return value


class InvoiceCreate(DocumentBase):
    invoice_number: str
    invoice_date: date
    due_date: date
    quotation_id: UUID | None = None


class InvoiceUpdate(ApiSchema):
    project_title: str | None = None
    due_date: date | None = None
    place_of_supply: str | None = None
    is_inter_state: bool | None = None
    document_discount_type: str | None = None
    document_discount_value: Decimal | None = Field(default=None, ge=0)
    notes: str | None = None
    bank_details: dict[str, Any] | None = None
    status: str | None = None
    line_items: list[LineItemInput] | None = None


class InvoiceResponse(ApiSchema):
    id: UUID
    invoice_number: str
    quotation_id: UUID | None = None
    client_id: UUID
    project_title: str
    invoice_date: date
    due_date: date
    place_of_supply: str
    is_inter_state: bool
    line_items: list[LineItemResponse]
    document_discount_type: str
    document_discount_value: Decimal
    total_line_subtotal: Decimal
    total_item_discount: Decimal
    document_discount_amount: Decimal
    total_taxable_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    grand_total: Decimal
    amount_paid: Decimal
    balance_due: Decimal
    status: str
    notes: str
    bank_details: dict[str, Any]
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def map_lines(cls, value: Any) -> Any:
        if hasattr(value, "lines"):
            data = {field: getattr(value, field) for field in cls.model_fields if hasattr(value, field)}
            data["line_items"] = value.lines
            return data
        return value


class PaymentCreate(ApiSchema):
    payment_number: str
    client_id: UUID
    invoice_id: UUID
    payment_date: date
    amount: Decimal = Field(gt=0)
    payment_mode: str
    transaction_reference: str
    internal_notes: str | None = None


class PaymentUpdate(ApiSchema):
    payment_date: date | None = None
    payment_mode: str | None = None
    transaction_reference: str | None = None
    internal_notes: str | None = None
    status: str | None = None


class PaymentResponse(ApiSchema):
    id: UUID
    payment_number: str
    client_id: UUID
    invoice_id: UUID
    payment_date: date
    amount: Decimal
    payment_mode: str
    transaction_reference: str
    internal_notes: str | None
    status: str
    created_at: datetime


class ExpenseBase(ApiSchema):
    expense_number: str
    title: str
    category: str
    description: str | None = None
    vendor_or_employee: str
    department: str | None = None
    amount: Decimal = Field(ge=0)
    tax_amount: Decimal = Field(default=Decimal("0"), ge=0)
    expense_date: date
    payment_method: str
    payment_reference: str | None = None
    is_recurring: bool = False
    recurrence: str | None = None
    recurring_start_date: date | None = None
    recurring_next_due_date: date | None = None
    recurring_end_date: date | None = None
    recurring_billing_cycle: str | None = None
    recurring_status: str | None = None
    notes: str | None = None
    receipt_file_name: str | None = None
    receipt_file_type: str | None = None
    receipt_file_size: str | None = None
    status: str = "Pending"
    project_id: UUID | None = None
    project_title: str | None = None
    is_reimbursement: bool = False
    employee_name: str | None = None
    reimbursement_status: str | None = None
    reimbursement_rejection_reason: str | None = None
    approval_date: date | None = None
    reimbursement_payment_date: date | None = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(ApiSchema):
    title: str | None = None
    category: str | None = None
    description: str | None = None
    vendor_or_employee: str | None = None
    amount: Decimal | None = Field(default=None, ge=0)
    tax_amount: Decimal | None = Field(default=None, ge=0)
    expense_date: date | None = None
    payment_method: str | None = None
    payment_reference: str | None = None
    status: str | None = None
    notes: str | None = None
    reimbursement_status: str | None = None
    reimbursement_rejection_reason: str | None = None
    reimbursement_payment_date: date | None = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class RetainerBase(ApiSchema):
    retainer_name: str
    client_id: UUID
    included_services: list[str] = Field(default_factory=list)
    recurring_amount: Decimal = Field(ge=0)
    frequency: str
    start_date: date
    expiry_date: date
    next_billing_date: date
    auto_generate_invoice: bool = False
    status: str = "Active"


class RetainerCreate(RetainerBase):
    pass


class RetainerUpdate(ApiSchema):
    retainer_name: str | None = None
    included_services: list[str] | None = None
    recurring_amount: Decimal | None = Field(default=None, ge=0)
    frequency: str | None = None
    start_date: date | None = None
    expiry_date: date | None = None
    next_billing_date: date | None = None
    auto_generate_invoice: bool | None = None
    status: str | None = None


class RetainerResponse(RetainerBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class CompanySettingsBase(ApiSchema):
    legal_entity_name: str
    registered_address: str
    city: str
    state: str
    state_code: str
    pin_code: str
    gstin: str
    pan: str
    corporate_email: EmailStr
    corporate_phone: str
    website: str
    bank: dict[str, Any] = Field(default_factory=dict)
    default_gst_rate: Decimal = Field(ge=0, le=100)
    default_validity_days: int = Field(ge=0)
    default_payment_terms: str
    quotation_terms: str
    invoice_statutory_note: str
    quotation_prefix: str
    invoice_prefix: str
    payment_prefix: str


class CompanySettingsUpdate(ApiSchema):
    legal_entity_name: str | None = None
    registered_address: str | None = None
    city: str | None = None
    state: str | None = None
    state_code: str | None = None
    pin_code: str | None = None
    gstin: str | None = None
    pan: str | None = None
    corporate_email: EmailStr | None = None
    corporate_phone: str | None = None
    website: str | None = None
    bank: dict[str, Any] | None = None
    default_gst_rate: Decimal | None = Field(default=None, ge=0, le=100)
    default_validity_days: int | None = Field(default=None, ge=0)
    default_payment_terms: str | None = None
    quotation_terms: str | None = None
    invoice_statutory_note: str | None = None
    quotation_prefix: str | None = None
    invoice_prefix: str | None = None
    payment_prefix: str | None = None


class CompanySettingsResponse(CompanySettingsBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
