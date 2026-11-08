import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Source } from "@/components/components";
import Dashboard from "@/features/workspace/Dashboard";
import Assistant from "@/features/assistant/Assistant";
import EligibilityChecker from "@/features/eligibility/EligibilityChecker";
import SignIn from "@/features/auth/SignIn";
import AuthGateway from "@/features/auth/AuthGateway";
import App from "./App";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: vi.fn(),
  getAuthToken: vi.fn(() => null),
  setAuthToken: vi.fn(),
}));

const citation = {
  scheme_id: "pragati",
  scheme_name: "Pragati Scholarship",
  source_name: null,
  source_url: null,
  retrieved_from: "pragati:benefits:0",
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.mocked(api).mockReset();
});

describe("sources and immediate assistant access", () => {
  it("shows the relevant scholarship name and preserves missing URLs", () => {
    render(<Source citation={citation} />);
    expect(screen.getByText("Pragati Scholarship")).toBeInTheDocument();
    expect(
      screen.getByText("Official source link unavailable in dataset"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Full Scheme" }),
    ).toHaveAttribute("href", "#/scholarships/pragati");
    expect(
      screen.queryByRole("link", { name: "Official source" }),
    ).not.toBeInTheDocument();
  });

  it("rejects unsafe source URL protocols", () => {
    render(
      <Source citation={{ ...citation, source_url: "javascript:alert(1)" }} />,
    );
    expect(
      screen.getByRole("link", { name: "View Full Scheme" }),
    ).toHaveAttribute("href", "#/scholarships/pragati");
    expect(
      screen.queryByRole("link", { name: "Official source" }),
    ).not.toBeInTheDocument();
  });

  it("allows ordinary official source links", () => {
    render(
      <Source
        citation={{
          ...citation,
          source_url: "https://example.org/scholarship",
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Official source" }),
    ).toHaveAttribute("href", "https://example.org/scholarship");
  });

  it("opens scholarship questions without a profile workflow", () => {
    render(<Dashboard schemes={[]} />);
    expect(
      screen.getByRole("button", { name: /Ask about scholarships/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Build my profile")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Confirmed rule matches"),
    ).not.toBeInTheDocument();
  });

  it("renders actual generated prose and sends no profile", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      session_id: "session",
      session_token: "token",
    });
    vi.mocked(api).mockResolvedValueOnce({
      answer: "Pragati can help cover your education costs.",
      status: "success",
      sources: [citation, citation],
    });
    render(<Assistant />);
    fireEvent.change(screen.getByLabelText("Ask a scholarship question"), {
      target: { value: "Tell me about Pragati" },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Send/ })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Send/ }));
    expect(
      await screen.findByText("Pragati can help cover your education costs."),
    ).toBeInTheDocument();
    expect(screen.getByText("Sources (1)")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "View Full Scheme" }),
    ).toHaveLength(1);
    const sent = vi.mocked(api).mock.calls[1][1] as Record<string, unknown>;
    expect(sent).toEqual({
      question: "Tell me about Pragati",
      session_id: "session",
    });
  });

  it("shows provider failures clearly instead of fake AI excerpts", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      session_id: "session",
      session_token: "token",
    });
    vi.mocked(api).mockRejectedValueOnce(
      new Error("Provider quota reached. Please try again."),
    );
    render(<Assistant />);
    fireEvent.change(screen.getByLabelText("Ask a scholarship question"), {
      target: { value: "Pragati?" },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Send/ })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Send/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Provider quota reached",
    );
    expect(
      screen.queryByText("Showing verified dataset excerpts."),
    ).not.toBeInTheDocument();
  });

  it("passes selected scholarship context without forcing a hard filter", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      session_id: "session",
      session_token: "token",
    });
    vi.mocked(api).mockResolvedValueOnce({
      answer: "The available criteria are explained here.",
      status: "success",
      sources: [citation],
    });
    render(<Assistant schemeId="selected-scholarship" />);
    fireEvent.change(screen.getByLabelText("Ask a scholarship question"), {
      target: { value: "Who is eligible?" },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Send/ })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Send/ }));
    await screen.findByText("The available criteria are explained here.");
    expect(vi.mocked(api).mock.calls[1][1]).toEqual({
      question: "Who is eligible?",
      session_id: "session",
      context_scheme_id: "selected-scholarship",
    });
  });

  it("renders eligibility checker form and submits student profile", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      summary: {
        total_schemes: 16,
        eligible_count: 1,
        needs_verification_count: 2,
        not_eligible_count: 13,
      },
      eligible: [
        {
          scheme_id: "pragati_scholarship_scheme_for_girl_students_technical_degree",
          scheme_name: "Pragati Scholarship Scheme For Girl Students (Technical Degree)",
          provider: "AICTE",
          status: "eligible",
          objective: "To support technical education for girls",
          benefits_summary: "₹50,000 per annum",
          matched_rules: ["Gender is Female.", "Enrolled in technical degree discipline."],
          failed_rules: [],
          missing_information: [],
          verification_notes: ["Host institution must be AICTE-approved."],
        },
      ],
      needs_verification: [],
      not_eligible: [],
      all_results: [],
    });
    render(<EligibilityChecker />);
    expect(screen.getByText("Scholarship Eligibility Matcher")).toBeInTheDocument();
    expect(screen.getByText("1. Identity & Demographic Details")).toBeInTheDocument();
    expect(screen.getByText("2. Socio-Economic & Caste Category")).toBeInTheDocument();
    expect(screen.getByText("3. Academic & Course Details")).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Find Matching Scholarships/ });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Pragati Scholarship Scheme For Girl Students (Technical Degree)")).toBeInTheDocument();
    expect(screen.getByText("Fully Eligible")).toBeInTheDocument();
    expect(screen.getByText("Gender is Female.")).toBeInTheDocument();
  });

  it("renders student sign in interface with email, password, and registration", async () => {
    render(<SignIn />);
    expect(screen.getByRole("heading", { name: "Student Sign In" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In with Email/ })).toBeInTheDocument();

    // Switch to Create Account
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByRole("heading", { name: "Create Student Account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Your Name")).toBeInTheDocument();
  });

  it("renders standalone AuthGateway with Google Sign-In and credentials", async () => {
    vi.mocked(api).mockResolvedValue({ google_client_id: "" });
    const onAuthSuccess = vi.fn();
    render(<AuthGateway onAuthSuccess={onAuthSuccess} />);

    expect(screen.getByText("STUDENT PORTAL")).toBeInTheDocument();
    expect(screen.getByText("🔒 AUTHENTICATED ACCESS ONLY")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Student Sign In" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in with Google/ })).toBeInTheDocument();

    // Switch to register mode
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByRole("heading", { name: "Create Student Account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Student Name")).toBeInTheDocument();

    // Clicking Google button when no client_id configured prompts for Google Cloud Client ID
    fireEvent.click(screen.getByRole("button", { name: /Sign in with Google/ }));
    expect(screen.getByText("Connect Google Sign-In")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 123456789-abcdef.apps.googleusercontent.com")).toBeInTheDocument();
  });

  it("gates application workspace so only signed-in candidates can view it", async () => {
    vi.mocked(api).mockResolvedValue({ google_client_id: "" });
    render(<App />);

    // Initially unauthenticated: renders AuthGateway, not main workspace
    expect(screen.getByText("STUDENT PORTAL")).toBeInTheDocument();
    expect(screen.getByText("🔒 AUTHENTICATED ACCESS ONLY")).toBeInTheDocument();
    expect(screen.queryByText("STUDENT WORKSPACE")).not.toBeInTheDocument();
  });
});
