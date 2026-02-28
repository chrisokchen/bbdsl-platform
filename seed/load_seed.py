#!/usr/bin/env python3
"""Load seed convention YAML files into the BBDSL Platform database.

Usage:
    cd backend
    python -m seed.load_seed          # via module
    python ../seed/load_seed.py       # direct

The script:
1. Creates a "seed" user if one does not exist.
2. Reads every *.bbdsl.yaml file under  seed/conventions/ .
3. Parses basic metadata from the YAML front-matter (name, description, tags).
4. Inserts them into the conventions table (skips duplicates).
"""

from __future__ import annotations

import asyncio
import os
import re
import sys
from pathlib import Path

import yaml

# ---------------------------------------------------------------------------
# Ensure the backend package is importable when running from repo root
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import async_session, create_tables  # noqa: E402
from app.models.convention import Convention  # noqa: E402
from app.models.user import User  # noqa: E402

from sqlalchemy import select  # noqa: E402

SEED_DIR = Path(__file__).resolve().parent / "conventions"

# Mapping from file-stem to sensible defaults
FILE_META: dict[str, dict] = {
    "precision": {
        "namespace": "precision",
        "tags": "precision,strong-club,artificial",
    },
    "sayc": {
        "namespace": "sayc",
        "tags": "sayc,natural,american",
    },
    "two_over_one": {
        "namespace": "two-over-one",
        "tags": "2/1,game-forcing,natural",
    },
}


def _extract_meta(content: str, stem: str) -> dict:
    """Extract name, version, description from YAML front-matter."""
    try:
        doc = yaml.safe_load(content)
    except yaml.YAMLError:
        doc = {}

    system = doc.get("system", {}) if isinstance(doc, dict) else {}

    # Name — prefer English
    raw_name = system.get("name", stem)
    if isinstance(raw_name, dict):
        name = raw_name.get("en") or raw_name.get("zh-TW") or next(iter(raw_name.values()), stem)
    else:
        name = str(raw_name)

    # Description
    raw_desc = system.get("description", "")
    if isinstance(raw_desc, dict):
        description = raw_desc.get("en") or raw_desc.get("zh-TW") or next(iter(raw_desc.values()), "")
    else:
        description = str(raw_desc) if raw_desc else ""

    version = str(system.get("version", "1.0.0"))

    defaults = FILE_META.get(stem, {"namespace": stem, "tags": ""})

    return {
        "name": name,
        "namespace": defaults["namespace"],
        "version": version,
        "description": description,
        "tags": defaults.get("tags", ""),
    }


async def load_seed() -> None:
    """Main seed-loading coroutine."""
    await create_tables()

    async with async_session() as db:
        # --- Ensure a seed user exists ---
        result = await db.execute(
            select(User).where(User.github_id == "seed-bot")
        )
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                name="BBDSL Bot",
                github_id="seed-bot",
                email="bot@bbdsl.dev",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"  ✔ Created seed user: {user.name} (id={user.id})")
        else:
            print(f"  • Seed user already exists (id={user.id})")

        # --- Load YAML files ---
        yaml_files = sorted(SEED_DIR.glob("*.bbdsl.yaml"))
        if not yaml_files:
            print(f"  ⚠ No .bbdsl.yaml files found in {SEED_DIR}")
            return

        for path in yaml_files:
            stem = path.stem.replace(".bbdsl", "")
            content = path.read_text(encoding="utf-8")
            meta = _extract_meta(content, stem)

            # Check for duplicate
            existing = await db.execute(
                select(Convention).where(
                    Convention.namespace == meta["namespace"],
                    Convention.version == meta["version"],
                )
            )
            if existing.scalar_one_or_none() is not None:
                print(f"  • Skipped (already exists): {meta['namespace']} v{meta['version']}")
                continue

            conv = Convention(
                name=meta["name"],
                namespace=meta["namespace"],
                version=meta["version"],
                description=meta["description"],
                tags=meta["tags"],
                yaml_content=content,
                author_id=user.id,
            )
            db.add(conv)
            await db.commit()
            await db.refresh(conv)
            print(
                f"  ✔ Loaded: {conv.name} ({conv.namespace} v{conv.version}) "
                f"→ id={conv.id}"
            )

    print("\n  Seed loading complete.")


if __name__ == "__main__":
    print("BBDSL Platform — Seed Data Loader\n")
    asyncio.run(load_seed())
