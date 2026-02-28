"""add drafts and shares tables (Sprint 5.2)

Revision ID: 0002_drafts_shares
Revises: 0001_initial
Create Date: 2026-02-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_drafts_shares"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- drafts ---
    op.create_table(
        "drafts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(256), nullable=False, server_default="Untitled"),
        sa.Column("yaml_content", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- shares ---
    op.create_table(
        "shares",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("hash", sa.String(32), nullable=False),
        sa.Column(
            "title",
            sa.String(256),
            nullable=False,
            server_default="Shared Convention",
        ),
        sa.Column("yaml_content", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("hash", name="uq_share_hash"),
    )
    op.create_index("ix_shares_hash", "shares", ["hash"])


def downgrade() -> None:
    op.drop_index("ix_shares_hash", table_name="shares")
    op.drop_table("shares")
    op.drop_table("drafts")
