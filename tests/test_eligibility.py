import pytest
from core.eligibility import StudentProfile, match_all_scholarships
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_single_girl_child_pg_eligibility():
    profile = StudentProfile(
        gender="female",
        age=24,
        single_girl_child=True,
        education_level="postgraduate",
        year_of_study=1,
        course_type="non_professional",
        study_mode="regular",
    )
    results = match_all_scholarships(profile)
    assert results["summary"]["eligible_count"] >= 1
    eligible_ids = [s["scheme_id"] for s in results["eligible"]]
    assert "post_graduate_indira_gandhi_scholarship_for_single_girl_child" in eligible_ids


def test_single_girl_child_ineligible_due_to_age():
    profile = StudentProfile(
        gender="female",
        age=35,  # Exceeds 30
        single_girl_child=True,
        education_level="postgraduate",
        year_of_study=1,
        course_type="non_professional",
        study_mode="regular",
    )
    results = match_all_scholarships(profile)
    not_eligible_ids = [s["scheme_id"] for s in results["not_eligible"]]
    assert "post_graduate_indira_gandhi_scholarship_for_single_girl_child" in not_eligible_ids


def test_pragati_technical_degree_eligibility():
    profile = StudentProfile(
        gender="female",
        education_level="undergraduate",
        course_type="technical",
        year_of_study=1,
        annual_family_income=400000,
        institution_type="aicte_approved",
        study_mode="regular",
    )
    results = match_all_scholarships(profile)
    eligible_ids = [s["scheme_id"] for s in results["eligible"]]
    assert "pragati_scholarship_scheme_for_girl_students_technical_degree" in eligible_ids


def test_pragati_technical_degree_ineligible_due_to_income():
    profile = StudentProfile(
        gender="female",
        education_level="undergraduate",
        course_type="technical",
        year_of_study=1,
        annual_family_income=900000,  # Exceeds 8 Lakh
        institution_type="aicte_approved",
        study_mode="regular",
    )
    results = match_all_scholarships(profile)
    not_eligible_ids = [s["scheme_id"] for s in results["not_eligible"]]
    assert "pragati_scholarship_scheme_for_girl_students_technical_degree" in not_eligible_ids


def test_sc_st_professional_pg_eligibility():
    profile = StudentProfile(
        category="SC",
        education_level="postgraduate",
        course_type="professional",
        year_of_study=1,
        study_mode="regular",
    )
    results = match_all_scholarships(profile)
    eligible_ids = [s["scheme_id"] for s in results["eligible"]]
    assert "post_graduate_scholarships_for_professional_courses_for_sc_st_candidates" in eligible_ids


def test_sebc_phd_gujarat_eligibility():
    profile = StudentProfile(
        category="SEBC",
        domicile_state="Gujarat",
        education_level="phd_mphil",
        annual_family_income=500000,
        study_mode="regular",
    )
    results = match_all_scholarships(profile)
    eligible_ids = [s["scheme_id"] for s in results["eligible"]]
    assert "scholarship_for_ph_d_students_of_socially_and_educationally_backward_classes" in eligible_ids


def test_sebc_phd_different_state_ineligible():
    profile = StudentProfile(
        category="SEBC",
        domicile_state="Maharashtra",  # Must be Gujarat
        education_level="phd_mphil",
        annual_family_income=500000,
        study_mode="regular",
    )
    results = match_all_scholarships(profile)
    not_eligible_ids = [s["scheme_id"] for s in results["not_eligible"]]
    assert "scholarship_for_ph_d_students_of_socially_and_educationally_backward_classes" in not_eligible_ids


def test_disability_post_matric_eligibility():
    profile = StudentProfile(
        has_disability=True,
        disability_percentage=50,
        education_level="undergraduate",
        annual_family_income=200000,
        study_mode="regular",
    )
    results = match_all_scholarships(profile)
    eligible_ids = [s["scheme_id"] for s in results["eligible"]]
    assert "post_matric_scholarship_students_with_disabilities" in eligible_ids


def test_api_eligibility_check_endpoint():
    client = APIClient()
    response = client.post(
        "/api/eligibility/check",
        {
            "gender": "female",
            "age": 22,
            "single_girl_child": True,
            "education_level": "postgraduate",
            "year_of_study": 1,
            "course_type": "non_professional",
        },
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "eligible" in data
    assert "needs_verification" in data
    assert "not_eligible" in data
    assert data["summary"]["total_schemes"] == 16
