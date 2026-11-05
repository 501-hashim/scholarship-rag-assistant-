export type Citation = {
  scheme_id: string;
  scheme_name: string;
  source_name: string | null;
  source_url: string | null;
  retrieved_from: string;
  original_record_key?: string;
  excerpt?: string | null;
};

export type Scheme = {
  scheme_id: string;
  name: string;
  provider: string;
  objective?: string;
  benefits: unknown;
  eligibility: unknown;
  documents_required: unknown;
  application: unknown;
  important_notes: string[];
  target_groups?: unknown;
  tags?: unknown;
  exclusions?: unknown;
  selection?: unknown;
  citation?: Citation;
};

export type Answer = {
  answer: string;
  sources: Citation[];
  status: "success" | "out_of_scope" | "insufficient_evidence" | "error";
  error?: { code: string; message: string } | null;
};

export type StudentProfile = {
  gender?: string | null;
  age?: number | null;
  single_girl_child?: boolean | null;
  domicile_state?: string | null;
  category?: string | null;
  annual_family_income?: number | null;
  receiving_other_scholarship?: boolean | null;
  education_level?: string | null;
  course_type?: string | null;
  year_of_study?: number | null;
  study_mode?: string | null;
  institution_type?: string | null;
  is_lateral_entry?: boolean | null;
  has_disability?: boolean | null;
  disability_percentage?: number | null;
  class12_percentile?: number | null;
  previous_marks_percentage?: number | null;
  university_rank?: number | null;
  valid_gate_or_gpat?: boolean | null;
  sports_achievement?: string | null;
};

export type MatchResultItem = {
  scheme_id: string;
  scheme_name: string;
  provider: string;
  status: "eligible" | "needs_verification" | "not_eligible";
  objective?: string | null;
  benefits_summary?: string | null;
  matched_rules: string[];
  failed_rules: string[];
  missing_information: string[];
  verification_notes: string[];
};

export type EligibilityCheckResponse = {
  summary: {
    total_schemes: number;
    eligible_count: number;
    needs_verification_count: number;
    not_eligible_count: number;
  };
  eligible: MatchResultItem[];
  needs_verification: MatchResultItem[];
  not_eligible: MatchResultItem[];
  all_results: MatchResultItem[];
};
