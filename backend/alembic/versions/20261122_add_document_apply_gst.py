"""Add apply_gst column to quotations and invoices.

Revision ID: 20261122_document_apply_gst
Revises: 20261104_package_pricing
Create Date: 2026-11-22

"""

from alembic import op
import sqlalchemy as sa


revision = "20261122_document_apply_gst"
down_revision = "20261104_package_pricing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quotations", sa.Column("apply_gst", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("invoices", sa.Column("apply_gst", sa.Boolean(), server_default="true", nullable=False))


def downgrade() -> None:
    op.drop_column("invoices", "apply_gst")
    op.drop_column("quotations", "apply_gst")
