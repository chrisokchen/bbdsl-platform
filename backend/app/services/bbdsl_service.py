"""Service layer wrapping the bbdsl Python package.

All bbdsl calls go through this module so the rest of the platform
does not import bbdsl directly.
"""

from __future__ import annotations

from bbdsl.core.loader import load_document_from_string
from bbdsl.core.validator import Validator
from bbdsl.core.comparator import compare_systems as _compare_systems
from bbdsl.exporters.bboalert_exporter import export_bboalert
from bbdsl.exporters.bml_exporter import export_bml
from bbdsl.exporters.svg_tree import export_svg
from bbdsl.exporters.html_exporter import export_html
from bbdsl.exporters.pbn_exporter import export_pbn


def validate_yaml(content: str) -> dict:
    """Parse and validate BBDSL YAML content.

    Args:
        content: YAML text of a BBDSL document.

    Returns:
        JSON-serializable validation report dict.
    """
    doc = load_document_from_string(content)
    validator = Validator(doc)
    report = validator.validate_all()
    return report.to_dict()


def export(content: str, fmt: str, **kwargs) -> str:
    """Export BBDSL YAML to a given format.

    Args:
        content: YAML text.
        fmt: One of 'bml', 'bboalert', 'svg', 'html', 'pbn'.
        **kwargs: Additional keyword arguments forwarded to the exporter.

    Returns:
        Exported content as a string.
    """
    doc = load_document_from_string(content)
    exporters = {
        "bml": export_bml,
        "bboalert": _export_bboalert_str,
        "svg": export_svg,
        "html": export_html,
        "pbn": export_pbn,
    }
    exporter_fn = exporters.get(fmt)
    if exporter_fn is None:
        raise ValueError(f"Unknown format: {fmt}")
    return exporter_fn(doc, **kwargs)


def _export_bboalert_str(doc, **kwargs) -> str:
    """Wrap BBOalert exporter to return a string."""
    from bbdsl.exporters.bboalert_exporter import _format_bboalert

    rows = export_bboalert(doc, **kwargs)
    name = doc.system.name
    locale = kwargs.get("locale", "en")
    if isinstance(name, dict):
        system_name = (
            name.get(locale)
            or name.get("en")
            or next(iter(name.values()), "System")
        )
    else:
        system_name = str(name)
    return _format_bboalert(rows, system_name, locale)


def diff(
    content_a: str,
    content_b: str,
    n_deals: int = 20,
    seed: int = 42,
) -> dict:
    """Compare two BBDSL systems and return a structured diff.

    Args:
        content_a: YAML text of system A.
        content_b: YAML text of system B.
        n_deals: Number of deals to simulate.
        seed: Random seed for reproducibility.

    Returns:
        JSON-serializable comparison report dict.
    """
    doc_a = load_document_from_string(content_a)
    doc_b = load_document_from_string(content_b)
    report = _compare_systems(doc_a, doc_b, n_deals=n_deals, seed=seed)
    return report.to_dict()
