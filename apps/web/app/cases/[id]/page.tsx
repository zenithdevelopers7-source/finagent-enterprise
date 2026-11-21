import { randomUUID } from "node:crypto";
import Link from "next/link";
import { resumeRun, updateCase } from "@/app/actions";
import { StartInvestigationForm } from "@/components/StartInvestigationForm";
import { ReopenCaseForm } from "@/components/ReopenCaseForm";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, ErrorState, Field, Flash, Tabs, When } from "@/components/ui";
import { type CaseStatus, load } from "@/lib/api";
import { requireSession } from "@/lib/session";

export interface CaseDetail {
  case_id: string;
  status: CaseStatus;
  priority: string;
  queue: string;
  alert_type: string;
  source_alert_id: string;
  source_system: string;
  classification: string;
  created_at: string;
  updated_at: string;
  status_changed_at: string;
  due_at: string | null;
  record_version: number;
  can_reopen: boolean;
  reopening_requires_mfa: boolean;
  blocked_reason: string | null;
  blocked_owner_role: string | null;
  assigned_analyst_id: string | null;
  assigned_reviewer_id: string | null;
  alert: { subject_refs: string[]; window_start: string; window_end: string; severity: string | null; occurred_at: string };
  timeline: { from: string | null; to: string; actor: string; reason: string; at: string }[];
}

export interface RunView {
  run_id: string;
  status: string;
  status_reason: string;
  workflow_type: string;
  next_action: string | null;
  blockers: { code: string; reason?: string; operation_id?: string }[];
  created_at: string;
  attempt: number;
}

