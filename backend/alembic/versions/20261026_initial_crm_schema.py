"""Create the initial HEXNS CRM schema.

The migration delegates table creation to the single SQLAlchemy metadata
source so the revision cannot drift from the model registry before Phase 2
CRUD migrations are introduced.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.core.database import Base
import app.models  # noqa: F401

revision: str = "20261026_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind, checkfirst=True)
