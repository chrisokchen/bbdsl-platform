"""initial schema – users, conventions, namespaces, ratings, comments

Revision ID: 0001_initial
Revises: –
Create Date: 2026-02-28
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("github_id", sa.String(64), nullable=True),
        sa.Column("google_id", sa.String(128), nullable=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("email", sa.String(256), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("github_id"),
        sa.UniqueConstraint("google_id"),
    )

    # --- namespaces ---
    op.create_table(
        "namespaces",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("prefix", sa.String(128), nullable=False),
        sa.Column("display_name", sa.String(256), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prefix", name="uq_namespace_prefix"),
    )
    op.create_index("ix_namespaces_prefix", "namespaces", ["prefix"])

    # --- conventions ---
    op.create_table(
        "conventions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("namespace", sa.String(256), nullable=False),
        sa.Column("version", sa.String(32), nullable=False, server_default="1.0.0"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tags", sa.String(512), nullable=True),
        sa.Column("yaml_content", sa.Text(), nullable=False),
        sa.Column("downloads", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("author_id", sa.Integer(), nullable=False),
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
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("namespace", "version", name="uq_namespace_version"),
    )
    op.create_index("ix_conventions_namespace", "conventions", ["namespace"])

    # --- ratings ---
    op.create_table(
        "ratings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("convention_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["convention_id"], ["conventions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "convention_id", "user_id", name="uq_rating_user_convention"
        ),
    )

    # --- comments ---
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("convention_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("author_name", sa.String(128), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["convention_id"], ["conventions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("comments")
    op.drop_table("ratings")
    op.drop_table("conventions")
    op.drop_table("namespaces")
    op.drop_table("users")
