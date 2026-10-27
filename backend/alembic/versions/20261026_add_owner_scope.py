"""Add user ownership scope to Phase 2 CRM resources."""

from typing import Sequence, Union

from alembic import op
from alembic import context
import sqlalchemy as sa

revision: str = "20261026_owner_scope"
down_revision: Union[str, None] = "20261026_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = (
    "clients", "services", "packages", "quotations", "invoices",
    "payments", "expenses", "retainers", "company_settings",
)


def upgrade() -> None:
    # The Phase 1 revision creates from current metadata on a fresh database,
    # which already includes these columns. Offline mode has no schema to
    # inspect, so it renders the fresh-database path and the online path
    # handles already-applied Phase 1 databases conditionally.
    if context.is_offline_mode():
        return
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for table in TABLES:
        columns = {column["name"] for column in inspector.get_columns(table)}
        if "owner_id" not in columns:
            op.add_column(
                table,
                sa.Column(
                    "owner_id",
                    sa.UUID(),
                    sa.ForeignKey("users.id", ondelete="RESTRICT"),
                    nullable=True,
                ),
            )
        indexes = {index["name"] for index in inspector.get_indexes(table)}
        if f"ix_{table}_owner_id" not in indexes:
            op.create_index(f"ix_{table}_owner_id", table, ["owner_id"])
    constraints = {constraint["name"] for constraint in inspector.get_unique_constraints("company_settings")}
    if "uq_company_settings_owner" not in constraints:
        op.create_unique_constraint("uq_company_settings_owner", "company_settings", ["owner_id"])


def downgrade() -> None:
    op.drop_constraint("uq_company_settings_owner", "company_settings", type_="unique")
    for table in reversed(TABLES):
        op.drop_index(f"ix_{table}_owner_id", table_name=table)
        op.drop_column(table, "owner_id")
