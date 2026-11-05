"""Deterministic, explainable scholarship eligibility matching engine.

Evaluates student profiles against the 16 structured scholarship schemes in the dataset.
Conservative evaluation:
- 'eligible': All mapped hard criteria for the scheme are satisfied.
- 'needs_verification': No hard criteria failed, but certain information was not provided or requires institutional/merit verification.
- 'not_eligible': One or more explicit criteria failed.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from core import corpus


class StudentProfile(BaseModel):
    # Personal & Demographics
    gender: Optional[str] = Field(None, description="Gender: female, male, other")
    age: Optional[int] = Field(None, description="Age in years")
    single_girl_child: Optional[bool] = Field(
        None, description="Whether applicant is single girl child in family"
    )
    domicile_state: Optional[str] = Field(
        None, description="Domicile / resident state (e.g. Gujarat, Delhi, Maharashtra)"
    )

    # Socio-Economic & Category
    category: Optional[str] = Field(
        None, description="Category: General, SC, ST, OBC, EBC, DNT, SEBC, EWS"
    )
    annual_family_income: Optional[float] = Field(
        None, description="Annual parental/family income in INR"
    )
    receiving_other_scholarship: Optional[bool] = Field(
        None, description="Whether receiving another government scholarship"
    )

    # Academic Context
    education_level: Optional[str] = Field(
        None,
        description="Education level: class_9_10, class_11_12, diploma, undergraduate, postgraduate, phd_mphil",
    )
    course_type: Optional[str] = Field(
        None,
        description="Course type: technical, professional, non_professional, agriculture, other",
    )
    year_of_study: Optional[int] = Field(None, description="Year of study: 1, 2, 3, 4, etc.")
    study_mode: Optional[str] = Field(
        "regular", description="Study mode: regular, distance, part_time"
    )
    institution_type: Optional[str] = Field(
        None,
        description="Institution type: aicte_approved, university_college, govt_school, private_other",
    )
    is_lateral_entry: Optional[bool] = Field(
        False, description="Whether admitted through lateral entry"
    )

    # Health & Special Abilities
    has_disability: Optional[bool] = Field(
        None, description="Whether applicant has a certified disability"
    )
    disability_percentage: Optional[float] = Field(
        None, description="Disability percentage (0-100)"
    )

    # Merit & Special Achievements
    class12_percentile: Optional[float] = Field(
        None, description="Class 12 percentile (0-100)"
    )
    previous_marks_percentage: Optional[float] = Field(
        None, description="Previous degree or class marks percentage (0-100)"
    )
    university_rank: Optional[int] = Field(
        None, description="University rank at undergraduate level (1, 2, etc.)"
    )
    valid_gate_or_gpat: Optional[bool] = Field(
        None, description="Whether applicant holds a valid GATE, GPAT, or CEED score"
    )
    sports_achievement: Optional[str] = Field(
        None,
        description="Sports achievement: national_medalist, international_participant, none",
    )


@dataclass
class MatchResult:
    scheme_id: str
    scheme_name: str
    provider: str
    status: str  # "eligible", "needs_verification", "not_eligible"
    objective: Optional[str]
    benefits_summary: Optional[str]
    matched_rules: List[str]
    failed_rules: List[str]
    missing_information: List[str]
    verification_notes: List[str]


def _norm(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip().lower().replace("-", "_").replace(" ", "_")


def _format_inr(amount: float) -> str:
    if amount >= 100000:
        return f"₹{amount / 100000:.2g} Lakh"
    return f"₹{amount:,.0f}"


def _summarize_benefits(scheme: Dict[str, Any]) -> str:
    benefits = scheme.get("benefits", {})
    if not isinstance(benefits, dict):
        return ""
    if "fellowship_amount" in benefits and isinstance(benefits["fellowship_amount"], dict):
        fa = benefits["fellowship_amount"]
        return f"₹{fa.get('amount', 0):,} {fa.get('currency', 'INR')} {fa.get('frequency', '')}".strip()
    if "contingency" in benefits and isinstance(benefits["contingency"], dict):
        c = benefits["contingency"]
        return f"Contingency: ₹{c.get('amount', 0):,} / {c.get('frequency', '')}".strip()
    if "tuition_fee" in benefits:
        return "Tuition assistance + Maintenance allowance"
    return "Financial assistance as per scheme guidelines"


def evaluate_scheme(scheme: Dict[str, Any], profile: StudentProfile) -> MatchResult:
    sid = scheme.get("scheme_id", "")
    name = scheme.get("name", sid)
    provider = scheme.get("provider", "")
    objective = scheme.get("objective", "")
    benefits_summary = _summarize_benefits(scheme)

    result = MatchResult(
        scheme_id=sid,
        scheme_name=name,
        provider=provider,
        status="needs_verification",
        objective=objective,
        benefits_summary=benefits_summary,
        matched_rules=[],
        failed_rules=[],
        missing_information=[],
        verification_notes=[],
    )

    # General Exclusions: Distance education is excluded across all 16 schemes
    if profile.study_mode and _norm(profile.study_mode) in ("distance", "part_time"):
        result.failed_rules.append("Distance or part-time education is not eligible for this regular scheme.")
    elif profile.study_mode and _norm(profile.study_mode) == "regular":
        result.matched_rules.append("Enrolled in regular full-time study mode.")

    # General Exclusions: Other government scholarship conflict
    exclusions = [str(x).lower() for x in scheme.get("exclusions", [])]
    has_other_scholarship_exclusion = any(
        "other scholarship" in x or "other source" in x or "other government scholarship" in x
        for x in exclusions
    )
    if profile.receiving_other_scholarship is True and has_other_scholarship_exclusion:
        result.failed_rules.append("Scheme prohibits concurrent receipt of another government scholarship.")

    gender = _norm(profile.gender)
    cat = _norm(profile.category)
    ed_level = _norm(profile.education_level)
    c_type = _norm(profile.course_type)
    inst_type = _norm(profile.institution_type)
    state = _norm(profile.domicile_state)
    income = profile.annual_family_income
    age = profile.age
    year = profile.year_of_study
    single_girl = profile.single_girl_child
    disability_pct = profile.disability_percentage
    has_disability = profile.has_disability or (disability_pct is not None and disability_pct >= 40)

    # =========================================================================
    # Scheme 1: Post Graduate Indira Gandhi Scholarship For Single Girl Child
    # =========================================================================
    if "single_girl_child" in sid:
        # Gender
        if not gender:
            result.missing_information.append("Gender")
        elif gender != "female":
            result.failed_rules.append("Restricted to female students.")
        else:
            result.matched_rules.append("Gender is Female.")

        # Single Girl Child Status
        if single_girl is None:
            result.missing_information.append("Single girl child verification")
        elif single_girl is not True:
            result.failed_rules.append("Applicant must be the single/only girl child in the family.")
        else:
            result.matched_rules.append("Single girl child condition satisfied.")

        # Age <= 30
        if age is None:
            result.missing_information.append("Age")
        elif age > 30:
            result.failed_rules.append(f"Age {age} exceeds maximum age limit of 30 years at admission.")
        else:
            result.matched_rules.append(f"Age {age} is within the 30-year limit.")

        # Course Level: Postgraduate / Master's
        if not ed_level:
            result.missing_information.append("Current education level")
        elif ed_level not in ("postgraduate", "pg", "masters", "master"):
            result.failed_rules.append("Must be admitted to a regular Master's/Postgraduate degree.")
        else:
            result.matched_rules.append("Admitted to Postgraduate / Master's degree.")

        # Year of study: First year
        if year is None:
            result.missing_information.append("Year of study")
        elif year != 1:
            result.failed_rules.append(f"Must be in first year of PG (current: year {year}).")
        else:
            result.matched_rules.append("Currently in 1st year of Master's program.")

        # Course type: Non-professional
        if c_type and c_type in ("technical", "professional"):
            result.failed_rules.append("Excludes professional and technical courses; intended for general/non-professional PG degrees.")
        elif c_type and c_type in ("non_professional", "general"):
            result.matched_rules.append("Enrolled in general / non-professional PG program.")

        result.verification_notes.append("Requires affidavit certifying single girl child status on non-judicial stamp paper.")

    # =========================================================================
    # Scheme 2: Post-Graduate Scholarships for Professional Courses for SC/ST Candidates
    # =========================================================================
    elif "professional_courses_for_sc_st" in sid:
        # Category SC / ST
        if not cat:
            result.missing_information.append("Caste / Social category")
        elif cat not in ("sc", "st"):
            result.failed_rules.append("Restricted to candidates belonging to Scheduled Caste (SC) or Scheduled Tribe (ST).")
        else:
            result.matched_rules.append(f"Category matches {cat.upper()}.")

        # Course Level: Postgraduate
        if not ed_level:
            result.missing_information.append("Current education level")
        elif ed_level not in ("postgraduate", "pg", "masters", "master"):
            result.failed_rules.append("Must be enrolled in a Postgraduate degree course.")
        else:
            result.matched_rules.append("Enrolled in Postgraduate degree course.")

        # Course type: Professional
        if not c_type:
            result.missing_information.append("Course type (Professional vs General)")
        elif c_type not in ("professional", "technical"):
            result.failed_rules.append("Must be enrolled in an approved professional PG course (Engineering, Medical, Pharmacy, Management, etc.).")
        else:
            result.matched_rules.append("Enrolled in an approved professional PG discipline.")

        if year is None:
            result.missing_information.append("Year of study")
        elif year != 1:
            result.failed_rules.append("Applicable to first-year admissions.")
        else:
            result.matched_rules.append("Enrolled in first year of professional PG course.")

        result.verification_notes.append("Requires valid SC/ST certificate issued by competent authority.")

    # =========================================================================
    # Scheme 3: Pradhan Mantri Uchchatar Shiksha Protsahan (PM-USP)
    # =========================================================================
    elif "pm_usp_central_sector_scheme" in sid:
        # Course Level: Undergraduate
        if not ed_level:
            result.missing_information.append("Current education level")
        elif ed_level not in ("undergraduate", "ug", "degree"):
            result.failed_rules.append("Must be pursuing a regular Undergraduate degree.")
        else:
            result.matched_rules.append("Pursuing regular Undergraduate degree.")

        # Class 12 Percentile > 80th percentile
        pctl = profile.class12_percentile or profile.previous_marks_percentage
        if pctl is None:
            result.missing_information.append("Class 12 board percentile or marks")
        elif pctl < 80:
            result.failed_rules.append(f"Score ({pctl}%) does not meet the top 80th percentile criteria.")
        else:
            result.matched_rules.append(f"Class 12 performance ({pctl}%) satisfies 80th percentile merit criteria.")

        # Family Income <= 4,50,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 450000:
            result.failed_rules.append(f"Family income ({_format_inr(income)}) exceeds ceiling of ₹4.5 Lakh per annum.")
        else:
            result.matched_rules.append(f"Family income ({_format_inr(income)}) is within ₹4.5 Lakh ceiling.")

        if year is not None:
            if year == 1:
                result.matched_rules.append("Fresh admission (1st year).")
            else:
                result.verification_notes.append("For continuing years, renewal requires maintaining 50% marks and 75% attendance.")

    # =========================================================================
    # Scheme 4: PM-YASASVI Top Class College Education for OBC, EBC and DNT Students
    # =========================================================================
    elif "pm_yasasvi_top_class" in sid:
        # Category: OBC, EBC, DNT
        if not cat:
            result.missing_information.append("Caste / Social category")
        elif cat not in ("obc", "ebc", "dnt"):
            result.failed_rules.append("Restricted to OBC, EBC, or DNT candidates.")
        else:
            result.matched_rules.append(f"Belongs to eligible category ({cat.upper()}).")

        # Income <= 2,50,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 250000:
            result.failed_rules.append(f"Annual family income ({_format_inr(income)}) exceeds limit of ₹2.5 Lakh.")
        else:
            result.matched_rules.append(f"Annual income ({_format_inr(income)}) is within ₹2.5 Lakh limit.")

        # Course level: Beyond Class 12 (Undergraduate, Postgraduate, Diploma)
        if not ed_level:
            result.missing_information.append("Current education level")
        elif ed_level in ("class_9_10", "class_11_12"):
            result.failed_rules.append("Applicable to studies beyond Class 12 (Degree/Top Class Institutions).")
        else:
            result.matched_rules.append("Enrolled in post-12th higher education degree.")

        result.verification_notes.append("Must be admitted to a notified Top Class College / Institution.")

    # =========================================================================
    # Scheme 5: Post Matric Scholarship Students With Disabilities
    # =========================================================================
    elif "post_matric_scholarship_students_with_disabilities" in sid:
        # Disability >= 40%
        if disability_pct is not None:
            if disability_pct < 40:
                result.failed_rules.append(f"Disability percentage ({disability_pct}%) is below the minimum required 40%.")
            else:
                result.matched_rules.append(f"Disability percentage ({disability_pct}%) satisfies the 40%+ quota.")
        elif has_disability is False:
            result.failed_rules.append("Applicant must be a person with benchmark disability (40%+).")
        elif has_disability is True:
            result.matched_rules.append("Certified person with benchmark disability.")
        else:
            result.missing_information.append("Disability status / percentage")

        # Education level: Post-matric (Class 11, 12, Diploma, UG, PG, PhD)
        if not ed_level:
            result.missing_information.append("Education level")
        elif ed_level == "class_9_10":
            result.failed_rules.append("This is a Post-Matric scheme (Class 11 and above). For Class 9-10, see Pre-Matric.")
        else:
            result.matched_rules.append("Enrolled in eligible Post-Matric studies.")

        # Income <= 2,50,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 250000:
            result.failed_rules.append(f"Annual income ({_format_inr(income)}) exceeds ceiling of ₹2.5 Lakh.")
        else:
            result.matched_rules.append(f"Annual family income ({_format_inr(income)}) is within ₹2.5 Lakh limit.")

    # =========================================================================
    # Scheme 6: Pragati Scholarship Scheme For Girl Students (Technical Degree)
    # =========================================================================
    elif "pragati_scholarship_scheme_for_girl_students_technical_degree" in sid:
        # Gender
        if not gender:
            result.missing_information.append("Gender")
        elif gender != "female":
            result.failed_rules.append("Scheme is exclusively for female / girl students.")
        else:
            result.matched_rules.append("Gender is Female.")

        # Education level: Undergraduate / Degree
        if not ed_level:
            result.missing_information.append("Education level")
        elif ed_level not in ("undergraduate", "ug", "degree"):
            result.failed_rules.append("Must be pursuing a technical degree (Bachelor's in Engineering/Tech).")
        else:
            result.matched_rules.append("Pursuing Undergraduate technical degree.")

        # Course type: Technical
        if c_type and c_type not in ("technical", "professional"):
            result.failed_rules.append("Must be in an engineering/technical degree course.")
        elif c_type in ("technical", "professional"):
            result.matched_rules.append("Enrolled in technical degree discipline.")

        # Year of study: Year 1 or Year 2 (lateral entry)
        if year is not None:
            if year == 1 or (year == 2 and profile.is_lateral_entry):
                result.matched_rules.append("Admitted to 1st year (or 2nd year via lateral entry).")
            else:
                result.failed_rules.append("Only 1st year students (or 2nd year lateral entry) are eligible for fresh award.")

        # Institution: AICTE approved
        if inst_type:
            if inst_type == "aicte_approved":
                result.matched_rules.append("Studying in an AICTE-approved institution.")
            else:
                result.verification_notes.append("Requires verification that your college is AICTE-approved for the academic year.")
        else:
            result.verification_notes.append("Host institution must be AICTE-approved.")

        # Family income <= 8,00,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 800000:
            result.failed_rules.append(f"Annual family income ({_format_inr(income)}) exceeds ₹8 Lakh ceiling.")
        else:
            result.matched_rules.append(f"Annual income ({_format_inr(income)}) is within ₹8 Lakh ceiling.")

    # =========================================================================
    # Scheme 7: Pragati Scholarship Scheme For Girl Students (Technical Diploma)
    # =========================================================================
    elif "pragati_scholarship_scheme_for_girl_students_technical_diploma" in sid:
        # Gender
        if not gender:
            result.missing_information.append("Gender")
        elif gender != "female":
            result.failed_rules.append("Scheme is exclusively for female / girl students.")
        else:
            result.matched_rules.append("Gender is Female.")

        # Education level: Diploma
        if not ed_level:
            result.missing_information.append("Education level")
        elif ed_level not in ("diploma", "polytechnic"):
            result.failed_rules.append("Must be enrolled in a technical Diploma course.")
        else:
            result.matched_rules.append("Enrolled in technical Diploma program.")

        # Year of study: Year 1 or Year 2 (lateral entry)
        if year is not None:
            if year == 1 or (year == 2 and profile.is_lateral_entry):
                result.matched_rules.append("Admitted to 1st year (or 2nd year via lateral entry).")
            else:
                result.failed_rules.append("Only 1st year students (or 2nd year lateral entry) are eligible for fresh award.")

        # Family income <= 8,00,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 800000:
            result.failed_rules.append(f"Annual family income ({_format_inr(income)}) exceeds ₹8 Lakh ceiling.")
        else:
            result.matched_rules.append(f"Annual income ({_format_inr(income)}) is within ₹8 Lakh ceiling.")

        result.verification_notes.append("Host polytechnic/institution must be AICTE-approved.")

    # =========================================================================
    # Scheme 8: Pre Matric Scholarship For Students With Disabilities
    # =========================================================================
    elif "pre_matric_scholarship_for_students_with_disabilities" in sid:
        # Disability >= 40%
        if disability_pct is not None:
            if disability_pct < 40:
                result.failed_rules.append(f"Disability percentage ({disability_pct}%) is below required 40%.")
            else:
                result.matched_rules.append(f"Disability percentage ({disability_pct}%) satisfies 40%+ requirement.")
        elif has_disability is False:
            result.failed_rules.append("Applicant must be a person with benchmark disability (40%+).")
        elif has_disability is True:
            result.matched_rules.append("Person with benchmark disability.")
        else:
            result.missing_information.append("Disability status / percentage")

        # Education Level: Class 9 or 10
        if not ed_level:
            result.missing_information.append("School class / education level")
        elif ed_level not in ("class_9_10", "class_9", "class_10", "pre_matric"):
            result.failed_rules.append("Restricted to school students in Class 9 or Class 10.")
        else:
            result.matched_rules.append("Studying in school Class 9 or 10.")

        # Income <= 2,50,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 250000:
            result.failed_rules.append(f"Parent/guardian income ({_format_inr(income)}) exceeds limit of ₹2.5 Lakh.")
        else:
            result.matched_rules.append(f"Family income ({_format_inr(income)}) is within ₹2.5 Lakh limit.")

    # =========================================================================
    # Scheme 9: Pre Matric Scholarship For Scheduled Tribe Students
    # =========================================================================
    elif "pre_matric_scholarship_for_scheduled_tribe_students" in sid:
        # Category: ST
        if not cat:
            result.missing_information.append("Caste / Social category")
        elif cat != "st":
            result.failed_rules.append("Restricted to Scheduled Tribe (ST) students.")
        else:
            result.matched_rules.append("Category matches Scheduled Tribe (ST).")

        # Class 9 or 10
        if not ed_level:
            result.missing_information.append("School class / education level")
        elif ed_level not in ("class_9_10", "class_9", "class_10", "pre_matric"):
            result.failed_rules.append("Restricted to school students in Class 9 or Class 10.")
        else:
            result.matched_rules.append("Studying in Class 9 or 10.")

        # Income <= 2,50,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 250000:
            result.failed_rules.append(f"Parent/guardian income ({_format_inr(income)}) exceeds ₹2.5 Lakh per annum.")
        else:
            result.matched_rules.append(f"Parental income ({_format_inr(income)}) is within ₹2.5 Lakh threshold.")

    # =========================================================================
    # Scheme 10: AICTE – Saksham Scholarship Scheme For Specially-Abled Student (Degree)
    # =========================================================================
    elif "saksham_scholarship_scheme_for_specially_abled_student_degree" in sid:
        # Disability >= 40%
        if disability_pct is not None:
            if disability_pct < 40:
                result.failed_rules.append(f"Disability percentage ({disability_pct}%) is below 40%.")
            else:
                result.matched_rules.append(f"Disability percentage ({disability_pct}%) satisfies 40%+ quota.")
        elif has_disability is False:
            result.failed_rules.append("Restricted to specially-abled students with disability not less than 40%.")
        elif has_disability is True:
            result.matched_rules.append("Person with benchmark disability.")
        else:
            result.missing_information.append("Disability status / percentage")

        # Education level: Undergraduate / Degree
        if not ed_level:
            result.missing_information.append("Education level")
        elif ed_level not in ("undergraduate", "ug", "degree"):
            result.failed_rules.append("Must be admitted to a degree-level technical program.")
        else:
            result.matched_rules.append("Enrolled in technical degree program.")

        # Year of study: Year 1 or Year 2 (lateral entry)
        if year is not None:
            if year == 1 or (year == 2 and profile.is_lateral_entry):
                result.matched_rules.append("Admitted to 1st year (or 2nd year via lateral entry).")
            else:
                result.failed_rules.append("Restricted to 1st year admissions (or 2nd year lateral entry).")

        # Family income <= 8,00,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 800000:
            result.failed_rules.append(f"Annual family income ({_format_inr(income)}) exceeds ₹8 Lakh ceiling.")
        else:
            result.matched_rules.append(f"Family income ({_format_inr(income)}) is within ₹8 Lakh ceiling.")

        result.verification_notes.append("Host institution must be AICTE-approved.")

    # =========================================================================
    # Scheme 11: Post Graduate Merit Scholarship Scheme For University Rank Holders At UG Level
    # =========================================================================
    elif "university_rank_holders" in sid:
        # University Rank: 1 or 2
        rank = profile.university_rank
        if rank is None:
            result.missing_information.append("University rank at undergraduate level")
        elif rank not in (1, 2):
            result.failed_rules.append(f"University rank {rank} does not meet the First or Second rank requirement.")
        else:
            result.matched_rules.append(f"Satisfies University Rank {rank} requirement at UG level.")

        # Course Level: Postgraduate / Master's
        if not ed_level:
            result.missing_information.append("Education level")
        elif ed_level not in ("postgraduate", "pg", "masters", "master"):
            result.failed_rules.append("Must be admitted to a regular Master's/Postgraduate degree.")
        else:
            result.matched_rules.append("Admitted to regular Master's degree.")

        # Minimum marks 60%
        marks = profile.previous_marks_percentage
        if marks is not None:
            if marks < 60:
                result.failed_rules.append(f"Undergraduate marks ({marks}%) fall below the 60% requirement.")
            else:
                result.matched_rules.append(f"Undergraduate marks ({marks}%) satisfy 60%+ threshold.")

        # Age <= 30
        if age is not None:
            if age > 30:
                result.failed_rules.append(f"Age {age} exceeds maximum age limit of 30 years.")
            else:
                result.matched_rules.append(f"Age {age} is within 30-year limit.")

        result.verification_notes.append("Must submit rank certificate issued by the affiliating university.")

    # =========================================================================
    # Scheme 12: Post Graduate Scholarship Scheme for GATE/GPAT Qualified Students-AICTE
    # =========================================================================
    elif "gate_gpat_qualified" in sid:
        # Valid GATE/GPAT
        if profile.valid_gate_or_gpat is None:
            result.missing_information.append("GATE / GPAT / CEED qualification status")
        elif profile.valid_gate_or_gpat is not True:
            result.failed_rules.append("Candidate must hold a valid GATE, GPAT, or CEED score at admission.")
        else:
            result.matched_rules.append("Holds a valid GATE / GPAT qualification.")

        # Course Level: Postgraduate
        if not ed_level:
            result.missing_information.append("Education level")
        elif ed_level not in ("postgraduate", "pg", "masters", "master"):
            result.failed_rules.append("Must be admitted to M.E. / M.Tech. / M.Pharm. / M.Des. program.")
        else:
            result.matched_rules.append("Admitted to postgraduate master's program.")

        result.verification_notes.append("Must be enrolled in an AICTE-approved institution and AICTE-approved course intake.")

    # =========================================================================
    # Scheme 13: Scholarship for Ph.D. Students of Socially and Educationally Backward Classes
    # =========================================================================
    elif "ph_d_students" in sid:
        # Domicile State: Gujarat
        if not state:
            result.missing_information.append("Domicile State")
        elif state != "gujarat":
            result.failed_rules.append("Scheme is strictly restricted to residents of Gujarat state.")
        else:
            result.matched_rules.append("Domicile is Gujarat state.")

        # Category: SEBC
        if not cat:
            result.missing_information.append("Caste / Social category")
        elif cat not in ("sebc", "obc"):
            result.failed_rules.append("Must belong to Socially and Educationally Backward Classes (SEBC).")
        else:
            result.matched_rules.append("Category matches SEBC.")

        # Course level: Ph.D. or M.Phil
        if not ed_level:
            result.missing_information.append("Education level")
        elif ed_level not in ("phd_mphil", "phd", "ph_d", "mphil"):
            result.failed_rules.append("Must be pursuing a full-time M.Phil or Ph.D. degree.")
        else:
            result.matched_rules.append("Pursuing research degree (Ph.D. / M.Phil).")

        # Income <= 6,00,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 600000:
            result.failed_rules.append(f"Family income ({_format_inr(income)}) exceeds ceiling of ₹6 Lakh.")
        else:
            result.matched_rules.append(f"Family income ({_format_inr(income)}) is within ₹6 Lakh ceiling.")

    # =========================================================================
    # Scheme 14: Free Education For Sports Medal Winners / Participants
    # =========================================================================
    elif "sports_medal_winners" in sid:
        # Sports achievement
        sport = _norm(profile.sports_achievement)
        if not sport or sport == "none":
            result.missing_information.append("National/International sports medal or participation")
        elif sport in ("national_medalist", "international_participant", "medalist", "participant", "yes"):
            result.matched_rules.append("Verified medal winner or participant in recognized National/International events.")
        else:
            result.failed_rules.append("Must be a medal winner in National Games or participant in recognized international sporting events.")

        # Course level: UG, PG, Diploma, PhD
        if not ed_level:
            result.missing_information.append("Education level")
        elif ed_level in ("class_9_10",):
            result.failed_rules.append("Applicable to higher education courses (Undergraduate, Postgraduate, Diploma).")
        else:
            result.matched_rules.append("Enrolled in eligible higher education program.")

        result.verification_notes.append("Sports achievement certificate must be authenticated by AIU / IOA / Ministry of Youth Affairs and Sports.")

    # =========================================================================
    # Scheme 15: ICAR - Post Matric Scholarship For SC / ST Candidates
    # =========================================================================
    elif "icar_post_matric" in sid:
        # Category: SC or ST
        if not cat:
            result.missing_information.append("Caste / Social category")
        elif cat not in ("sc", "st"):
            result.failed_rules.append("Restricted to Scheduled Caste (SC) or Scheduled Tribe (ST) candidates.")
        else:
            result.matched_rules.append(f"Belongs to eligible category ({cat.upper()}).")

        # Course level: Undergraduate
        if not ed_level:
            result.missing_information.append("Education level")
        elif ed_level not in ("undergraduate", "ug", "degree"):
            result.failed_rules.append("Must be pursuing an Undergraduate degree.")
        else:
            result.matched_rules.append("Enrolled in Undergraduate degree.")

        # Course type: Agriculture & Allied Sciences
        if not c_type:
            result.missing_information.append("Course field (Agriculture, Horticulture, Veterinary, etc.)")
        elif c_type not in ("agriculture", "allied_sciences", "agri"):
            result.failed_rules.append("Must be pursuing Agriculture or allied sciences in an Agricultural University.")
        else:
            result.matched_rules.append("Enrolled in Agriculture or Allied Sciences.")

    # =========================================================================
    # Scheme 16: National Means-cum-Merit Scholarship Scheme (NMMSS)
    # =========================================================================
    elif "national_means_cum_merit" in sid:
        # Education level: School Class 9
        if not ed_level:
            result.missing_information.append("School class")
        elif ed_level not in ("class_9_10", "class_9", "school"):
            result.failed_rules.append("Awarded at Class 9 (selection exam taken in Class 8).")
        else:
            result.matched_rules.append("Studying in school Class 9.")

        # Income <= 3,50,000 INR
        if income is None:
            result.missing_information.append("Annual family income")
        elif income > 350000:
            result.failed_rules.append(f"Family income ({_format_inr(income)}) exceeds threshold of ₹3.5 Lakh.")
        else:
            result.matched_rules.append(f"Family income ({_format_inr(income)}) is within ₹3.5 Lakh threshold.")

        # Class 7/8 Marks >= 55% (50% for SC/ST)
        min_marks = 50 if cat in ("sc", "st") else 55
        marks = profile.previous_marks_percentage
        if marks is None:
            result.missing_information.append("Class 7/8 percentage marks")
        elif marks < min_marks:
            result.failed_rules.append(f"Class 7/8 marks ({marks}%) fall below the minimum {min_marks}% requirement.")
        else:
            result.matched_rules.append(f"Class 7/8 marks ({marks}%) satisfy the {min_marks}% requirement.")

        # Institution type: Must be Govt / Local Body / Aided school
        if inst_type:
            if inst_type in ("govt_school", "government", "aided"):
                result.matched_rules.append("Studying in a Government, Local Body, or Aided school.")
            elif inst_type in ("private_other", "private"):
                result.failed_rules.append("Students in private schools, Navodaya, Kendriya Vidyalaya, and Sainik schools are not eligible.")
            else:
                result.verification_notes.append("School must be a Government, Local Body, or Government-aided institution.")
        else:
            result.verification_notes.append("Must be enrolled in a Government, Local Body, or Government-aided school.")

    else:
        # Fallback for unexpected schemes
        result.missing_information.append("Scheme-specific detailed rule evaluation")

    # Final Classification
    if result.failed_rules:
        result.status = "not_eligible"
    elif result.missing_information:
        result.status = "needs_verification"
    else:
        result.status = "eligible"

    return result


def match_all_scholarships(profile: StudentProfile) -> Dict[str, Any]:
    dataset = corpus.load_dataset()
    results = [evaluate_scheme(scheme, profile) for scheme in dataset.get("schemes", [])]

    eligible = [asdict(r) for r in results if r.status == "eligible"]
    needs_verification = [asdict(r) for r in results if r.status == "needs_verification"]
    not_eligible = [asdict(r) for r in results if r.status == "not_eligible"]

    return {
        "summary": {
            "total_schemes": len(results),
            "eligible_count": len(eligible),
            "needs_verification_count": len(needs_verification),
            "not_eligible_count": len(not_eligible),
        },
        "eligible": eligible,
        "needs_verification": needs_verification,
        "not_eligible": not_eligible,
        "all_results": [asdict(r) for r in results],
    }
