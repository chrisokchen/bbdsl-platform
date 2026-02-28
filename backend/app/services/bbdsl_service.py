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

try:
    from bbdsl.exporters.lin_exporter import export_lin
except ImportError:
    export_lin = None  # LIN exporter may not be available in older bbdsl versions


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
        "lin": _export_lin_str,
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


def _export_lin_str(doc, **kwargs) -> str:
    """Export to LIN format.

    LIN (Long Internet Notation) is used by BBO for deal/play records.
    If the bbdsl package doesn't have a LIN exporter, we fall back to
    converting PBN output to a basic LIN representation.
    """
    if export_lin is not None:
        return export_lin(doc, **kwargs)

    # Fallback: generate PBN and convert to basic LIN
    pbn_output = export_pbn(doc, **kwargs)
    return _pbn_to_lin(pbn_output)


def _pbn_to_lin(pbn_text: str) -> str:
    """Convert PBN text to a basic LIN format.

    This is a simplified conversion for HandViewer embedding.
    """
    lines: list[str] = []
    board_num = ""
    dealer = ""
    vul = ""
    deal = ""
    event = ""

    for raw_line in pbn_text.split("\n"):
        line = raw_line.strip()
        if line.startswith("[Board"):
            board_num = line.split('"')[1] if '"' in line else ""
        elif line.startswith("[Dealer"):
            dealer = line.split('"')[1] if '"' in line else ""
        elif line.startswith("[Vulnerable") or line.startswith("[Vul"):
            vul = line.split('"')[1] if '"' in line else ""
        elif line.startswith("[Deal"):
            deal = line.split('"')[1] if '"' in line else ""
        elif line.startswith("[Event"):
            event = line.split('"')[1] if '"' in line else ""

    # Map PBN vulnerability to LIN format
    vul_map = {
        "None": "o", "NS": "n", "EW": "e", "All": "b",
        "Love": "o", "Both": "b",
    }
    lin_vul = vul_map.get(vul, "o")

    # Build LIN line
    lin_parts = [
        f"pn|{event or 'N,E,S,W'}",
        f"st||",
        f"md|{_pbn_deal_to_lin_md(deal, dealer)}",
        f"sv|{lin_vul}",
        f"mb|",  # no bidding sequence in static export
    ]
    lines.append("|".join(lin_parts) + "|")

    return "\n".join(lines)


def _pbn_deal_to_lin_md(deal_str: str, dealer: str = "N") -> str:
    """Convert PBN deal string to LIN md (make deal) format.

    PBN deal: 'N:AK.QJ.T98.7654 ...'
    LIN md: dealer_num + hands
    """
    dealer_map = {"N": "1", "E": "2", "S": "3", "W": "4"}
    dealer_num = dealer_map.get(dealer, "1")

    if not deal_str:
        return dealer_num

    # Remove initial dealer indicator if present
    if ":" in deal_str:
        deal_str = deal_str.split(":", 1)[1]

    hands = deal_str.strip().split()
    # Convert PBN hand format (S.H.D.C with dots) to LIN (SHDC no separator)
    lin_hands = []
    for hand in hands:
        suits = hand.split(".")
        # LIN uses SHDC order, PBN already uses SHDC order
        lin_hands.append("".join(suits))

    return dealer_num + ",".join(lin_hands)
