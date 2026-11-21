"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

type View =
  | "Dashboard"
  | "Risk detection"
  | "AI evaluation lab"
  | "Review comparison"
  | "Bilingual evidence"
  | "Evidence provenance"
  | "AI security testing"
  | "Release controls"
  | "Cases"
  | "Documents"
  | "Approvals"
  | "Transactions"
  | "Investigation assistant"
  | "Agent monitor"
  | "Policies & evaluations"
  | "Supervisor"
  | "Security";
type Role = "Analyst" | "Reviewer" | "Supervisor";
const navigation: { title: string; items: View[] }[] = [
  {
    title: "INVESTIGATION",
    items: [
      "Dashboard",
      "Risk detection",
      "Transactions",
      "Investigation assistant",
      "Bilingual evidence",
      "Evidence provenance",
    ],
  },
  {
    title: "OVERSIGHT",
    items: [
      "Review comparison",
      "AI evaluation lab",
      "AI security testing",
      "Release controls",
      "Agent monitor",
      "Policies & evaluations",
      "Supervisor",
    ],
  },
];
const icons: Record<string, string> = {
  Dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  "Risk detection": "M12 3 2 21h20L12 3z M12 9v5 M12 18h.01",
  "Bilingual evidence": "M4 5h11 M9 3v2 M6 8c1 4 4 6 8 7 M14 7c-2 4-5 7-9 9 M14 20l4-10 4 10 M16 17h4",
  "Evidence provenance": "M6 3h9l4 4v14H6z M14 3v6h5 M9 13h7 M9 17h5",
  "AI security testing": "M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6",
  "Release controls": "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5",
  "Review comparison": "M9 4H5v17h15V4h-4 M9 3h7v4H9z M8 14l3 3 5-6",
  "AI evaluation lab": "M8 3h8 M10 3v6l-6 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-9V3 M8 16h8",
  Cases: "M3 7h7l2-3h8v16H3z M3 10h17",
  Documents: "M6 3h9l4 4v14H6z M14 3v6h5 M9 13h7 M9 17h5",
  Approvals: "M9 4H5v17h15V4h-4 M9 3h7v4H9z M8 14l3 3 5-6",
  Transactions: "M3 7h17l-4-4 M21 17H4l4 4",
  "Investigation assistant": "M12 3l2 6 6 3-6 2-2 7-2-7-7-2 7-3z",
  "Agent monitor": "M3 12h4l3-8 4 16 3-8h4",
  "Policies & evaluations": "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5",
  Supervisor:
    "M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M1 21v-3a6 6 0 0 1 12 0v3 M17 5a3 3 0 0 1 0 6 M17 15a5 5 0 0 1 5 5",
  Security: "M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  bell: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4",
  arrow: "M4 12h16 M15 7l5 5-5 5",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  check: "M4 12l5 5L20 6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v6l4 2",
};
function Icon({ name }: { name: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[name] ?? icons.Documents} />
    </svg>
  );
}
function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
}) {
  return <span className={`ws-badge ws-${tone}`}>{children}</span>;
}
function Card({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="ws-card">
      <div className="ws-card-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
const cases = [
  {
    id: "DEMO-001",
    customer: "Aster Trading LLC",
    type: "Transaction monitoring",
    status: "Awaiting review",
    risk: "High",
    owner: "Maya Hassan",
    due: "Today",
    progress: 83,
  },
  {
    id: "DEMO-002",
    customer: "Noor Logistics",
    type: "Customer due diligence",
    status: "Investigating",
    risk: "Medium",
    owner: "Omar Ali",
    due: "Tomorrow",
    progress: 50,
  },
  {
    id: "DEMO-003",
    customer: "Cedar Ventures",
    type: "Document discrepancy",
    status: "Rework",
    risk: "High",
    owner: "Maya Hassan",
    due: "Overdue",
    progress: 66,
  },
  {
    id: "DEMO-004",
    customer: "Harbour Services",
    type: "Periodic KYC refresh",
    status: "Assigned",
    risk: "Low",
    owner: "Lina Ahmed",
    due: "In 3 days",
    progress: 17,
  },
];
const documents = [
  {
    name: "Proof of address",
    file: "proof-of-address-clean.pdf",
    state: "Selected",
    tone: "green" as const,
    source: "Analyst upload · v2",
    note: "Readable document with corrected fields. Selection reason is illustrative; backend selection metadata is not connected.",
    fields: [
      ["Full name", "SYNTHETIC Person 001", "Analyst correction · unverified"],
      [
        "Address",
        "001 Synthetic Street, Dubai, UAE",
        "Analyst correction · unverified",
      ],
      ["Issue date", "2026-11-10", "Analyst correction · date valid"],
    ],
  },
  {
    name: "Identity document",
    file: "synthetic-passport.pdf",
    state: "Parsed",
    tone: "blue" as const,
    source: "Mock connector · v1",
    note: "Synthetic identity document from the mock bank. Authenticity is not verified.",
    fields: [
      ["Full name", "SYNTHETIC Person 001", "Extracted · unverified"],
      ["Document number", "DEMO-P0001", "Extracted · unverified"],
      ["Expiry date", "2036-09-28", "Extracted · date valid"],
    ],
  },
  {
    name: "Earlier proof of address",
    file: "proof-of-address-original.pdf",
    state: "Quarantined",
    tone: "red" as const,
    source: "Analyst upload · v1",
    note: "Historical upload retained for audit. Its file content is unavailable in this preview and must not be opened or released.",
    fields: [
      ["Processing status", "Quarantined", "Active content detected"],
      ["Extraction", "Not available", "Retained historical warning"],
    ],
  },
];
const transactions = [
  {
    id: "TX-1001",
    date: "2026-11-01",
    name: "Aster settlement",
    direction: "Credit",
    amount: 12500,
    currency: "AED",
    status: "Posted",
  },
  {
    id: "TX-1002",
    date: "2026-11-02",
    name: "Harbour supplier",
    direction: "Debit",
    amount: 8400,
    currency: "AED",
    status: "Posted",
  },
  {
    id: "TX-1003",
    date: "2026-11-03",
    name: "Aster settlement",
    direction: "Credit",
    amount: 17941.39,
    currency: "AED",
    status: "Posted",
  },
  {
    id: "TX-1004",
    date: "2026-11-04",
    name: "Cedar services",
    direction: "Debit",
    amount: 12000,
    currency: "AED",
    status: "Pending",
  },
];
const money = (n: number) =>
  n.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const reportSections = [
  "Summary",
  "KYC review",
  "Evidence gaps",
  "Version comparison",
];

export default function Workspace() {
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<View>("Dashboard");
  const [role, setRole] = useState<Role>("Analyst");
  const [reviewExample, setReviewExample] = useState<"evidence" | "warnings">("evidence");
  const [reviewPreviewDecision, setReviewPreviewDecision] = useState("");
  const [reviewPreviewRationale, setReviewPreviewRationale] = useState("");
  const [riskDrafts, setRiskDrafts] = useState({
    deposits: { rationale: "", disposition: "Further investigation" },
    turnover: { rationale: "", disposition: "Further investigation" },
  });
  const [relationship, setRelationship] = useState<"Aster settlement" | "Harbour supplier">("Aster settlement");
  const [relationshipTx, setRelationshipTx] = useState<string | null>(null);
  const [securityExample, setSecurityExample] = useState<"injection" | "access" | "tools">("injection");
  const [releaseExample, setReleaseExample] = useState<"evaluation" | "approval" | "rollback">("evaluation");
  const [provenanceExample, setProvenanceExample] = useState<"current" | "historical">("current");
  const [evidenceLanguage, setEvidenceLanguage] = useState<"English" | "Arabic">("English");
  const [evalScenario, setEvalScenario] = useState<"citations" | "isolation" | "missing">("citations");
  const [riskExample, setRiskExample] = useState<"deposits" | "turnover">("deposits");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selectedCase, setSelectedCase] = useState(cases[0]!);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [reportTab, setReportTab] = useState("Summary");
  const [decision, setDecision] = useState("");
  const [rationale, setRationale] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [txDirection, setTxDirection] = useState("All directions");
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [policy, setPolicy] = useState("KYC refresh");
  const [draftOwner, setDraftOwner] = useState("Maya Hassan");
  const [draftDue, setDraftDue] = useState("");
  useEffect(() => {
    if (mobileNav) sidebarRef.current?.querySelector<HTMLButtonElement>(".ws-nav-group button")?.focus();
  }, [mobileNav]);

  const open = (next: View) => {
    if (mobileNav) menuButtonRef.current?.focus();
    setView(next);
    setSearch("");
    setNotice("");
    setMobileNav(false);
  };
  const filteredCases = cases.filter(
    (c) =>
      `${c.id} ${c.customer} ${c.type} ${c.owner}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "All statuses" || c.status === status),
  );
  const filteredTx = transactions.filter(
    (t) =>
      `${t.id} ${t.name} ${t.date}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (txDirection === "All directions" || t.direction === txDirection),
  );
  const doc = documents[documentIndex]!;
  const caseTable = (
    <div className="ws-table-scroll" role="region" aria-label="Sample case list" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col">Case / customer</th>
            <th scope="col">Risk</th>
            <th scope="col">Status</th>
            <th scope="col">Assigned to</th>
            <th scope="col">Due</th>
            <th scope="col">
              <span className="ws-sr">Open case</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredCases.map((c) => (
            <tr key={c.id}>
              <td>
                <button
                  className="ws-text-button"
                  onClick={() => {
                    setSelectedCase(c);
                    open("Cases");
                  }}
                >
                  {c.id}
                </button>
                <span className="ws-cell-sub">{c.customer}</span>
              </td>
              <td>
                <Badge
                  tone={
                    c.risk === "High"
                      ? "red"
                      : c.risk === "Medium"
                        ? "amber"
                        : "green"
                  }
                >
                  {c.risk}
                </Badge>
              </td>
              <td>
                <Badge tone={c.status === "Rework" ? "red" : "blue"}>
                  {c.status}
                </Badge>
              </td>
              <td>{c.owner}</td>
              <td className={c.due === "Overdue" ? "ws-danger" : ""}>
                {c.due}
              </td>
              <td>
                <button
                  className="ws-icon-button"
                  aria-label={`Open ${c.id}`}
                  onClick={() => {
                    setSelectedCase(c);
                    open("Cases");
                  }}
                >
                  <Icon name="arrow" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredCases.length && (
        <p className="ws-empty">
          No sample cases match your search and status filter.
        </p>
      )}
    </div>
  );
  const metrics = (
    <div className="ws-metrics">
      {[
        [
          "Active cases",
          String(cases.length),
          "Within the sample portfolio",
          "Cases",
        ],
        ["Awaiting review", "1", "One draft needs a reviewer", "Approvals"],
        [
          "Evidence exceptions",
          "2",
          "One quarantine · one rework case",
          "Documents",
        ],
        [
          "Completed stages",
          "5 / 6",
          "Illustrative investigation run",
          "Agent monitor",
        ],
      ].map(([label, value, detail, target]) => (
        <button
          key={label}
          className="ws-metric"
          onClick={() => open(target as View)}
        >
          <span className="ws-metric-top">
            {label}
            <Icon name={target!} />
          </span>
          <strong>{value}</strong>
          <span>{detail}</span>
        </button>
      ))}
    </div>
  );
  const report = (
    <>
      <div className="ws-tabs" aria-label="Report sections">
        {reportSections.map((t) => (
          <button
            key={t}
            aria-pressed={reportTab === t}
            onClick={() => setReportTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="ws-report">
        <Badge tone="amber">Draft · not approved</Badge>
        {reportTab === "Summary" && (
          <>
            <h3>Review the evidence, then decide.</h3>
            <p>
              The sample case contains synthetic transaction and customer
              evidence. A corrected proof of address is available, while
              historical failed uploads remain in the evidence snapshot.
            </p>
            <div className="ws-callout">
              No conclusion about financial crime is made. An analyst and
              independent reviewer must assess the evidence.
            </div>
          </>
        )}
        {reportTab === "KYC review" && (
          <>
            <h3>Proof of address is present</h3>
            <p>
              Corrected issue date: <strong>2026-11-10</strong>. The name and
              address remain unverified analyst corrections.
            </p>
            <button
              className="ws-secondary"
              onClick={() => {
                setDocumentIndex(0);
                open("Documents");
              }}
            >
              Inspect supporting document <Icon name="arrow" />
            </button>
          </>
        )}
        {reportTab === "Evidence gaps" && (
          <>
            <h3>Exceptions need context</h3>
            <p>
              A historical upload is quarantined. A misclassified earlier upload
              has missing passport fields. These warnings are retained and must
              be evaluated separately from the selected identity document.
            </p>
            <button
              className="ws-secondary"
              onClick={() => {
                setDocumentIndex(2);
                open("Documents");
              }}
            >
              Inspect historical warning
            </button>
          </>
        )}
        {reportTab === "Version comparison" && (
          <>
            <h3>Version 2 → version 3</h3>
            <div className="ws-diff">
              <span>Previous: proof-of-address issue date missing.</span>
              <strong>
                Current: corrected issue date included in KYC review.
              </strong>
            </div>
            <p>
              Historical warnings remain visible. This is a sample comparison,
              not a live report diff.
            </p>
          </>
        )}
      </div>
    </>
  );
  const assistantReply = (text: string) => {
    setQuestion(text);
    if (text === "Summarize the posted transactions.") {
      setAnswer("The sample ledger contains three posted transactions and one pending transaction. Posted credits total AED 30,441.39 and posted debits total AED 8,400.00. The pending transaction is excluded. [Sample ledger: TX-1001–TX-1004]");
    } else if (text === "What changed in the proof of address?") {
      setAnswer("The sample selected proof of address has a corrected issue date of 2026-11-10. Its name and address remain unverified. An earlier quarantined upload is retained separately. [Sample document: proof-of-address-clean.pdf; historical upload]");
    } else {
      setAnswer("This preview cannot answer that question. Choose one of the two scripted examples; no AI model or case evidence is connected.");
    }
  };

  return (
    <div className="fa-workspace">
      <aside
        id="workspace-navigation"
        ref={sidebarRef}
        className={`ws-sidebar ${mobileNav ? "ws-sidebar-open" : ""}`}
        aria-label="Workspace navigation"
        onKeyDown={(event) => {
          if (event.key === "Escape" && mobileNav) {
            setMobileNav(false);
            menuButtonRef.current?.focus();
          }
        }}
      >
        <Link href="/workspace" className="ws-brand">
          <span className="ws-brand-mark">
            <Icon name="Security" />
          </span>
          <span>
            FinAgent<small>ENTERPRISE WORKSPACE</small>
          </span>
        </Link>
        <div className="ws-tenant">
          <span className="ws-avatar">SB</span>
          <div>
            <strong>Synthetic Bank</strong>
            <small>Interface design preview</small>
          </div>
          <Badge tone="slate">UI</Badge>
        </div>
        {navigation.map((group) => (
          <div className="ws-nav-group" key={group.title}>
            <p>{group.title}</p>
            {group.items.map((item) => (
              <button
                key={item}
                aria-current={view === item ? "page" : undefined}
                onClick={() => open(item)}
              >
                <Icon name={item} />
                <span>{item}</span>
                {item === "Approvals" && <small>1</small>}
              </button>
            ))}
          </div>
        ))}
        <div className="ws-sidebar-bottom">
          <span className="ws-status-dot" /> Local interface preview
          <p>Sample data · no production actions</p>
          <Link href="/">
            Open existing portal <Icon name="arrow" />
          </Link>
        </div>
      </aside>
      <div className="ws-main">
        <header className="ws-topbar">
          <button
            ref={menuButtonRef}
            className="ws-icon-button ws-menu"
            aria-label="Toggle navigation"
            aria-controls="workspace-navigation"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav(!mobileNav)}
          >
            <Icon name="menu" />
          </button>
          <span className="ws-breadcrumb">
            Workspace <span>/</span> <strong>{view}</strong>
          </span>
          <div className="ws-top-actions">
            <button
              className="ws-icon-button"
              aria-label="Sample notifications"
              aria-expanded={notifications}
              onClick={() => setNotifications(!notifications)}
            >
              <Icon name="bell" />
              <i className="ws-notification-dot" />
            </button>
            <span className="ws-avatar ws-avatar-blue">UI</span>
            <label className="ws-role">
              Preview role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option>Analyst</option>
                <option>Reviewer</option>
                <option>Supervisor</option>
              </select>
            </label>
          </div>
          {notifications && (
            <div className="ws-popover">
              <strong>Sample notifications</strong>
              <p>DEMO-001 is ready for independent review.</p>
              <p>DEMO-003 needs rework.</p>
              <button
                className="ws-text-button"
                onClick={() => {
                  open("Approvals");
                  setNotifications(false);
                }}
              >
                Open review workspace
              </button>
            </div>
          )}
        </header>
        <div className="ws-preview-banner">
          <Badge tone="amber">INTERFACE PREVIEW</Badge>
          <span>
            All records and metrics below are sample data. Role selection
            changes the preview only. No decisions, uploads, assignments, or AI
            calls are sent to the backend.
          </span>
        </div>
        <div className="ws-content">
          <div className="ws-page-heading">
            <div>
              <p className="ws-eyebrow">FINAGENT / {view.toUpperCase()}</p>
              <h1 aria-live="polite" aria-atomic="true">
                {view === "Dashboard"
                  ? `Your ${role.toLowerCase()} workspace`
                  : view}
              </h1>
              <p>
                {view === "Dashboard"
                  ? "Clear priorities. Connected evidence. Human decisions."
                  : "Explore the interface before backend integration and acceptance testing."}
              </p>
            </div>
            <span className="ws-environment">
              <span className="ws-status-dot" /> Synthetic environment
            </span>
          </div>
          {notice && (
            <div className="ws-notice" role="status">
              {notice}
              <button
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {view === "Dashboard" && (
            <>
              <div className="ws-hero">
                <div>
                  <Badge tone="blue">ADVANCED INVESTIGATION PREVIEW</Badge>
                  <h2>Explore the evidence.<br />Understand the risk.</h2>
                  <p>Review the planned investigation, AI, and governance tools using synthetic examples.</p>
                  <button className="ws-primary" onClick={() => open("Risk detection")}>Explore risk detection <Icon name="arrow" /></button>
                  <p><a href="/workspace/case-overview">Open connected case overview →</a></p>
                </div>
                <div className="ws-hero-visual"><div><span>Human oversight</span><strong>Review remains essential</strong><small>Investigate → Explain → Review</small></div></div>
              </div>
              <Card title={`${role} preview focus`} subtitle="Illustrative shortcuts · role selection does not change access">
                <div className="ws-prompt-list">
                  {role === "Analyst" ? (
                    <><button className="ws-secondary" onClick={() => open("Risk detection")}>Inspect sample risk indicators <Icon name="arrow" /></button><button className="ws-secondary" onClick={() => open("Evidence provenance")}>Review sample evidence history <Icon name="arrow" /></button></>
                  ) : role === "Reviewer" ? (
                    <><button className="ws-secondary" onClick={() => open("Review comparison")}>Compare sample report changes <Icon name="arrow" /></button><button className="ws-secondary" onClick={() => open("AI evaluation lab")}>Inspect evaluation preview <Icon name="arrow" /></button></>
                  ) : (
                    <><button className="ws-secondary" onClick={() => open("Supervisor")}>Inspect sample workload <Icon name="arrow" /></button><button className="ws-secondary" onClick={() => open("Agent monitor")}>Inspect sample agent trace <Icon name="arrow" /></button></>
                  )}
                </div>
                <p className="ws-fineprint">These are interface examples. Your actual account permissions are enforced by the existing portal.</p>
              </Card>
              <div className="ws-equal-columns">
                <Card title="Investigation tools" subtitle="Sample interfaces · not connected to case data">
                  <div className="ws-prompt-list">
                    <button className="ws-secondary" onClick={() => open("Risk detection")}>Explainable risk indicators <Icon name="arrow" /></button>
                    <button className="ws-secondary" onClick={() => open("Transactions")}>Transaction relationships <Icon name="arrow" /></button>
                    <button className="ws-secondary" onClick={() => open("Investigation assistant")}>Evidence-grounded assistant preview <Icon name="arrow" /></button>
                    <button className="ws-secondary" onClick={() => open("Bilingual evidence")}>Arabic–English evidence preview <Icon name="arrow" /></button>
                    <button className="ws-secondary" onClick={() => open("Evidence provenance")}>Document provenance preview <Icon name="arrow" /></button>
                  </div>
                </Card>
                <Card title="AI quality and oversight" subtitle="Proposed workflows · no tests or releases run here">
                  <div className="ws-prompt-list">
                    <button className="ws-secondary" onClick={() => open("AI evaluation lab")}>Evaluation scenarios <Icon name="arrow" /></button>
                    <button className="ws-secondary" onClick={() => open("AI security testing")}>Security test scenarios <Icon name="arrow" /></button>
                    <button className="ws-secondary" onClick={() => open("Release controls")}>Model and prompt release controls <Icon name="arrow" /></button>
                    <button className="ws-secondary" onClick={() => open("Agent monitor")}>Agent monitoring preview <Icon name="arrow" /></button>
                  </div>
                </Card>
              </div>
              <div className="ws-callout"><strong>Existing portal:</strong> Use the portal for its current case queue, approvals, and security workflows. This workspace uses examples and does not submit production actions.</div>
            </>
          )}
          {view === "Risk detection" && (
            <>
              <div className="ws-section-note">
                <Icon name="Risk detection" />
                <div><strong>Sample risk investigation</strong><p>Illustrative scenarios only. No case data is analyzed and no findings are saved.</p></div>
              </div>
              <div className="ws-equal-columns">
                <Card title="Example indicators" subtitle="Choose an example to inspect its explanation">
                  <div className="ws-tabs" aria-label="Sample risk indicators">
                    <button type="button" aria-pressed={riskExample === "deposits"} onClick={() => setRiskExample("deposits")}>Repeated deposits</button>
                    <button type="button" aria-pressed={riskExample === "turnover"} onClick={() => setRiskExample("turnover")}>Higher turnover</button>
                  </div>
                  <p>{riskExample === "deposits" ? "Sample: three cash deposits near a fictional threshold on separate days." : "Sample: posted credits exceed a fictional customer’s expected monthly turnover."}</p>
                  <p><strong>Status:</strong> Example for analyst review; not an actual alert.</p>
                </Card>
                <Card title="Why this example was highlighted" subtitle="Illustrative explanation and evidence">
                  {riskExample === "deposits" ? (
                    <div>
                      <p><strong>Example evidence:</strong> DEMO-TX-01, DEMO-TX-02 and DEMO-TX-03; three separate dates.</p>
                      <p><strong>Example rule:</strong> at least three cash deposits on three days in a fictional threshold band.</p>
                      <p><strong>Missing context:</strong> the reason for the deposits and the source of funds have not been established.</p>
                    </div>
                  ) : (
                    <div>
                      <p><strong>Example evidence:</strong> fictional posted credits and an example customer profile.</p>
                      <p><strong>Example rule:</strong> posted credits exceed 1.5 times expected turnover in the same currency.</p>
                      <p><strong>Missing context:</strong> the expected turnover may be outdated; the cause of the change is unknown.</p>
                    </div>
                  )}
                </Card>
              </div>
              <Card title="Analyst assessment draft" subtitle="Local interface example · cleared when the page refreshes">
                <label className="ws-form-label" htmlFor="risk-disposition">Proposed next step</label>
                <select id="risk-disposition" value={riskDrafts[riskExample].disposition} onChange={(e) => setRiskDrafts((drafts) => ({ ...drafts, [riskExample]: { ...drafts[riskExample], disposition: e.target.value } }))}>
                  <option>Further investigation</option><option>Request more evidence</option><option>Escalate for review</option><option>No further action proposed</option>
                </select>
                <label className="ws-form-label" htmlFor="risk-rationale">Draft rationale</label>
                <textarea id="risk-rationale" value={riskDrafts[riskExample].rationale} onChange={(e) => setRiskDrafts((drafts) => ({ ...drafts, [riskExample]: { ...drafts[riskExample], rationale: e.target.value } }))} placeholder="Enter a sample rationale; do not use real customer information." />
                <p className="ws-fineprint">Each sample indicator has its own draft. Drafts are not saved, submitted, or linked to a case; refreshing clears them.</p>
              </Card>
              <div className="ws-callout"><strong>Human assessment required.</strong> Examples are not findings, and indicators do not establish wrongdoing or make decisions. Evidence references above are illustrative and cannot be opened.</div>
              <Card title="Recorded case indicators and calculations" subtitle="Separate connected, read-only view">
                <p>View recognized AML indicator claims and calculations already recorded for a case your account can access. The case view uses the existing API; it does not run a new investigation.</p>
                <Link className="ws-link" href="/workspace/recorded-risk" prefetch={false}>Open connected case findings →</Link>
              </Card>
            </>
          )}
          {view === "Review comparison" && (
            <>
              <p><a href="/workspace/recorded-review">View recorded report changes →</a></p>
              <div className="ws-section-note"><Icon name="Review comparison" /><div><strong>Independent review design preview</strong><p>Synthetic example only. No report, verification status, or review decision is loaded.</p></div></div>
              <div className="ws-equal-columns">
                <Card title="Sample report changes" subtitle="Select an illustrative comparison">
                  <div className="ws-prompt-list" role="group" aria-label="Sample comparison sections">
                    <button type="button" className="ws-secondary" aria-pressed={reviewExample === "evidence"} onClick={() => setReviewExample("evidence")}>Evidence update</button>
                    <button type="button" className="ws-secondary" aria-pressed={reviewExample === "warnings"} onClick={() => setReviewExample("warnings")}>Historical warnings</button>
                  </div>
                </Card>
                <Card title="Illustrative changes" subtitle="Sample comparison · not a real report">
                  {reviewExample === "evidence" ? <div><p><strong>Earlier sample:</strong> An address document needed further review.</p><p><strong>Later sample:</strong> A replacement document and a sample correction are shown for analyst review.</p><p><strong>Still needed:</strong> Verify the actual document and report before drawing conclusions.</p></div> : <div><p><strong>Earlier sample:</strong> A previous upload was quarantined.</p><p><strong>Later sample:</strong> The historical warning remains visible for review.</p><p><strong>Still needed:</strong> Check the actual evidence history and authorization.</p></div>}
                </Card>
              </div>
              <div className="ws-equal-columns">
                <Card title="Review readiness" subtitle="No live status is available">
                  <p><strong>Report version:</strong> Not connected</p><p><strong>Evidence completeness:</strong> Not connected</p><p><strong>Outstanding warnings:</strong> Not connected</p><p><strong>Verification readiness:</strong> Not connected</p>
                </Card>
                <Card title="Decision and rationale draft" subtitle="Sample only · no decision is submitted">
                  <p><strong>Reviewer:</strong> Not assigned in this preview</p>
                  <label className="ws-form-label" htmlFor="review-preview-decision">Sample proposed decision</label>
                  <select id="review-preview-decision" value={reviewPreviewDecision} onChange={(e) => setReviewPreviewDecision(e.target.value)}>
                    <option value="">Select an example</option><option>Approve</option><option>Return for rework</option><option>Request information</option><option>Reject</option>
                  </select>
                  <label className="ws-form-label" htmlFor="review-preview-rationale">Sample rationale</label>
                  <textarea id="review-preview-rationale" value={reviewPreviewRationale} onChange={(e) => setReviewPreviewRationale(e.target.value)} placeholder="Enter sample text only; do not include real case information." />
                  <p className="ws-fineprint">This local draft is not saved or submitted and clears on refresh. Opening verification in a separate tab keeps this page open, but does not verify or authorize a decision here.</p>
                  <Link className="ws-link" href="/security" target="_blank" rel="noopener noreferrer">Open existing verification in a new tab →</Link>
                  <Link className="ws-link" href="/approvals">Open existing approvals →</Link>
                </Card>
              </div>
              <div className="ws-callout"><strong>Planned:</strong> authorized report comparison, evidence links, verification readiness, and preserved rationale. Existing access controls apply to portal links.</div>
            </>
          )}
          {view === "AI evaluation lab" && (
            <>
              <p><a href="/workspace/evaluation-comparison">Compare recorded evaluation runs →</a></p>
              <div className="ws-section-note"><Icon name="AI evaluation lab" /><div><strong>Evaluation design preview</strong><p>Sample scenarios only. No tests are run and no results are generated here.</p></div></div>
              <div className="ws-equal-columns">
                <Card title="Synthetic evaluation scenarios" subtitle="Choose a proposed check">
                  <div className="ws-prompt-list">
                    <button className="ws-secondary" type="button" aria-pressed={evalScenario === "citations"} onClick={() => setEvalScenario("citations")}>Evidence citations</button>
                    <button className="ws-secondary" type="button" aria-pressed={evalScenario === "isolation"} onClick={() => setEvalScenario("isolation")}>Access isolation</button>
                    <button className="ws-secondary" type="button" aria-pressed={evalScenario === "missing"} onClick={() => setEvalScenario("missing")}>Missing evidence</button>
                  </div>
                </Card>
                <Card title="Proposed evaluation" subtitle="Specification only · not executed">
                  {evalScenario === "citations" ? <div><h3>Evidence citations</h3><p>Check whether factual statements cite authorized supporting sources.</p><p><strong>Proposed measure:</strong> supported claims divided by evaluated claims.</p></div> : evalScenario === "isolation" ? <div><h3>Access isolation</h3><p>Check that users cannot retrieve evidence from another tenant or an unauthorized case.</p><p><strong>Proposed measure:</strong> unauthorized disclosures across test scenarios.</p></div> : <div><h3>Missing evidence</h3><p>Check whether the assistant identifies missing information instead of inventing a conclusion.</p><p><strong>Proposed measure:</strong> successful disclosures across labeled scenarios.</p></div>}
                  <p><strong>Result:</strong> Not run. No score is available.</p>
                </Card>
              </div>
              <Card title="Evaluation results" subtitle="Results layout preview · no evaluation has been run">
                <div className="ws-table-scroll" role="region" aria-label="Sample evaluation results" tabIndex={0}>
                  <table>
                    <thead><tr><th scope="col">Proposed check</th><th scope="col">Dataset</th><th scope="col">Result</th><th scope="col">Review</th></tr></thead>
                    <tbody>
                      <tr><td>Evidence citations</td><td>Not selected</td><td><Badge tone="slate">Not run</Badge></td><td>Not available</td></tr>
                      <tr><td>Access isolation</td><td>Not selected</td><td><Badge tone="slate">Not run</Badge></td><td>Not available</td></tr>
                      <tr><td>Missing evidence</td><td>Not selected</td><td><Badge tone="slate">Not run</Badge></td><td>Not available</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="ws-fineprint">No scores, model versions, datasets, or outcomes are available in this preview.</p>
              </Card>
              <div className="ws-equal-columns">
                <Card title="Version comparison" subtitle="Planned model and prompt review">
                  <p>Current version: <strong>Not connected</strong></p>
                  <p>Candidate version: <strong>Not selected</strong></p>
                  <p>Results and differences will appear after an authorized evaluation is implemented and run.</p>
                </Card>
                <Card title="Release readiness" subtitle="Human review required">
                  <p>Evaluation evidence: <strong>Not available</strong></p>
                  <p>Reviewer decision: <strong>Not available</strong></p>
                  <p>Preview only. No evaluation or approval action can be started from this screen.</p>
                </Card>
              </div>
              <div className="ws-callout"><strong>Planned:</strong> versioned test datasets, execution, result comparison, and release review. None are connected yet.</div>
            </>
          )}
          {view === "Bilingual evidence" && (
            <>
              <div className="ws-section-note"><Icon name="Bilingual evidence" /><div><strong>Bilingual evidence preview</strong><p>One predefined synthetic example. Search, OCR, translation, and case evidence are not connected.</p></div></div>
              <div className="ws-toolbar" role="group" aria-label="Example evidence language">
                <button type="button" className="ws-secondary" aria-pressed={evidenceLanguage === "English"} onClick={() => setEvidenceLanguage("English")}>English</button>
                <button type="button" className="ws-secondary" aria-pressed={evidenceLanguage === "Arabic"} onClick={() => setEvidenceLanguage("Arabic")}>العربية</button>
              </div>
              <div className="ws-equal-columns">
                <Card title="Sample evidence passage" subtitle="Synthetic example · source not connected">
                  {evidenceLanguage === "English" ? <p lang="en">The customer reported an expected monthly turnover of AED 50,000.</p> : <p lang="ar" dir="rtl">أفاد العميل بأن حجم التعاملات الشهري المتوقع هو ٥٠٬٠٠٠ درهم إماراتي.</p>}
                  <p><strong>Example source:</strong> synthetic customer profile · sample passage</p>
                  <p><strong>Source status:</strong> illustrative reference; no document can be opened from this example.</p>
                </Card>
                <Card title="Investigation context" subtitle="Illustrative bilingual review">
                  <p><strong>Field:</strong> Expected monthly turnover</p>
                  <p><strong>Sample value:</strong> AED 50,000 per month</p>
                  <p><strong>Review needed:</strong> Confirm the original document, date, and customer context before using this value.</p>
                  <p><strong>Language:</strong> {evidenceLanguage === "English" ? "English sample" : "Arabic sample"}</p>
                </Card>
              </div>
              <div className="ws-callout"><strong>Planned:</strong> authorized bilingual retrieval, source-page citations, OCR review, and language-specific evaluation. This switch only changes a fixed example; it does not translate or search.</div>
            </>
          )}
          {view === "Evidence provenance" && (
            <>
              <p><a href="/workspace/recorded-provenance">View recorded document provenance →</a></p>
              <div className="ws-section-note"><Icon name="Evidence provenance" /><div><strong>Synthetic document provenance</strong><p>Illustrative records only. No PDF, source coordinates, or case evidence are connected.</p></div></div>
              <div className="ws-equal-columns">
                <Card title="Sample document history" subtitle="Choose an example version">
                  <div className="ws-prompt-list">
                    <button type="button" className="ws-secondary" aria-pressed={provenanceExample === "current"} onClick={() => setProvenanceExample("current")}>Selected sample document · v2</button>
                    <button type="button" className="ws-secondary" aria-pressed={provenanceExample === "historical"} onClick={() => setProvenanceExample("historical")}>Earlier upload · v1</button>
                  </div>
                  <p>Selection and warnings shown here are examples; they do not describe an actual case.</p>
                </Card>
                <Card title={provenanceExample === "current" ? "Selected sample · v2" : "Historical sample · v1"} subtitle="Illustrative review context">
                  {provenanceExample === "current" ? <div><p><strong>Example selection reason:</strong> A readable document was available for review.</p><p><strong>Sample correction:</strong> Issue date updated by an analyst in this fictional scenario.</p><p><strong>Current gap:</strong> Name and address remain unverified in this example.</p></div> : <div><p><strong>Historical state:</strong> Earlier upload quarantined in this fictional scenario.</p><p><strong>Source content:</strong> Not available in this preview.</p><p><strong>Review note:</strong> Preserve historical warnings separately from current gaps.</p></div>}
                </Card>
              </div>
              <div className="ws-equal-columns">
                <Card title="Source document" subtitle="Illustration only · authorized PDF viewer not connected">
                  {provenanceExample === "current" ? (
                    <div className="ws-paper" aria-label="Illustration of a synthetic sample document">
                      <div className="ws-watermark">SYNTHETIC · SAMPLE</div>
                      <p className="ws-eyebrow">ILLUSTRATIVE DOCUMENT · NOT A PDF</p>
                      <h3>Proof of address</h3>
                      <p>This illustration demonstrates the planned document and field comparison layout. It is not a source file.</p>
                      <div className="ws-paper-field"><small>Name</small><mark>SYNTHETIC CUSTOMER</mark></div>
                      <div className="ws-paper-field"><small>Address</small><mark>Sample address · not verified</mark></div>
                      <div className="ws-paper-field"><small>Issue date</small><mark>Sample correction · review required</mark></div>
                      <p className="ws-paper-footer">Example page · highlighting and source coordinates are not connected</p>
                    </div>
                  ) : (
                    <div className="ws-callout ws-callout-red"><strong>Historical sample quarantined.</strong><p>No file content is displayed. The authorized review process will remain separate.</p></div>
                  )}
                  <p className="ws-fineprint">No PDF or case document is opened in this preview.</p>
                </Card>
                <Card title="Field comparison" subtitle="Illustrative field history · synthetic example">
                  {provenanceExample === "current" ? (
                    <div className="ws-table-scroll" role="region" aria-label="Sample document field comparison" tabIndex={0}><table><thead><tr><th scope="col">Field</th><th scope="col">Example value</th><th scope="col">Review status</th></tr></thead><tbody>
                      <tr><td>Issue date</td><td>Analyst-corrected example</td><td><Badge tone="amber">Review required</Badge></td></tr>
                      <tr><td>Name</td><td>Not shown</td><td><Badge tone="slate">Unverified</Badge></td></tr>
                      <tr><td>Address</td><td>Not shown</td><td><Badge tone="slate">Unverified</Badge></td></tr>
                    </tbody></table></div>
                  ) : <p>This historical sample was quarantined. Extracted fields and file content are unavailable in this preview.</p>}
                  <p className="ws-fineprint">Source coordinates, actual corrections, timestamps, and reviewer identity are not connected.</p>
                </Card>
              </div>
              <div className="ws-callout"><strong>Planned:</strong> authorized PDF display, source highlighting, actual selection reasons, correction history, and audit records. Nothing is opened or changed here.</div>
            </>
          )}
          {view === "AI security testing" && (
            <>
              <div className="ws-section-note"><Icon name="AI security testing" /><div><strong>Security testing design preview</strong><p>Selectable scenarios are illustrative. No tests run and no case data is accessed.</p></div></div>
              <div className="ws-equal-columns">
                <Card title="Example security scenarios" subtitle="Select a proposed test">
                  <div className="ws-prompt-list">
                    <button className="ws-secondary" type="button" aria-pressed={securityExample === "injection"} onClick={() => setSecurityExample("injection")}>Document prompt injection</button>
                    <button className="ws-secondary" type="button" aria-pressed={securityExample === "access"} onClick={() => setSecurityExample("access")}>Unauthorized case access</button>
                    <button className="ws-secondary" type="button" aria-pressed={securityExample === "tools"} onClick={() => setSecurityExample("tools")}>Unsafe tool request</button>
                  </div>
                </Card>
                <Card title="Proposed test" subtitle="Not executed · no result available">
                  {securityExample === "injection" ? <p>Present a synthetic document containing instructions that conflict with the assistant’s task. Check that document text is treated as evidence, not an instruction.</p> : securityExample === "access" ? <p>Attempt to retrieve a synthetic case outside the user’s authorized tenant or case scope. Check that the request is denied.</p> : <p>Request a tool action outside the agent’s permissions. Check that policy enforcement blocks the request and records the outcome.</p>}
                  <p><strong>Execution status:</strong> Not run.</p>
                </Card>
              </div>
              <Card title="Security scenario results" subtitle="Results layout preview · no scenarios have run">
                <div className="ws-table-scroll" role="region" aria-label="Sample security scenario results" tabIndex={0}><table><thead><tr><th scope="col">Scenario</th><th scope="col">Scope</th><th scope="col">Result</th><th scope="col">Evidence</th></tr></thead><tbody>
                  <tr><td>Document prompt injection</td><td>Synthetic document</td><td><Badge tone="slate">Not run</Badge></td><td>Not available</td></tr>
                  <tr><td>Unauthorized case access</td><td>Synthetic case and tenant</td><td><Badge tone="slate">Not run</Badge></td><td>Not available</td></tr>
                  <tr><td>Unsafe tool request</td><td>Simulated tool permission</td><td><Badge tone="slate">Not run</Badge></td><td>Not available</td></tr>
                </tbody></table></div>
                <p className="ws-fineprint">No pass or fail result is claimed. Tests and evidence collection are not connected.</p>
              </Card>
              <div className="ws-equal-columns">
                <Card title="Review and follow-up" subtitle="Planned security workflow">
                  <p><strong>Findings:</strong> Not available</p><p><strong>Owner:</strong> Not assigned</p><p><strong>Remediation status:</strong> Not available</p>
                </Card>
                <Card title="Release evidence" subtitle="Planned connection to release controls">
                  <p><strong>Candidate version:</strong> Not selected</p><p><strong>Required checks:</strong> Not configured</p><p><strong>Review decision:</strong> Not available</p>
                </Card>
              </div>
              <div className="ws-callout"><strong>Planned:</strong> automated execution, permission checks, evidence capture, and results. This interface does not provide security assurance.</div>
            </>
          )}
          {view === "Release controls" && (
            <>
              <div className="ws-section-note"><Icon name="Release controls" /><div><strong>Release controls design preview</strong><p>Example stages only. No model or prompt is compared, approved, or deployed.</p></div></div>
              <div className="ws-equal-columns">
                <Card title="Proposed release stages" subtitle="Select a stage to inspect its planned controls">
                  <div className="ws-prompt-list">
                    <button className="ws-secondary" type="button" aria-pressed={releaseExample === "evaluation"} onClick={() => setReleaseExample("evaluation")}>Evaluate candidate</button>
                    <button className="ws-secondary" type="button" aria-pressed={releaseExample === "approval"} onClick={() => setReleaseExample("approval")}>Independent approval</button>
                    <button className="ws-secondary" type="button" aria-pressed={releaseExample === "rollback"} onClick={() => setReleaseExample("rollback")}>Release and rollback</button>
                  </div>
                </Card>
                <Card title="Stage details" subtitle="Planned workflow · not connected">
                  {releaseExample === "evaluation" ? <p>Compare the candidate with the current version on a versioned synthetic dataset. Review actual citation, security, latency, and cost results when available.</p> : releaseExample === "approval" ? <p>Present evaluation evidence and known failures to an authorized independent reviewer. Record a decision and rationale.</p> : <p>Use a controlled release process, monitor outcomes, and retain the previous configuration for a documented rollback.</p>}
                  <p><strong>Status:</strong> No candidate or release is selected.</p>
                </Card>
              </div>
              <Card title="Release comparison" subtitle="Interface preview · no versions selected">
                <div className="ws-table-scroll" role="region" aria-label="Sample release comparison" tabIndex={0}><table><thead><tr><th scope="col">Review item</th><th scope="col">Current version</th><th scope="col">Candidate version</th></tr></thead><tbody>
                  <tr><td>Model and provider</td><td>Not connected</td><td>Not selected</td></tr>
                  <tr><td>Prompt version</td><td>Not connected</td><td>Not selected</td></tr>
                  <tr><td>Evaluation dataset</td><td>Not available</td><td>Not selected</td></tr>
                  <tr><td>Evaluation results</td><td>Not available</td><td>Not run</td></tr>
                  <tr><td>Security checks</td><td>Not available</td><td>Not run</td></tr>
                </tbody></table></div>
                <p className="ws-fineprint">Values will only appear after version and evaluation services are connected.</p>
              </Card>
              <div className="ws-equal-columns">
                <Card title="Independent review" subtitle="Proposed approval record">
                  <p><strong>Reviewer:</strong> Not assigned</p><p><strong>Decision:</strong> Not available</p><p><strong>Rationale:</strong> No review has been recorded.</p>
                </Card>
                <Card title="Deployment and recovery" subtitle="Proposed operational controls">
                  <p><strong>Release status:</strong> No release selected</p><p><strong>Previous version:</strong> Not available</p><p><strong>Rollback:</strong> Not connected</p>
                </Card>
              </div>
              <div className="ws-callout"><strong>Planned:</strong> version comparison, approval, deployment, and rollback. No release actions are available in this preview.</div>
            </>
          )}
          {view === "Cases" && (
            <>
              <div className="ws-toolbar">
                <label className="ws-search">
                  <Icon name="search" />
                  <input
                    aria-label="Search sample cases"
                    placeholder="Search case, customer, analyst…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter case status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {[
                    "All statuses",
                    "Awaiting review",
                    "Investigating",
                    "Rework",
                    "Assigned",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <Card
                title="Case queue"
                subtitle={`${filteredCases.length} sample cases`}
              >
                {caseTable}
              </Card>
              <div className="ws-case-header">
                <div>
                  <p className="ws-eyebrow">SELECTED SAMPLE CASE</p>
                  <h2>
                    {selectedCase.id}{" "}
                    <Badge tone="amber">{selectedCase.status}</Badge>
                  </h2>
                  <p>
                    {selectedCase.customer} · {selectedCase.type}
                  </p>
                </div>
                <div>
                  <Badge tone={selectedCase.risk === "High" ? "red" : "blue"}>
                    {selectedCase.risk} priority
                  </Badge>
                  <p>Owner: {selectedCase.owner}</p>
                </div>
              </div>
              <div
                className="ws-progress"
                aria-label={`${selectedCase.progress}% illustrative progress`}
              >
                <span style={{ width: `${selectedCase.progress}%` }} />
              </div>
              <div className="ws-stage-list">
                {[
                  "Intake",
                  "Evidence",
                  "Analysis",
                  "Report",
                  "Review",
                  "Complete",
                ].map((x, i) => (
                  <span
                    key={x}
                    className={
                      i < Math.floor((selectedCase.progress / 100) * 6)
                        ? "ws-stage-done"
                        : ""
                    }
                  >
                    {i + 1}. {x}
                  </span>
                ))}
              </div>
              <div className="ws-columns">
                <Card
                  title="Investigation brief"
                  subtitle="Case context and reviewer handoff"
                >
                  {report}
                </Card>
                <Card
                  title="Evidence & next action"
                  subtitle="Keep supporting records alongside the report"
                >
                  <div className="ws-action-list">
                    {documents.map((d, i) => (
                      <button
                        key={d.file}
                        onClick={() => {
                          setDocumentIndex(i);
                          open("Documents");
                        }}
                      >
                        <Icon name="Documents" />
                        <span>
                          <strong>{d.name}</strong>
                          <small>
                            {d.state} · {d.source}
                          </small>
                        </span>
                        <Icon name="arrow" />
                      </button>
                    ))}
                  </div>
                  <div className="ws-callout">
                    Next action:{" "}
                    {selectedCase.status === "Awaiting review"
                      ? "inspect the draft and evidence before preparing a review."
                      : "inspect case evidence and address outstanding exceptions."}
                  </div>
                  <button
                    className="ws-primary"
                    onClick={() => open("Investigation assistant")}
                  >
                    Explore case assistant <Icon name="arrow" />
                  </button>
                </Card>
              </div>
            </>
          )}
          {view === "Documents" && (
            <>
              <div className="ws-section-note">
                <Icon name="Documents" />
                <span>
                  Document comparison · DEMO-001 · sample evidence snapshot v3
                </span>
                <Badge tone="slate">3 records</Badge>
              </div>
              <div className="ws-doc-selector">
                {documents.map((d, i) => (
                  <button
                    key={d.file}
                    aria-pressed={documentIndex === i}
                    onClick={() => setDocumentIndex(i)}
                  >
                    <Icon name="Documents" />
                    <strong>{d.name}</strong>
                    <Badge tone={d.tone}>{d.state}</Badge>
                  </button>
                ))}
              </div>
              <div className="ws-equal-columns">
                <Card title="Document reading pane" subtitle={doc.file}>
                  <div className="ws-paper">
                    <div className="ws-watermark">SYNTHETIC · SAMPLE</div>
                    <p className="ws-eyebrow">ILLUSTRATIVE DOCUMENT CONTENT</p>
                    <h3>{doc.name}</h3>
                    {doc.state !== "Quarantined" ? (
                      <>
                        <p>
                          This reading pane is an HTML illustration. It is not
                          the original PDF or a verified document.
                        </p>
                        {doc.fields.map(([name, value]) => (
                          <div className="ws-paper-field" key={name}>
                            <small>{name}</small>
                            <mark>{value}</mark>
                          </div>
                        ))}
                        <p className="ws-paper-footer">
                          Page 1 · document preview integration pending
                        </p>
                      </>
                    ) : (
                      <div className="ws-callout ws-callout-red">
                        <Icon name="Security" />
                        <p>
                          Quarantined content is not rendered. Retain the record
                          and use the existing authorized review process.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
                <Card
                  title="Extracted fields & provenance"
                  subtitle={doc.source}
                  action={<Badge tone={doc.tone}>{doc.state}</Badge>}
                >
                  <p className="ws-body-copy">{doc.note}</p>
                  {doc.fields.map(([name, value, source]) => (
                    <div className="ws-field-card" key={name}>
                      <small>{name}</small>
                      <strong>{value}</strong>
                      <span>{source}</span>
                      <span className="ws-field-source">
                        Source: sample document · page 1
                      </span>
                    </div>
                  ))}
                  <div className="ws-callout">
                    Corrections preserve original values. Extraction and analyst
                    correction do not establish document authenticity.
                  </div>
                  <Link className="ws-link" href="/cases">
                    Open existing portal case queue →
                  </Link>
                </Card>
              </div>
            </>
          )}
          {view === "Approvals" && (
            <>
              <div className="ws-section-note">
                <Icon name="Approvals" />
                <span>Independent review · DEMO-001 · report v3</span>
                <Badge tone="amber">Sample pending request</Badge>
              </div>
              <div className="ws-columns">
                <Card
                  title="Frozen report preview"
                  subtitle="Compare the report with its supporting evidence"
                >
                  {report}
                </Card>
                <Card
                  title="Prepare a review"
                  subtitle="A local UI draft only; no decision will be recorded"
                >
                  <div className="ws-callout">
                    <strong>MFA readiness</strong>
                    <p>
                      Verification status is not connected in this preview. Use
                      the existing security page for real verification.
                    </p>
                    <Link href="/security">Open security verification →</Link>
                  </div>
                  <fieldset className="ws-decision">
                    <legend>Decision draft</legend>
                    {[
                      "Approve",
                      "Return for rework",
                      "Request information",
                      "Reject",
                    ].map((x) => (
                      <label key={x}>
                        <input
                          type="radio"
                          name="decision"
                          value={x}
                          checked={decision === x}
                          onChange={() => setDecision(x)}
                        />
                        {x}
                      </label>
                    ))}
                  </fieldset>
                  <label className="ws-form-label" htmlFor="review-rationale">
                    Rationale
                  </label>
                  <textarea
                    id="review-rationale"
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Explain your assessment and reference the supporting evidence…"
                  />
                  <p className="ws-fineprint">
                    This draft stays in this mounted preview while you switch
                    screens. Refreshing clears it. Opening security in another
                    tab preserves this page.
                  </p>
                  <button
                    className="ws-primary"
                    disabled={!decision || !rationale.trim()}
                    onClick={() =>
                      setNotice(
                        `Preview draft prepared: ${decision}. No approval was submitted or recorded.`,
                      )
                    }
                  >
                    Prepare decision draft <Icon name="arrow" />
                  </button>
                  <Link
                    className="ws-link"
                    href="/approvals"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open real approval center in a new tab →
                  </Link>
                </Card>
              </div>
            </>
          )}
          {view === "Transactions" && (
            <>
              <p><a href="/workspace/recorded-transactions">View recorded case transactions →</a></p>
              <div className="ws-toolbar">
                <label className="ws-search">
                  <Icon name="search" />
                  <input
                    aria-label="Search sample transactions"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search transaction, counterparty, date…"
                  />
                </label>
                <select
                  aria-label="Filter transaction direction"
                  value={txDirection}
                  onChange={(e) => setTxDirection(e.target.value)}
                >
                  {["All directions", "Credit", "Debit"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="ws-metrics">
                {["Credit", "Debit"].map((d) => (
                  <div className="ws-metric" key={d}>
                    <span>Filtered posted {d.toLowerCase()}s · AED</span>
                    <strong>
                      {money(
                        filteredTx
                          .filter(
                            (t) => t.direction === d && t.status === "Posted",
                          )
                          .reduce((sum, t) => sum + t.amount, 0),
                      )}
                    </strong>
                    <span>Sample rows only · pending excluded</span>
                  </div>
                ))}
              </div>
              <Card
                title="Transaction ledger"
                subtitle="Select a row to inspect its source"
              >
                <div className="ws-table-scroll" role="region" aria-label="Sample transaction ledger" tabIndex={0}>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Transaction</th>
                        <th scope="col">Date (UTC)</th>
                        <th scope="col">Counterparty</th>
                        <th scope="col">Direction</th>
                        <th scope="col">Amount</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <button
                              className="ws-text-button"
                              onClick={() => setSelectedTx(t.id)}
                            >
                              {t.id}
                            </button>
                          </td>
                          <td>{t.date}</td>
                          <td>{t.name}</td>
                          <td>{t.direction}</td>
                          <td>AED {money(t.amount)}</td>
                          <td>
                            <Badge
                              tone={t.status === "Posted" ? "green" : "amber"}
                            >
                              {t.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredTx.length && (
                    <p className="ws-empty">
                      No sample transactions match these filters.
                    </p>
                  )}
                </div>
              </Card>
              <Card title="Transaction amount distribution" subtitle="Filtered sample transactions · posted items only · AED">
                {filteredTx.some((t) => t.status === "Posted") ? (
                  <div className="ws-prompt-list">
                    {filteredTx.filter((t) => t.status === "Posted").map((t) => (
                      <div className="ws-field-card" key={t.id}>
                        <strong>{t.id} · {t.direction} · AED {money(t.amount)}</strong>
                        <meter
                          aria-label={`Sample transaction ${t.id}: AED ${money(t.amount)}`}
                          min={0}
                          max={Math.max(1, ...filteredTx.filter((item) => item.status === "Posted").map((item) => item.amount))}
                          value={t.amount}
                          style={{ width: "100%" }}
                        />
                        <span>{t.date} · {t.name} · Posted</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="ws-empty">No posted sample transactions match the current filters.</p>}
                <p className="ws-fineprint">Bars compare only the currently filtered sample transactions. This view does not analyze case data or determine risk.</p>
              </Card>
              <Card title="Transaction timeline" subtitle="Filtered sample activity · dates in UTC">
                {filteredTx.length ? (
                  <ol className="ws-timeline">
                    {[...filteredTx].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).map((t) => (
                      <li key={t.id}>
                        <span className="ws-timeline-node"><Icon name="clock" /></span>
                        <div><strong>{t.date} · {t.id}</strong><p>{t.name} · {t.direction} · {t.currency} {money(t.amount)}</p></div>
                        <Badge tone={t.status === "Posted" ? "green" : "amber"}>{t.status}</Badge>
                      </li>
                    ))}
                  </ol>
                ) : <p className="ws-empty">No sample transactions match the current filters.</p>}
                <p className="ws-fineprint">This timeline displays synthetic examples, including pending items. It does not establish risk or access case data.</p>
              </Card>
              {selectedTx && (
                <Card
                  title={`Evidence detail · ${selectedTx}`}
                  subtitle="Illustrative source lineage"
                >
                  <p className="ws-body-copy">
                    Source: mock bank → transaction record → sample evidence
                    snapshot v3. Transaction links and graph expansion will be
                    connected during backend integration.
                  </p>
                  <button
                    className="ws-secondary"
                    onClick={() => setSelectedTx(null)}
                  >
                    Close detail
                  </button>
                </Card>
              )}
              <Card
                title="Counterparty relationships"
                subtitle="Illustrative relationships from the sample ledger"
              >
                <div className="ws-relationships" role="group" aria-label="Sample counterparties">
                  <button type="button" className="ws-secondary" aria-pressed={relationship === "Aster settlement"} onClick={() => { setRelationship("Aster settlement"); setRelationshipTx(null); }}>Aster settlement</button>
                  <Icon name="arrow" />
                  <strong>Sample account</strong>
                  <Icon name="arrow" />
                  <button type="button" className="ws-secondary" aria-pressed={relationship === "Harbour supplier"} onClick={() => { setRelationship("Harbour supplier"); setRelationshipTx(null); }}>Harbour supplier</button>
                </div>
                <div className="ws-callout">
                  <strong>Selected sample counterparty: {relationship}</strong>
                  <p>Select a related sample transaction to inspect its details:</p>
                  <div className="ws-prompt-list" role="group" aria-label="Related sample transactions">
                    {transactions.filter((t) => t.name === relationship).map((t) => (
                      <button key={t.id} type="button" className="ws-secondary" aria-pressed={relationshipTx === t.id} onClick={() => setRelationshipTx(t.id)}>
                        {t.id} · {t.date} · {t.direction} · {t.currency} {money(t.amount)}
                      </button>
                    ))}
                  </div>
                  {transactions.filter((t) => t.name === relationship && t.id === relationshipTx).map((t) => (
                    <div key={t.id} aria-live="polite">
                      <p><strong>Sample transaction:</strong> {t.id} · {t.status}</p>
                      <p><strong>Illustrative source:</strong> sample ledger. No case evidence is connected.</p>
                    </div>
                  ))}
                  <p>These are illustrative links, not a finding of suspicious activity. The relationship view does not access case data.</p>
                </div>
              </Card>
            </>
          )}
          {view === "Investigation assistant" && (
            <div className="ws-columns">
              <Card
                title="Ask about the evidence"
                subtitle="Scripted UI demonstration · no model connected"
              >
                <p><a href="/workspace/evidence-briefing">Open connected evidence briefing →</a></p>
                <div className="ws-assistant-welcome">
                  <span className="ws-assistant-icon">
                    <Icon name="Investigation assistant" />
                  </span>
                  <h3>
                    Start with a question.
                    <br />
                    Follow the evidence.
                  </h3>
                  <p>
                    Explore two sample answers and their sources. The assistant
                    cannot approve cases or take business actions.
                  </p>
                </div>
                <div className="ws-prompt-list">
                  {[
                    "What changed in the proof of address?",
                    "Summarize the posted transactions.",
                  ].map((q) => (
                    <button
                      className="ws-secondary"
                      key={q}
                      onClick={() => assistantReply(q)}
                    >
                      {q}
                      <Icon name="arrow" />
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (question.trim()) assistantReply(question);
                  }}
                >
                  <label className="ws-form-label" htmlFor="assistant-question">
                    Question
                  </label>
                  <textarea
                    id="assistant-question"
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      setAnswer("");
                    }}
                    placeholder="Ask about sample documents or transactions…"
                  />
                  <button className="ws-primary" disabled={!question.trim()}>
                    Show scripted sample answer
                  </button>
                </form>
                {answer && (
                  <div className="ws-answer">
                    <Badge tone="slate">Scripted answer · not live AI</Badge>
                    <p>{answer}</p>
                    {(question === "Summarize the posted transactions." || question === "What changed in the proof of address?") && (
                      <>
                        <p><strong>Limitations:</strong> This is a scripted example using synthetic data. The source link opens a preview, not verified case evidence.</p>
                        <button className="ws-text-button" onClick={() => open(question === "Summarize the posted transactions." ? "Transactions" : "Documents")}>
                          Open sample source <Icon name="arrow" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </Card>
              <Card
                title="Evidence boundaries"
                subtitle="A helpful assistant should explain its limits"
              >
                <div className="ws-control-list">
                  <p>
                    <Icon name="Documents" /> Cite supporting evidence for
                    factual answers
                  </p>
                  <p>
                    <Icon name="Security" /> Respect the signed-in user’s access
                  </p>
                  <p>
                    <Icon name="check" /> Separate facts from interpretations
                  </p>
                  <p>
                    <Icon name="clock" /> Disclose stale or missing evidence
                  </p>
                </div>
                <div className="ws-callout">
                  Planned integration: evidence retrieval, authorized citations,
                  model gateway, and answer validation.
                </div>
              </Card>
            </div>
          )}
          {view === "Agent monitor" && (
            <>
              <p><a href="/workspace/recorded-monitor">View recorded investigation runs →</a></p>
              <div className="ws-section-note">
                <Icon name="Agent monitor" />
                <span>Illustrative execution trace · DEMO-001</span>
                <Badge tone="amber">Waiting for human review</Badge>
              </div>
              <div className="ws-metrics">
                {[
                  ["Completed steps", "5 / 6"],
                  ["Elapsed duration", "2.4 s"],
                  ["Retries", "0"],
                  ["Token usage / cost", "Not connected"],
                ].map(([l, v]) => (
                  <div className="ws-metric" key={l}>
                    <span>{l}</span>
                    <strong>{v}</strong>
                    <span>Sample trace</span>
                  </div>
                ))}
              </div>
              <Card
                title="Execution timeline"
                subtitle="Understand how a draft reaches the reviewer"
              >
                <ol className="ws-timeline">
                  {[
                    [
                      "Gather evidence",
                      "Mock customer profile, documents, and transactions",
                      "0.6 s",
                    ],
                    [
                      "Process documents",
                      "Scan, parse, and retain source provenance",
                      "0.8 s",
                    ],
                    [
                      "Analyze KYC / AML",
                      "Produce evidence-grounded draft findings",
                      "0.4 s",
                    ],
                    [
                      "Check policies",
                      "Attach applicable policy references",
                      "0.3 s",
                    ],
                    [
                      "Draft report",
                      "Keep gaps and limitations explicit",
                      "0.3 s",
                    ],
                    [
                      "Independent review",
                      "A human decision is required",
                      "Waiting",
                    ],
                  ].map(([title, detail, duration], i) => (
                    <li key={title}>
                      <span
                        className={`ws-timeline-node ${i === 5 ? "ws-node-wait" : ""}`}
                      >
                        {i === 5 ? (
                          <Icon name="clock" />
                        ) : (
                          <Icon name="check" />
                        )}
                      </span>
                      <div>
                        <strong>{title}</strong>
                        <p>{detail}</p>
                      </div>
                      <Badge tone={i === 5 ? "amber" : "green"}>
                        {duration}
                      </Badge>
                    </li>
                  ))}
                </ol>
              </Card>
              <div className="ws-equal-columns">
                <Card title="Model and execution context" subtitle="Planned trace metadata · not connected">
                  <p><strong>Run identifier:</strong> Not connected</p>
                  <p><strong>Model and provider:</strong> Not available</p>
                  <p><strong>Prompt and policy version:</strong> Not available</p>
                  <p><strong>Correlation identifier:</strong> Not available</p>
                </Card>
                <Card title="Usage and cost" subtitle="Planned operational telemetry">
                  <p><strong>Input and output tokens:</strong> Not available</p>
                  <p><strong>Estimated cost:</strong> Not available</p>
                  <p><strong>Provider response and errors:</strong> Not connected</p>
                  <p>Actual values will only appear when trace and usage data are available and authorized.</p>
                </Card>
              </div>
              <div className="ws-callout"><strong>Sample timeline only.</strong> These timings and stages are illustrative. No live execution, retry, or recovery controls are connected.</div>
              <Link className="ws-link" href="/operations">
                Open existing operations tools →
              </Link>
            </>
          )}
          {view === "Policies & evaluations" && (
            <>
              <div className="ws-tabs">
                {["KYC refresh", "AML structuring"].map((p) => (
                  <button
                    key={p}
                    aria-pressed={policy === p}
                    onClick={() => setPolicy(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="ws-equal-columns">
                <Card
                  title={policy}
                  subtitle="Sample policy version comparison"
                >
                  <div className="ws-field-card">
                    <small>Policy version</small>
                    <strong>{policy === "KYC refresh" ? "1.3" : "2.0"}</strong>
                    <span>Sample reference · not a policy publication</span>
                  </div>
                  <h3>
                    {policy === "KYC refresh"
                      ? "Proof-of-address recency"
                      : "Transaction pattern indicators"}
                  </h3>
                  <p className="ws-body-copy">
                    {policy === "KYC refresh"
                      ? "The sample policy requires proof of address dated within 90 days of review. Validate its applicability and effective date in the real policy workspace."
                      : "Repeated deposits below a threshold may require analyst review. An indicator does not establish a determination."}
                  </p>
                  <Link className="ws-link" href="/policies">
                    Open existing policy search →
                  </Link>
                </Card>
                <Card
                  title="Evaluation readiness"
                  subtitle="Design the checks before promoting changes"
                >
                  <div className="ws-control-list">
                    <p>
                      <Icon name="check" /> Corrected readable document
                      selection
                    </p>
                    <p>
                      <Icon name="check" /> Quarantined content stays isolated
                    </p>
                    <p>
                      <Icon name="check" /> Future-dated evidence remains
                      flagged
                    </p>
                    <p>
                      <Icon name="check" /> Cross-customer evidence stays
                      excluded
                    </p>
                  </div>
                  <Badge tone="amber">
                    Scenario checklist · no evaluation run
                  </Badge>
                  <p className="ws-fineprint">
                    Results and promotion controls will be connected in the
                    testing phase.
                  </p>
                  <Link className="ws-link" href="/evaluations">
                    Open existing evaluations →
                  </Link>
                </Card>
              </div>
              <Card title="Policy version comparison" subtitle="Planned review layout · no policy versions loaded">
                <div className="ws-table-scroll" role="region" aria-label="Sample policy version comparison" tabIndex={0}><table><thead><tr><th scope="col">Review item</th><th scope="col">Current version</th><th scope="col">Proposed version</th></tr></thead><tbody>
                  <tr><td>Policy version</td><td>Not connected</td><td>Not selected</td></tr>
                  <tr><td>Effective date</td><td>Not available</td><td>Not available</td></tr>
                  <tr><td>Relevant requirements</td><td>Not available</td><td>Not available</td></tr>
                  <tr><td>Changed text</td><td>Not available</td><td>Not available</td></tr>
                  <tr><td>Regression results</td><td>Not available</td><td>Not run</td></tr>
                </tbody></table></div>
                <p className="ws-fineprint">Actual versions, applicability, differences, and evaluation results require authorized integration.</p>
              </Card>
              <div className="ws-callout"><strong>Preview only:</strong> The selected policy example is illustrative and does not establish a current policy requirement or publish any change.</div>
            </>
          )}
          {view === "Supervisor" && (
            <>
              {metrics}
              <div className="ws-columns">
                <Card
                  title="Team workload"
                  subtitle="Illustrative assignments across four sample cases"
                >
                  <div className="ws-workload">
                    {["Maya Hassan", "Omar Ali", "Lina Ahmed"].map((name) => {
                      const count = cases.filter(
                        (c) => c.owner === name,
                      ).length;
                      return (
                        <div key={name}>
                          <span>{name}</span>
                          <div>
                            <i style={{ width: `${(count / 2) * 100}%` }} />
                          </div>
                          <strong>{count} cases</strong>
                        </div>
                      );
                    })}
                  </div>
                  <div className="ws-callout ws-callout-red">
                    DEMO-003 is overdue in this sample portfolio. Review
                    ownership and the outstanding evidence questions.
                  </div>
                </Card>
                <Card
                  title="Assignment draft"
                  subtitle="Explore assignment controls without changing ownership"
                >
                  <label className="ws-form-label" htmlFor="draft-owner">
                    Sample case DEMO-003 · proposed analyst
                  </label>
                  <select
                    id="draft-owner"
                    value={draftOwner}
                    onChange={(e) => setDraftOwner(e.target.value)}
                  >
                    {["Maya Hassan", "Omar Ali", "Lina Ahmed"].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                  <label className="ws-form-label" htmlFor="draft-due">
                    Proposed due date
                  </label>
                  <input
                    id="draft-due"
                    type="date"
                    value={draftDue}
                    onChange={(e) => setDraftDue(e.target.value)}
                  />
                  <button
                    className="ws-primary"
                    disabled={!draftDue}
                    onClick={() =>
                      setNotice(
                        `Assignment draft: DEMO-003 → ${draftOwner}, due ${draftDue}. No assignment or deadline was changed.`,
                      )
                    }
                  >
                    Prepare assignment draft
                  </button>
                  <Link className="ws-link" href="/operations">
                    Open existing operations →
                  </Link>
                </Card>
              </div>
              <Card
                title="Case oversight"
                subtitle="Select a sample case to inspect its next action"
              >
                {caseTable}
              </Card>
              <div className="ws-equal-columns">
                <Card title="Escalation ownership" subtitle="Planned supervisor operations · not connected">
                  <p><strong>Open escalation list:</strong> Not connected</p>
                  <p><strong>Owner and next action:</strong> Not available</p>
                  <p><strong>Review deadline:</strong> Not available</p>
                  <p>Actual ownership and escalation information will appear only after authorized integration.</p>
                  <Link className="ws-link" href="/escalations">Open existing escalation queue →</Link>
                </Card>
                <Card title="Notification delivery" subtitle="Planned operational visibility · not connected">
                  <p><strong>Delivery status:</strong> Not available</p>
                  <p><strong>Last attempt:</strong> Not available</p>
                  <p><strong>Failures and retry history:</strong> Not available</p>
                  <p>No notification is sent or retried from this preview.</p>
                </Card>
              </div>
              <div className="ws-callout"><strong>Sample-only supervisor view:</strong> Workload, case details, and assignment drafts above do not update the portal. Preview role selection does not grant permissions.</div>
            </>
          )}
          {view === "Security" && (
            <>
              <div className="ws-callout">
                <strong>Preview role is not authorization.</strong>
                <p>
                  Changing the role selector never changes account permissions
                  or MFA status. Existing portal routes enforce their own access
                  controls.
                </p>
              </div>
              <div className="ws-equal-columns">
                <Card
                  title="Security verification"
                  subtitle="Use your existing enrolled authenticator"
                >
                  <div className="ws-security-illustration">
                    <Icon name="Security" />
                  </div>
                  <Badge tone="slate">Live status not connected</Badge>
                  <p className="ws-body-copy">
                    Complete MFA in the existing portal before protected
                    actions. Never paste authenticator setup keys or
                    verification codes into an investigation report.
                  </p>
                  <Link
                    className="ws-primary"
                    href="/security"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open verification in a new tab <Icon name="arrow" />
                  </Link>
                </Card>
                <Card
                  title="Account & access"
                  subtitle="Connected controls and planned capabilities"
                >
                  <div className="ws-action-list">
                    <Link href="/security/passkeys">
                      <Icon name="Security" />
                      <span>
                        <strong>Passkey management</strong>
                        <small>Open the existing account page</small>
                      </span>
                      <Icon name="arrow" />
                    </Link>
                    <Link href="/security/email">
                      <Icon name="check" />
                      <span>
                        <strong>Email verification</strong>
                        <small>Open the existing verification flow</small>
                      </span>
                      <Icon name="arrow" />
                    </Link>
                  </div>
                  <div className="ws-field-card">
                    <small>Session inventory & access history</small>
                    <strong>Integration pending</strong>
                    <span>
                      No active-session or role-administration API is connected
                      to this preview.
                    </span>
                  </div>
                </Card>
              </div>
            </>
          )}
          <footer className="ws-footer">
            <span>FinAgent Enterprise · interface development</span>
            <span>
              SYNTHETIC DATA ONLY · Human review required · Backend integration
              pending
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
