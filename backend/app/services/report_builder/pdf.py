"""
PDF builder for assembled reports using fpdf2 (pure Python, no binary deps).

Install: pip install fpdf2
"""
from __future__ import annotations

import io
from datetime import date
from typing import List

try:
    from fpdf import FPDF, XPos, YPos
    _FPDF_AVAILABLE = True
except ImportError:
    _FPDF_AVAILABLE = False


class _ReportPDF(FPDF):
    def __init__(self, agency_name: str, date_range: str):
        super().__init__()
        self._agency_name = agency_name
        self._date_range  = date_range

    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, self._agency_name, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(3)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(160, 160, 160)
        self.cell(0, 8, f"Page {self.page_no()} — Mullen Analytics", align="C")

    def cover(self, title: str):
        self.add_page()
        self.ln(30)
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 12, title, align="C")
        self.ln(6)
        self.set_font("Helvetica", "", 13)
        self.set_text_color(80, 80, 80)
        self.multi_cell(0, 8, self._agency_name, align="C")
        self.ln(4)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(130, 130, 130)
        self.multi_cell(0, 6, self._date_range, align="C")
        self.ln(6)
        self.multi_cell(0, 6, f"Generated {date.today().strftime('%B %d, %Y')}", align="C")

    def section_heading(self, heading: str):
        self.ln(6)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(30, 60, 120)
        self.multi_cell(0, 8, heading)
        self.set_draw_color(30, 60, 120)
        self.line(self.l_margin, self.get_y() + 1, self.w - self.r_margin, self.get_y() + 1)
        self.ln(5)

    def section_body(self, text: str):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(4)

    def disclaimer(self):
        self.ln(10)
        self.set_draw_color(210, 210, 210)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(140, 140, 140)
        self.multi_cell(
            0, 5,
            "This report was assembled using Mullen Analytics. Descriptive text was "
            "drafted with AI assistance and reviewed by the consulting team. All "
            "statistics are derived from the agency's uploaded CAD data. NFPA 1710 "
            "compliance is evaluated against the BLS total response P90 target of "
            "5 minutes (300 seconds). Timestamp resolution may affect sub-60-second "
            "interval accuracy.",
        )


def build_pdf(
    title: str,
    agency_name: str,
    date_range: str,
    sections: List[dict],
) -> bytes:
    """
    Build a PDF from assembled sections.

    Args:
        title:       Report title
        agency_name: Agency name for header
        date_range:  Date range string for cover page
        sections:    List of {"heading": str, "text": str}

    Returns:
        Raw PDF bytes

    Raises:
        RuntimeError: fpdf2 not installed
    """
    if not _FPDF_AVAILABLE:
        raise RuntimeError(
            "fpdf2 is not installed. Run: pip install fpdf2"
        )

    pdf = _ReportPDF(agency_name=agency_name, date_range=date_range)
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.cover(title)

    pdf.add_page()
    for sec in sections:
        heading = sec.get("heading", "").strip()
        text    = sec.get("text", "").strip()
        if not heading and not text:
            continue
        if pdf.get_y() > pdf.h - 60:
            pdf.add_page()
        pdf.section_heading(heading)
        if text:
            pdf.section_body(text)

    pdf.disclaimer()

    return bytes(pdf.output())


def is_pdf_available() -> bool:
    return _FPDF_AVAILABLE
