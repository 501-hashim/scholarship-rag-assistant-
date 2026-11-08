import { useState } from "react";
import { api } from "@/services/api";
import { navigate, schemeHref } from "@/services/navigation";
import type { EligibilityCheckResponse, MatchResultItem, StudentProfile } from "@/types/types";

const INITIAL_PROFILE: StudentProfile = {
  gender: "",
  age: null,
  single_girl_child: false,
  domicile_state: "",
  category: "",
  annual_family_income: null,
  receiving_other_scholarship: false,
  education_level: "",
  course_type: "",
  year_of_study: 1,
  study_mode: "regular",
  institution_type: "",
  is_lateral_entry: false,
  has_disability: false,
  disability_percentage: null,
  class12_percentile: null,
  previous_marks_percentage: null,
  university_rank: null,
  valid_gate_or_gpat: false,
  sports_achievement: "none",
};

const PRESETS: { label: string; description: string; profile: StudentProfile }[] = [
  {
    label: "Single Girl Child (PG)",
    description: "Female, 23 yrs, only girl child, 1st yr PG non-professional",
    profile: {
      ...INITIAL_PROFILE,
      gender: "female",
      age: 23,
      single_girl_child: true,
      education_level: "postgraduate",
      course_type: "non_professional",
      year_of_study: 1,
      study_mode: "regular",
    },
  },
  {
    label: "Girl in Tech Degree (Pragati)",
    description: "Female, 1st yr B.Tech in AICTE college, income ₹3.5L",
    profile: {
      ...INITIAL_PROFILE,
      gender: "female",
      education_level: "undergraduate",
      course_type: "technical",
      year_of_study: 1,
      annual_family_income: 350000,
      institution_type: "aicte_approved",
      study_mode: "regular",
    },
  },
  {
    label: "SC/ST Professional PG",
    description: "SC candidate in 1st yr M.Tech/MBA professional program",
    profile: {
      ...INITIAL_PROFILE,
      category: "SC",
      education_level: "postgraduate",
      course_type: "professional",
      year_of_study: 1,
      study_mode: "regular",
    },
  },
  {
    label: "Specially-Abled Student (Saksham)",
    description: "45% disability, 1st yr B.Tech AICTE, income ₹4L",
    profile: {
      ...INITIAL_PROFILE,
      has_disability: true,
      disability_percentage: 45,
      education_level: "undergraduate",
      course_type: "technical",
      year_of_study: 1,
      annual_family_income: 400000,
      institution_type: "aicte_approved",
      study_mode: "regular",
    },
  },
  {
    label: "OBC / EBC College (PM-YASASVI)",
    description: "OBC student in degree college, income ₹1.8L",
    profile: {
      ...INITIAL_PROFILE,
      category: "OBC",
      education_level: "undergraduate",
      year_of_study: 1,
      annual_family_income: 180000,
      study_mode: "regular",
    },
  },
  {
    label: "UG University Rank Holder",
    description: "1st rank in B.Sc (78%), admitted to M.Sc, age 22",
    profile: {
      ...INITIAL_PROFILE,
      education_level: "postgraduate",
      year_of_study: 1,
      university_rank: 1,
      previous_marks_percentage: 78,
      age: 22,
      course_type: "non_professional",
      study_mode: "regular",
    },
  },
];