export default async function CaseOverview({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const { data: c, error } = await load<CaseDetail>(`/api/v1/cases/${id}`);
  if (error) return <ErrorState error={error} what="Case" />;
  const runs = await load<{ items: RunView[] }>(`/api/v1/cases/${id}/workflows`);
  const active = runs.data?.items.find((r) => !["SUCCEEDED", "FAILED", "CANCELLED"].includes(r.status));
  return (
    <section aria-labelledby="h">
      <p><Link href="/cases">← Back to case queue</Link></p>
      <h1 id="h">Case {c.case_id.slice(0, 8)} <StatusBadge status={c.status} /></h1>
      <p><Link href={`/workspace/case-overview?${new URLSearchParams({ case: c.case_id })}`}>Open connected investigation overview →</Link></p>
      <Tabs caseId={id} active="" />
      <Flash ok={sp.ok} error={sp.error} />
      {c.status === "BLOCKED" ? (
        <p className="warn" role="status"><strong>Blocked:</strong> {c.blocked_reason} (owner: {c.blocked_owner_role})</p>
      ) : null}
      <div className="panel">
        <dl className="facts">
          <Field label="Alert">{c.alert_type} - {c.source_alert_id} ({c.source_system})</Field>
          <Field label="Severity">{c.alert.severity ?? "-"}</Field>
          <Field label="Subjects">{c.alert.subject_refs.join(", ")}</Field>
          <Field label="Activity window"><When iso={c.alert.window_start} /> to <When iso={c.alert.window_end} /></Field>
          <Field label="Priority">{c.priority}</Field>
          <Field label="Classification">{c.classification}</Field>
          <Field label="Analyst">{c.assigned_analyst_id ?? "unassigned"}</Field>
          <Field label="Reviewer">{c.assigned_reviewer_id ?? "not yet assigned"}</Field>
          <Field label="Due (escalation)"><When iso={c.due_at} /></Field>
          <Field label="Record version">{c.record_version}</Field>
        </dl>
      </div>

      <h2>Investigation runs</h2>
      {runs.error ? <ErrorState error={runs.error} what="Runs" /> : null}
      {runs.data && runs.data.items.length === 0 ? <Empty>No investigation has been started.</Empty> : null}
      {runs.data && runs.data.items.length > 0 ? (
        <div className="case-run-table" role="region" aria-label="Investigation runs table" tabIndex={0}><table>
          <caption>Recorded investigation runs</caption>
          <thead><tr><th scope="col">Run</th><th scope="col">Status</th><th scope="col">Reason / next action</th><th scope="col">Started</th></tr></thead>
          <tbody>
            {runs.data.items.map((r) => (
              <tr key={r.run_id}>
                <td><Link href={`/workflows/${r.run_id}`}>{r.run_id.slice(0, 8)}</Link> ({r.workflow_type})</td>
                <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                <td>{r.status_reason}{r.next_action ? <div className="muted">{r.next_action}</div> : null}</td>
                <td><When iso={r.created_at} /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : null}
      {runs.data && !active && ["ASSIGNED", "INVESTIGATING", "REWORK"].includes(c.status) ? (
        <StartInvestigationForm caseId={id} requestKey={randomUUID()} />
      ) : null}
      {active?.status === "WAITING_EVIDENCE" ? (
        <form action={resumeRun} className="stack panel">
          <input type="hidden" name="run_id" value={active.run_id} />
          <input type="hidden" name="action" value="EVIDENCE_SUPPLIED" />
          <input type="hidden" name="back" value={`/cases/${id}`} />
          <label htmlFor="reason">What changed (required)</label>
          <input id="reason" name="reason" required minLength={5} maxLength={300} />
          <SubmitButton>Evidence supplied - continue</SubmitButton>
        </form>
      ) : null}
      {active?.status === "WAITING_REVIEW" && ["INVESTIGATING", "REWORK"].includes(c.status) ? (
        <form action={resumeRun} className="stack panel">
          <input type="hidden" name="run_id" value={active.run_id} />
          <input type="hidden" name="action" value="REANALYZE" />
          <input type="hidden" name="back" value={`/cases/${id}`} />
          <label htmlFor="reanalyze">Re-analyse with fresh evidence (reason)</label>
          <input id="reanalyze" name="reason" required minLength={5} maxLength={300} />
          <SubmitButton>Re-run evidence and analysis</SubmitButton>
        </form>
      ) : null}
      {["INVESTIGATING", "BLOCKED"].includes(c.status) ? (
        <form action={updateCase} className="inline panel">
          <input type="hidden" name="case_id" value={id} />
          <input type="hidden" name="record_version" value={c.record_version} />
          <input type="hidden" name="status" value={c.status === "BLOCKED" ? "INVESTIGATING" : "BLOCKED"} />
          {c.status === "INVESTIGATING" ? <input type="hidden" name="blocked_owner_role" value="ANALYST" /> : null}
          <label htmlFor="creason">{c.status === "BLOCKED" ? "Resolve block" : "Block case"}: reason</label>
          <input id="creason" name="reason" required minLength={3} maxLength={300} />
          <SubmitButton>{c.status === "BLOCKED" ? "Resume investigation" : "Mark blocked"}</SubmitButton>
        </form>
      ) : null}

      {c.status === "COMPLETED" && c.can_reopen ? (
        <div className="panel" aria-labelledby="reopen-heading">
          <h2 id="reopen-heading">Reopen completed case</h2>
          <p id="reopen-help">
            Previous completion and approval records remain in the case history. Reopening creates a new
            draft that needs independent review. The assigned analyst can then start a new investigation.
          </p>
          {c.reopening_requires_mfa ? (
            <p className="warn" role="status">
              Multi-factor authentication is required to reopen this case. <Link href="/signin">Sign in with MFA</Link>.
            </p>
          ) : runs.error ? (
            <p className="warn">Investigation status could not be checked. Reload the page before reopening.</p>
          ) : active ? (
            <p className="warn">An investigation is still active or unresolved. Resolve it before reopening.</p>
          ) : (
            <ReopenCaseForm caseId={id} recordVersion={c.record_version} />
          )}
        </div>
      ) : null}

      <h2>Status timeline</h2>
      <ol>
        {c.timeline.map((t, i) => (
          <li key={i}><When iso={t.at} /> - {t.from ?? "new"} to <strong>{t.to}</strong> by {t.actor}: {t.reason}</li>
        ))}
      </ol>
    </section>
  );
}
