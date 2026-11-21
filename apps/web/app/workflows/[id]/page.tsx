import Link from "next/link";
import { cancelRun, resumeRun } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorState, Flash, When } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface Run {
  run_id: string; case_id: string; workflow_type: string; graph_version: string; status: string; status_reason: string;
  attempt: number; max_attempts: number; cancel_requested: boolean; created_at: string; started_at: string | null;
  finished_at: string | null; next_action: string | null; blockers: { code: string; reason?: string; operation_id?: string }[];
  steps: { node: string; status: string; attempt: number; error_code: string | null; started_at: string; finished_at: string | null }[];
  history: { from: string | null; to: string; reason: string; at: string }[];
}

export default async function RunMonitor({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const { data: r, error } = await load<Run>(`/api/v1/workflows/${id}`);
  if (error) return <ErrorState error={error} what="Workflow run" />;
  const terminal = ["SUCCEEDED", "FAILED", "CANCELLED"].includes(r.status);
  return (
    <section aria-labelledby="h">
      <h1 id="h">Execution and recovery: run {id.slice(0, 8)}</h1>
      <p><Link href={`/cases/${r.case_id}`}>Case {r.case_id.slice(0, 8)}</Link> - {r.workflow_type} ({r.graph_version}) -
        recorded attempt count {r.attempt} - configured failure-handling threshold {r.max_attempts}</p>
      <p className="muted">The attempt count can include worker claims after review or re-analysis. The threshold is considered when handling certain failures; it is not a limit on all review cycles.</p>
      {r.attempt > r.max_attempts && <p className="warn">The recorded count is above the failure-handling threshold. Review the execution history for context; this does not by itself establish that a retry limit was breached.</p>}
      <p><Link href={`/workspace/recorded-monitor?${new URLSearchParams({ case: r.case_id, run: r.run_id })}`}>View recorded investigation run →</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      <p>Status <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span> - {r.status_reason}
        {r.cancel_requested ? " (cancellation requested)" : ""}</p>
      {r.next_action ? <p className="warn">{r.next_action}</p> : null}
      {r.blockers.length ? (
        <ul>{r.blockers.map((b, i) => <li key={i}>{b.code}{b.reason ? `: ${b.reason}` : ""}
          {b.operation_id ? <> - <Link href="/operations">reconcile operation {b.operation_id.slice(0, 8)}</Link></> : null}</li>)}</ul>
      ) : null}
      {r.status === "HUMAN_REVIEW" ? (
        <form action={resumeRun} className="stack panel">
          <input type="hidden" name="run_id" value={id} />
          <input type="hidden" name="action" value="RETRY" />
          <label htmlFor="rr">Retry after review (reason)</label>
          <input id="rr" name="reason" required minLength={5} maxLength={300} />
          <SubmitButton>Retry from last checkpoint</SubmitButton>
        </form>
      ) : null}
      {!terminal && r.status !== "OUTCOME_UNCERTAIN" ? (
        <form action={cancelRun} className="inline panel">
          <input type="hidden" name="run_id" value={id} />
          <label htmlFor="cr">Cancel (committed effects are kept): reason</label>
          <input id="cr" name="reason" required minLength={3} maxLength={300} />
          <SubmitButton danger>Cancel run</SubmitButton>
        </form>
      ) : null}
      <h2>Steps</h2>
      {r.steps.length === 0 ? <p>No steps were returned for this run.</p> : <div className="workflow-steps-table" role="region" aria-label="Workflow steps table" tabIndex={0}><table>
        <caption>Recorded workflow steps</caption>
        <thead><tr><th scope="col">Node</th><th scope="col">Status</th><th scope="col">Attempt</th><th scope="col">Error</th><th scope="col">Started</th><th scope="col">Finished</th></tr></thead>
        <tbody>{r.steps.map((s, i) => (
          <tr key={i}><td>{s.node}</td><td>{s.status}</td><td>{s.attempt}</td><td>{s.error_code ?? "-"}</td>
            <td><When iso={s.started_at} /></td><td><When iso={s.finished_at} /></td></tr>))}</tbody>
      </table></div>}
      <h2>Status history</h2>
      {r.history.length === 0 ? <p>No status history was returned for this run.</p> : <ol>{r.history.map((h, i) => <li key={i}><When iso={h.at} /> {h.from ?? "new"} to <strong>{h.to}</strong>: {h.reason}</li>)}</ol>}
    </section>
  );
}
