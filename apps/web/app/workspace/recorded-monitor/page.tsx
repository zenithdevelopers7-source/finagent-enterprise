import Link from "next/link";
import { Empty, ErrorState, When } from "@/components/ui";
import { api, ApiRequestError, listCases } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recorded investigation runs | FinAgent Enterprise" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
interface RunSummary { run_id: string; status: string; status_reason: string; workflow_type: string; created_at: string; attempt: number }
interface Step { node: string; status: string; attempt: number; error_code: string | null; started_at: string | null; finished_at: string | null }
interface Run { run_id: string; case_id: string; status: string; status_reason: string; workflow_type: string; graph_version: string; attempt: number; max_attempts: number; next_action: string | null; steps: Step[]; blockers: { code: string; reason?: string }[] }
interface Output { output_id: string; run_id: string | null; capability_id: string; status: string; lineage?: { provider?: string; model_alias?: string }; usage?: { input_tokens?: number; output_tokens?: number; retries?: number; cost?: string } }

function elapsed(start: string | null, end: string | null): string {
  if (!start || !end) return "Not available";
  const milliseconds = Date.parse(end) - Date.parse(start);
  return Number.isFinite(milliseconds) && milliseconds >= 0 ? `${(milliseconds / 1000).toFixed(2)} s` : "Not available";
}
function recorded(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? String(value) : "Not available";
}