const STATES = [
  "All India / Central",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function EligibilityChecker() {
  const [profile, setProfile] = useState<StudentProfile>(INITIAL_PROFILE);
  const [results, setResults] = useState<EligibilityCheckResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "eligible" | "needs_verification" | "not_eligible">("all");

  const update = (fields: Partial<StudentProfile>) => {
    setProfile((prev) => ({ ...prev, ...fields }));
  };

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Clean null/empty string values for API
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(profile)) {
        if (v !== "" && v !== null && v !== undefined) {
          payload[k] = v;
        }
      }
      const data = await api<EligibilityCheckResponse>("/eligibility/check", payload);
      setResults(data);
      // If eligible schemes exist, default view to eligible or all
      if (data.summary.eligible_count > 0) {
        setFilter("eligible");
      } else if (data.summary.needs_verification_count > 0) {
        setFilter("needs_verification");
      } else {
        setFilter("all");
      }
      // Scroll smoothly down to results
      setTimeout(() => {
        const el = document.getElementById("eligibility-results");
        if (el && typeof el.scrollIntoView === "function") { el.scrollIntoView({ behavior: "smooth" }); }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate eligibility.");
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setProfile(INITIAL_PROFILE);
    setResults(null);
    setError("");
  };

  const displayedSchemes = results
    ? filter === "all"
      ? results.all_results
      : filter === "eligible"
        ? results.eligible
        : filter === "needs_verification"
          ? results.needs_verification
          : results.not_eligible
    : [];

  return (
    <div className="eligibility-container">
      {/* Introduction Card */}
      <div className="panel" style={{ marginBottom: "24px" }}>
        <div className="panel-heading">
          <div>
            <h2>Scholarship Eligibility Matcher</h2>
            <p>
              Fill out your student profile to evaluate your exact eligibility across all 16 central and
              state scholarship schemes in our database. Irrelevant identity tracking (such as exact roll numbers or parent profession) has been removed, focusing strictly on verified scholarship criteria.
            </p>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div style={{ marginTop: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#687c6f", textTransform: "uppercase" }}>
            Quick Sample Profiles (Click to test instantly):
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="button subtle"
                style={{ fontSize: "11px", padding: "8px 12px", borderRadius: "6px" }}
                onClick={() => {
                  setProfile(p.profile);
                  // Trigger automatic check on preset click
                  setTimeout(() => {
                    const payload: Record<string, unknown> = {};
                    for (const [k, v] of Object.entries(p.profile)) {
                      if (v !== "" && v !== null && v !== undefined) payload[k] = v;
                    }
                    api<EligibilityCheckResponse>("/eligibility/check", payload).then((data) => {
                      setResults(data);
                      if (data.summary.eligible_count > 0) setFilter("eligible");
                      else setFilter("all");
                    });
                  }, 50);
                }}
                title={p.description}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Multi-Section Form */}
      <form onSubmit={handleCheck}>
        {/* Section 1: Demographics & Identity */}
        <div className="panel" style={{ marginBottom: "20px" }}>
          <h3 style={{ borderBottom: "1px solid #eef2eb", paddingBottom: "10px", color: "#224b38" }}>
            1. Identity & Demographic Details
          </h3>
          <p style={{ fontSize: "12px", marginTop: "4px", marginBottom: "16px" }}>
            Used for gender-specific schemes (Single Girl Child, Pragati) and age or state quotas.
          </p>
          <div className="form-grid">
            <label>
              <span>Gender</span>
              <select
                value={profile.gender || ""}
                onChange={(e) => update({ gender: e.target.value || null })}
              >
                <option value="">-- Select Gender --</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              <span>Age (in years)</span>
              <input
                type="number"
                min="5"
                max="100"
                placeholder="e.g. 21"
                value={profile.age ?? ""}
                onChange={(e) => update({ age: e.target.value ? Number(e.target.value) : null })}
              />
            </label>

            <label>
              <span>Single Girl Child in Family?</span>
              <select
                value={profile.single_girl_child === true ? "yes" : profile.single_girl_child === false ? "no" : ""}
                onChange={(e) => update({ single_girl_child: e.target.value === "yes" ? true : e.target.value === "no" ? false : null })}
              >
                <option value="no">No</option>
                <option value="yes">Yes (Only girl child in family)</option>
              </select>
            </label>

            <label>
              <span>Domicile / Residence State</span>
              <select
                value={profile.domicile_state || ""}
                onChange={(e) => update({ domicile_state: e.target.value || null })}
              >
                <option value="">-- Select State --</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Section 2: Socio-Economic & Category */}
        <div className="panel" style={{ marginBottom: "20px" }}>
          <h3 style={{ borderBottom: "1px solid #eef2eb", paddingBottom: "10px", color: "#224b38" }}>
            2. Socio-Economic & Caste Category
          </h3>
          <p style={{ fontSize: "12px", marginTop: "4px", marginBottom: "16px" }}>
            Determines eligibility for reserved quotas (SC/ST, OBC, EBC, DNT, SEBC) and income-capped schemes.
          </p>
          <div className="form-grid">
            <label>
              <span>Community / Caste Category</span>
              <select
                value={profile.category || ""}
                onChange={(e) => update({ category: e.target.value || null })}
              >
                <option value="">-- Select Category --</option>
                <option value="General">General</option>
                <option value="SC">Scheduled Caste (SC)</option>
                <option value="ST">Scheduled Tribe (ST)</option>
                <option value="OBC">Other Backward Class (OBC)</option>
                <option value="EBC">Economically Backward Class (EBC)</option>
                <option value="DNT">De-Notified Tribe (DNT)</option>
                <option value="SEBC">Socially and Educationally Backward Classes (SEBC - Gujarat)</option>
                <option value="EWS">Economically Weaker Section (EWS)</option>
              </select>
            </label>

            <label>
              <span>Annual Family Income (in INR ₹)</span>
              <input
                type="number"
                min="0"
                step="5000"
                placeholder="e.g. 250000"
                value={profile.annual_family_income ?? ""}
                onChange={(e) => update({ annual_family_income: e.target.value ? Number(e.target.value) : null })}
              />
            </label>

            <label style={{ gridColumn: "span 2" }}>
              <span>Are you currently receiving another government scholarship?</span>
              <select
                value={profile.receiving_other_scholarship ? "yes" : "no"}
                onChange={(e) => update({ receiving_other_scholarship: e.target.value === "yes" })}
              >
                <option value="no">No (Not receiving any other government scholarship)</option>
                <option value="yes">Yes (Currently receiving another government scholarship)</option>
              </select>
              <small style={{ color: "#8a948e" }}>
                Most central schemes exclude students receiving duplicate central/state government assistance.
              </small>
            </label>
          </div>
        </div>

        {/* Section 3: Academic & Institutional Context */}
        <div className="panel" style={{ marginBottom: "20px" }}>
          <h3 style={{ borderBottom: "1px solid #eef2eb", paddingBottom: "10px", color: "#224b38" }}>
            3. Academic & Course Details
          </h3>
          <p style={{ fontSize: "12px", marginTop: "4px", marginBottom: "16px" }}>
            Matches your study level, degree type, and university accreditation requirements.
          </p>
          <div className="form-grid">
            <label>
              <span>Current Education Level</span>
              <select
                value={profile.education_level || ""}
                onChange={(e) => update({ education_level: e.target.value || null })}
              >
                <option value="">-- Select Education Level --</option>
                <option value="class_9_10">School: Secondary (Class 9 or 10)</option>
                <option value="class_11_12">School: Senior Secondary (Class 11 or 12)</option>
                <option value="diploma">Technical Diploma / Polytechnic</option>
                <option value="undergraduate">Undergraduate / Bachelor's Degree (B.Tech, B.Sc, B.A, etc.)</option>
                <option value="postgraduate">Postgraduate / Master's Degree (M.Tech, M.Sc, M.A, etc.)</option>
                <option value="phd_mphil">Research: M.Phil or Ph.D.</option>
              </select>
            </label>

            <label>
              <span>Course Discipline / Field</span>
              <select
                value={profile.course_type || ""}
                onChange={(e) => update({ course_type: e.target.value || null })}
              >
                <option value="">-- Select Course Field --</option>
                <option value="technical">Engineering & Technology (Technical Degree / Diploma)</option>
                <option value="professional">Professional (Medicine, Management, Pharmacy, Law, Architecture)</option>
                <option value="non_professional">General / Non-Professional (Humanities, Sciences, Commerce, Arts)</option>
                <option value="agriculture">Agriculture & Allied Sciences (ICAR affiliated)</option>
                <option value="other">Other Discipline</option>
              </select>
            </label>

            <label>
              <span>Current Year of Study</span>
              <select
                value={profile.year_of_study ?? 1}
                onChange={(e) => update({ year_of_study: Number(e.target.value) })}
              >
                <option value={1}>1st Year (Fresh Admission)</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year or above</option>
              </select>
            </label>

            <label>
              <span>Study Mode</span>
              <select
                value={profile.study_mode || "regular"}
                onChange={(e) => update({ study_mode: e.target.value })}
              >
                <option value="regular">Regular / Full-time</option>
                <option value="distance">Distance / Correspondence / Part-time</option>
              </select>
            </label>

            <label>
              <span>Institution Accreditation</span>
              <select
                value={profile.institution_type || ""}
                onChange={(e) => update({ institution_type: e.target.value || null })}
              >
                <option value="">-- Select Institution Type --</option>
                <option value="aicte_approved">AICTE Approved Institution / University Department</option>
                <option value="university_college">UGC Recognized University or Affiliated College</option>
                <option value="govt_school">Government or Government-Aided School</option>
                <option value="private_other">Private School / Unaccredited Institution</option>
              </select>
            </label>

            <label>
              <span>Admitted via Lateral Entry?</span>
              <select
                value={profile.is_lateral_entry ? "yes" : "no"}
                onChange={(e) => update({ is_lateral_entry: e.target.value === "yes" })}
              >
                <option value="no">No (Direct 1st year admission)</option>
                <option value="yes">Yes (Direct 2nd year lateral entry for diploma holders)</option>
              </select>
            </label>
          </div>
        </div>

        {/* Section 4: Special Abilities, Merit & Exam Scores */}
        <div className="panel" style={{ marginBottom: "24px" }}>
          <h3 style={{ borderBottom: "1px solid #eef2eb", paddingBottom: "10px", color: "#224b38" }}>
            4. Special Status, Merit & Achievements
          </h3>
          <p style={{ fontSize: "12px", marginTop: "4px", marginBottom: "16px" }}>
            Specialized quotas for persons with disabilities, university rank holders, GATE scholars, and sports achievers.
          </p>
          <div className="form-grid">
            <label>
              <span>Person with Benchmark Disability (PwD)?</span>
              <select
                value={profile.has_disability ? "yes" : "no"}
                onChange={(e) => {
                  const hasDis = e.target.value === "yes";
                  update({
                    has_disability: hasDis,
                    disability_percentage: hasDis ? (profile.disability_percentage ?? 40) : null,
                  });
                }}
              >
                <option value="no">No</option>
                <option value="yes">Yes (Certified disability)</option>
              </select>
            </label>

            {profile.has_disability && (
              <label>
                <span>Disability Percentage (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 40"
                  value={profile.disability_percentage ?? ""}
                  onChange={(e) => update({ disability_percentage: e.target.value ? Number(e.target.value) : null })}
                />
              </label>
            )}

            <label>
              <span>Class 12th Board Percentile / Percentage</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 85.5 (PM-USP requires 80th percentile)"
                value={profile.class12_percentile ?? ""}
                onChange={(e) => update({ class12_percentile: e.target.value ? Number(e.target.value) : null })}
              />
            </label>

            <label>
              <span>Previous Qualifying Exam Marks (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 65 (Used for PG merit, NMMSS)"
                value={profile.previous_marks_percentage ?? ""}
                onChange={(e) => update({ previous_marks_percentage: e.target.value ? Number(e.target.value) : null })}
              />
            </label>

            <label>
              <span>University Rank at Under-Graduate Level</span>
              <select
                value={profile.university_rank ?? ""}
                onChange={(e) => update({ university_rank: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">None / Not a top-2 rank holder</option>
                <option value="1">1st Rank Holder (Gold Medalist / First Rank)</option>
                <option value="2">2nd Rank Holder (Second Rank)</option>
              </select>
            </label>

            <label>
              <span>Valid GATE / GPAT / CEED Score?</span>
              <select
                value={profile.valid_gate_or_gpat ? "yes" : "no"}
                onChange={(e) => update({ valid_gate_or_gpat: e.target.value === "yes" })}
              >
                <option value="no">No</option>
                <option value="yes">Yes (Qualified with valid score)</option>
              </select>
            </label>

            <label style={{ gridColumn: "span 2" }}>
              <span>Sports Achievement at National or International Level?</span>
              <select
                value={profile.sports_achievement || "none"}
                onChange={(e) => update({ sports_achievement: e.target.value })}
              >
                <option value="none">None / School / District / State Level</option>
                <option value="national_medalist">Medal Winner in National Games</option>
                <option value="international_participant">Participant in Recognized International Sporting Event</option>
              </select>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "32px" }}>
          <button type="submit" className="button primary" disabled={busy} style={{ fontSize: "14px", padding: "14px 28px" }}>
            {busy ? "Evaluating Schemes…" : "Find Matching Scholarships →"}
          </button>
          <button type="button" className="button subtle" onClick={resetForm} disabled={busy}>
            Clear Form
          </button>
        </div>
      </form>

      {/* Error Banner */}
      {error && (
        <div className="error" role="alert" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div id="eligibility-results" style={{ paddingTop: "20px" }}>
          {/* Summary Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e1e8dd", borderLeft: "4px solid #2e7d32" }}>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#2e7d32" }}>{results.summary.eligible_count}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#37474f", marginTop: "4px" }}>Fully Eligible</div>
              <small style={{ color: "#78909c" }}>All mapped hard criteria passed</small>
            </div>

            <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e1e8dd", borderLeft: "4px solid #f57f17" }}>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#f57f17" }}>{results.summary.needs_verification_count}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#37474f", marginTop: "4px" }}>Needs Verification</div>
              <small style={{ color: "#78909c" }}>Potentially eligible; verification required</small>
            </div>

            <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e1e8dd", borderLeft: "4px solid #c62828" }}>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#c62828" }}>{results.summary.not_eligible_count}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#37474f", marginTop: "4px" }}>Not Eligible</div>
              <small style={{ color: "#78909c" }}>At least one hard condition failed</small>
            </div>

            <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e1e8dd", borderLeft: "4px solid #455a64" }}>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#455a64" }}>{results.summary.total_schemes}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#37474f", marginTop: "4px" }}>Total Evaluated</div>
              <small style={{ color: "#78909c" }}>All schemes in verified corpus</small>
            </div>
          </div>

          {/* Filter Navigation Tabs */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid #e6eae2", marginBottom: "20px", paddingBottom: "10px" }}>
            {[
              { id: "eligible", label: `Eligible (${results.summary.eligible_count})` },
              { id: "needs_verification", label: `Needs Verification (${results.summary.needs_verification_count})` },
              { id: "all", label: `All Schemes (${results.summary.total_schemes})` },
              { id: "not_eligible", label: `Ineligible (${results.summary.not_eligible_count})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`button ${filter === tab.id ? "primary" : "subtle"}`}
                style={{ padding: "8px 16px", fontSize: "12px", borderRadius: "20px" }}
                onClick={() => setFilter(tab.id as typeof filter)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results Cards List */}
          {displayedSchemes.length === 0 ? (
            <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ margin: 0 }}>No scholarships found in this category.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {displayedSchemes.map((item: MatchResultItem) => {
                const isElig = item.status === "eligible";
                const isNeed = item.status === "needs_verification";
                const borderColor = isElig ? "#2e7d32" : isNeed ? "#f57f17" : "#cfd8dc";
                const badgeBg = isElig ? "#e8f5e9" : isNeed ? "#fff8e1" : "#eceff1";
                const badgeColor = isElig ? "#1b5e20" : isNeed ? "#f57f17" : "#546e7a";
                const badgeText = isElig ? "✓ Eligible" : isNeed ? "? Needs Verification" : "✗ Not Eligible";

                return (
                  <div
                    key={item.scheme_id}
                    className="panel"
                    style={{
                      borderLeft: `5px solid ${borderColor}`,
                      padding: "24px",
                      position: "relative",
                      transition: "box-shadow 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                          <span
                            style={{
                              background: badgeBg,
                              color: badgeColor,
                              padding: "4px 10px",
                              borderRadius: "14px",
                              fontSize: "11px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {badgeText}
                          </span>
                          <span style={{ fontSize: "11px", color: "#607d8b", fontWeight: 600 }}>
                            {item.provider}
                          </span>
                        </div>
                        <h3 style={{ margin: "4px 0 8px", fontSize: "18px" }}>{item.scheme_name}</h3>
                        {item.objective && (
                          <p style={{ fontSize: "13px", color: "#546e7a", margin: "4px 0 12px", lineHeight: "1.6" }}>
                            {item.objective}
                          </p>
                        )}
                        {item.benefits_summary && (
                          <div style={{ display: "inline-block", background: "#f0f4ec", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#254a3a", marginBottom: "12px" }}>
                            💰 Benefits: {item.benefits_summary}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <a
                          className="button subtle"
                          href={schemeHref(item.scheme_id)}
                          style={{ fontSize: "11px", padding: "8px 12px" }}
                        >
                          View Scheme Details ↗
                        </a>
                      </div>
                    </div>

                    {/* Criteria Details */}
                    <div style={{ marginTop: "14px", display: "grid", gap: "10px", borderTop: "1px solid #edf0e8", paddingTop: "14px" }}>
                      {/* Matched Rules */}
                      {item.matched_rules.length > 0 && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#2e7d32", textTransform: "uppercase", marginBottom: "4px" }}>
                            ✓ Met Requirements:
                          </div>
                          <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "12px", color: "#2e7d32" }}>
                            {item.matched_rules.map((rule, idx) => (
                              <li key={idx}>{rule}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Missing / Unverified Information */}
                      {item.missing_information.length > 0 && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#b26a00", textTransform: "uppercase", marginBottom: "4px" }}>
                            ? Information Needed or Verification Required:
                          </div>
                          <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "12px", color: "#795548" }}>
                            {item.missing_information.map((info, idx) => (
                              <li key={idx}>Provide/verify: {info}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Failed Rules */}
                      {item.failed_rules.length > 0 && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#c62828", textTransform: "uppercase", marginBottom: "4px" }}>
                            ✗ Ineligibility Reasons:
                          </div>
                          <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "12px", color: "#c62828" }}>
                            {item.failed_rules.map((fail, idx) => (
                              <li key={idx}>{fail}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Verification Notes */}
                      {item.verification_notes.length > 0 && (
                        <div style={{ background: "#fafbf9", border: "1px dashed #d1dcce", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", color: "#455a64" }}>
                          <strong>Note for Application:</strong> {item.verification_notes.join(" ")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
