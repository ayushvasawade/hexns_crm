"""Add package reference to document line items."""

from alembic import op
import sqlalchemy as sa


revision = "20261104_package_pricing"
down_revision = "20261026_owner_scope"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table, constraint in (
        ("quotation_line_items", "fk_quotation_line_items_package_id"),
        ("invoice_line_items", "fk_invoice_line_items_package_id"),
    ):
        op.add_column(table, sa.Column("package_id", sa.UUID(), nullable=True))
        op.create_foreign_key(constraint, table, "packages", ["package_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    for table, constraint in (
        ("invoice_line_items", "fk_invoice_line_items_package_id"),
        ("quotation_line_items", "fk_quotation_line_items_package_id"),
    ):
        op.drop_constraint(constraint, table, type_="foreignkey")
        op.drop_column(table, "package_id")