export default async function RecordedMonitor({ searchParams }: { searchParams: Promise<{ case?: string; run?: string; cursor?: string }> }) {
  await requireSession();
  const params = await searchParams;
  const selected = typeof params.case === "string" ? params.case : "";
  const runId = typeof params.run === "string" ? params.run : "";
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const validCase = UUID.test(selected);
  let cases: Awaited<ReturnType<typeof listCases>> | null = null;
  let caseError: ApiRequestError | null = null;
  let runs: RunSummary[] | null = null;
  let runsError: ApiRequestError | null = null;
  let run: Run | null = null;
  let runError: ApiRequestError | null = null;
  let outputs: Output[] | null = null;
  let outputError: ApiRequestError | null = null;
  try { cases = await listCases(undefined, cursor); }
  catch (error) { if (!(error instanceof ApiRequestError)) throw error; caseError = error; }
  if (validCase) {
    try { runs = (await api<{ items: RunSummary[] }>(`/api/v1/cases/${selected}/workflows`)).items; }
    catch (error) { if (!(error instanceof ApiRequestError)) throw error; runsError = error; }
  }
  if (UUID.test(runId) && runs?.some((item) => item.run_id === runId)) {
    try { run = await api<Run>(`/api/v1/workflows/${runId}`); }
    catch (error) { if (!(error instanceof ApiRequestError)) throw error; runError = error; }
  }
  if (run && run.case_id === selected) {
    try { outputs = (await api<{ items: Output[] }>(`/api/v1/cases/${selected}/agent-outputs`)).items.filter((item) => item.run_id === runId); }
    catch (error) { if (!(error instanceof ApiRequestError)) throw error; outputError = error; }
  }
  const link = (value: Record<string, string>) => `/workspace/recorded-monitor?${new URLSearchParams(value)}`;
  return <section className="connected-workspace" aria-labelledby="monitor-title">
    <p><Link href="/workspace" prefetch={false}>← Back to workspace preview</Link></p>
    {validCase && <p><Link href={`/workspace/case-overview?${new URLSearchParams({ case: selected })}`} prefetch={false}>← Back to case overview</Link></p>}
    <h1 id="monitor-title">Recorded investigation runs</h1>
    <div className="panel"><strong>Connected, read-only view</strong><p>Shows recorded workflow steps and agent outputs for an accessible case. Refresh to see newer status. Usage is shown per output when recorded and is not a run-wide total.</p></div>
    <section className="panel"><h2>Choose an accessible case</h2>
      {caseError && <ErrorState error={caseError} what="Cases" />}
      {cases?.items.length === 0 && <Empty>No cases are available on this page.</Empty>}
      {cases && cases.items.length > 0 && <ul>{cases.items.map((item) => <li key={item.case_id}><Link prefetch={false} aria-current={selected === item.case_id ? "true" : undefined} href={link({ case: item.case_id, ...(cursor ? { cursor } : {}) })}>Case {item.case_id.slice(0, 8)}</Link>{selected === item.case_id && <span className="case-selected">Selected</span>} · {item.status}</li>)}</ul>}
      {cases?.next_cursor && <p><Link prefetch={false} href={link({ ...(validCase ? { case: selected, ...(UUID.test(runId) ? { run: runId } : {}) } : {}), cursor: cases.next_cursor })}>Next cases →</Link></p>}
      {cursor && <p><Link prefetch={false} href={link(validCase ? { case: selected, ...(UUID.test(runId) ? { run: runId } : {}) } : {})}>← First cases</Link></p>}
    </section>
    {selected && !validCase && <p role="alert">The selected case identifier is invalid.</p>}
    {validCase && <section className="panel"><h2>Case runs</h2>
      {runsError && <ErrorState error={runsError} what="Case runs" />}
      {runs?.length === 0 && <Empty>No recorded runs were returned for this case.</Empty>}
      {runs && runs.length > 0 && <ul>{runs.map((item) => <li key={item.run_id}><Link prefetch={false} href={link({ case: selected, run: item.run_id, ...(cursor ? { cursor } : {}) })}>Run {item.run_id.slice(0, 8)}</Link> · {item.workflow_type} · {item.status} · attempt {item.attempt} · <When iso={item.created_at} /></li>)}</ul>}
      {runId && runs && (!UUID.test(runId) || !runs.some((item) => item.run_id === runId)) && <p role="alert">This run was not returned for the selected case.</p>}
      {runError && <ErrorState error={runError} what="Run details" />}
    </section>}
    {run && run.case_id === selected && <section className="panel"><h2>Run {run.run_id.slice(0, 8)}</h2>
      <p>{run.workflow_type} · {run.graph_version} · {run.status} · Recorded attempt count: {run.attempt} · Failure-handling threshold: {run.max_attempts}</p>
      <p>Attempts can include worker claims after review or re-analysis. The threshold is considered for certain failures, not every review cycle.</p>
      {run.attempt > run.max_attempts && <p>The count is above the failure-handling threshold. Review the full execution history; this alone does not establish a retry-limit breach.</p>}
      <p>Status reason: {run.status_reason}</p>{run.next_action && <p>Next action: {run.next_action}</p>}
      {run.blockers.length > 0 && <><h3>Blockers</h3><ul>{run.blockers.map((item, index) => <li key={index}>{item.code}{item.reason ? `: ${item.reason}` : ""}</li>)}</ul></>}
      <h3>Recorded steps</h3>
      {run.steps.length === 0 ? <Empty>No recorded steps were returned.</Empty> : <div style={{ overflowX: "auto" }} role="region" aria-label="Recorded workflow steps table" tabIndex={0}><table><caption>Recorded workflow steps</caption><thead><tr><th scope="col">Step</th><th scope="col">Status</th><th scope="col">Attempt</th><th scope="col">Error</th><th scope="col">Started</th><th scope="col">Finished</th><th scope="col">Elapsed</th></tr></thead><tbody>{run.steps.map((step, index) => <tr key={index}><td>{step.node}</td><td>{step.status}</td><td>{step.attempt}</td><td>{step.error_code ?? "None recorded"}</td><td><When iso={step.started_at} /></td><td><When iso={step.finished_at} /></td><td>{elapsed(step.started_at, step.finished_at)}</td></tr>)}</tbody></table></div>}
      <h3>Recorded agent usage</h3>
      {outputError && <ErrorState error={outputError} what="Agent outputs" />}
      {outputs?.length === 0 && <Empty>No agent outputs associated with this run were returned.</Empty>}
      {outputs && outputs.length > 0 && <ul>{outputs.map((output) => <li key={output.output_id}><strong>{output.capability_id}</strong> · {output.status} · Provider: {output.lineage?.provider ?? "Not available"}{output.lineage?.provider === "mock-model-provider" ? " (simulated)" : ""} · Model: {output.lineage?.model_alias ?? "Not available"} · Input tokens: {recorded(output.usage?.input_tokens)} · Output tokens: {recorded(output.usage?.output_tokens)} · Retries: {recorded(output.usage?.retries)} · Estimated cost: {typeof output.usage?.cost === "string" && /^\d+(?:\.\d+)?$/.test(output.usage.cost) ? `${output.usage.cost} (currency not recorded)` : "Not available"}</li>)}</ul>}
      <p><Link prefetch={false} href={`/workflows/${run.run_id}`}>Open full execution and recovery view →</Link></p>
    </section>}
  </section>;
}
