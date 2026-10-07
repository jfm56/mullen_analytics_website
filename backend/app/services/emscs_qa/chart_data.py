"""Structured PCR chart-data model the EMSCS QA engine evaluates.

SYNTHETIC/no-PHI in v1. Fields are the structured elements the deterministic
indicators + consistency engine need. Everything is optional except the ref —
missing data yields NA or HUMAN_REVIEW_REQUIRED, never a guessed pass/fail.

The real EMSCharts/NEMSIS normalizer will later populate this same shape; for now
synthetic fixtures do. No LLM is used to derive anything that is structured here.
"""
from __future__ import annotations
from typing import Any, Optional

from pydantic import BaseModel, Field


class Vitals(BaseModel):
    time: Optional[str] = None            # "HH:MM" or ISO
    sbp: Optional[int] = None
    dbp: Optional[int] = None
    bp_method: Optional[str] = None       # "manual" | "auto" | None
    spo2: Optional[int] = None
    pain: Optional[Any] = None            # 0-10, "unable to assess", or None
    hr: Optional[int] = None
    rr: Optional[int] = None
    gcs: Optional[int] = None


class AddAction(BaseModel):
    kind: str                              # "medication" | "procedure"
    name: str
    performed_by: Optional[str] = None
    route: Optional[str] = None
    dose: Optional[str] = None
    dose_unit: Optional[str] = None
    response_documented: Optional[bool] = None
    time: Optional[str] = None


class QaChartData(BaseModel):
    external_ref: str
    is_synthetic: bool = True

    # demographics / context
    age_years: Optional[float] = None
    age_days: Optional[int] = None
    sex: Optional[str] = None
    dispatched_as: Optional[str] = None
    chief_complaint: Optional[str] = None
    primary_impression: Optional[str] = None
    final_acuity: Optional[str] = None     # e.g. "Emergent (Red)"
    protocols_applied: list[str] = Field(default_factory=list)
    transported: Optional[bool] = None
    disposition: Optional[str] = None       # "Transported", "Patient Refused Care", ...
    transport_mode: Optional[str] = None    # "lights and sirens", ...
    destination: Optional[str] = None
    destination_appropriate: Optional[bool] = None  # None = needs human judgment

    # narrative / assessment
    hpi_narrative: Optional[str] = None
    hpi_elements: dict = Field(default_factory=dict)   # {"onset":True,"mechanism":True,...}
    assessment_documented: Optional[bool] = None       # primary/secondary/rapid present

    # vitals + reassessment
    vitals: list[Vitals] = Field(default_factory=list)

    # transfer of care
    receiving_staff_named: Optional[bool] = None

    # securement
    securement_straps: Optional[int] = None            # stated count (3/4/5) or None
    securement_text: Optional[str] = None

    # actions
    add_actions: list[AddAction] = Field(default_factory=list)
    narrative_only_interventions: list[str] = Field(default_factory=list)  # meds/procs only in narrative

    # signatures / consent
    signatures: dict = Field(default_factory=dict)     # {"patient":bool,"guardian":bool,"receiving":bool,"crew":bool}
    consent_signed: Optional[bool] = None

    # protocol deviation
    protocol_deviation: Optional[bool] = None
    special_report_filed: Optional[bool] = None

    # ALS
    als_dispatched: Optional[bool] = None
    als_on_scene: Optional[bool] = None
    als_requested: Optional[bool] = None
    als_cancelled: Optional[bool] = None

    # outcome / arrest (for consistency + category triggers)
    outcome: dict = Field(default_factory=dict)        # {"rosc":bool,"condition":str,...}

    # free-form structured fields for cross-field consistency (airway, loc, pupils, ...)
    structured_fields: dict = Field(default_factory=dict)

    def medications(self) -> list[AddAction]:
        return [a for a in self.add_actions if a.kind == "medication"]

    def procedures(self) -> list[AddAction]:
        return [a for a in self.add_actions if a.kind == "procedure"]

    def haystack(self) -> str:
        """Lowercased concatenation of the text fields used for keyword triggers.
        Used only for deterministic keyword matching (NOT LLM interpretation)."""
        parts = [self.dispatched_as, self.chief_complaint, self.primary_impression,
                 self.disposition, " ".join(self.protocols_applied)]
        parts += [a.name for a in self.add_actions]
        return " ".join(p for p in parts if p).lower()
