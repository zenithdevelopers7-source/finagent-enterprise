import Link from "next/link";
import { Empty, ErrorState, When } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recorded evaluation comparison | FinAgent Enterprise" };
interface Metric { value: number | null; threshold: number | null; threshold_status: string; passed: boolean | null; numerator?: number | null; denominator?: number | null; omitted?: number | null }
interface Run { evaluation_id: string; dataset: string; dataset_version: string; config_hash: string; status: string; gate: string; metrics: Record<string, Metric>; created_at: string }

function metricValue(metric: Metric | undefined): string {
  if (!metric) return "Not recorded";
  const value = typeof metric.value === "number" && Number.isFinite(metric.value) ? String(metric.value) : "Not available";
  const result = metric.passed === true ? "meets recorded threshold" : metric.passed === false ? "does not meet recorded threshold" : "not evaluated";
  const counts = typeof metric.numerator === "number" && typeof metric.denominator === "number" ? `; ${metric.numerator}/${metric.denominator}` : "";
  const omitted = typeof metric.omitted === "number" ? `; omitted ${metric.omitted}` : "";
  return `${value}${counts}${omitted}; ${result}; threshold ${metric.threshold ?? "not recorded"} (${metric.threshold_status ?? "unknown status"})`;
}

export default async function EvaluationComparison({ searchParams }: { searchParams: Promise<{ baseline?: string; candidate?: string }> }) {
  await requireSession();
  const params = await searchParams;
  let runs: Run[] | null = null;
  let error: ApiRequestError | null = null;
  try { runs = (await api<{ items: Run[] }>("/api/v1/evaluations")).items; }
  catch (caught) { if (!(caught instanceof ApiRequestError)) throw caught; error = caught; }
  const baseline = runs?.find((run) => run.evaluation_id === params.baseline);
  const candidate = runs?.find((run) => run.evaluation_id === params.candidate);
  const invalid = Boolean((params.baseline && !baseline) || (params.candidate && !candidate));
  const metrics = baseline && candidate ? [...new Set([...Object.keys(baseline.metrics ?? {}), ...Object.keys(candidate.metrics ?? {})])].sort() : [];
  return <section className="connected-workspace" aria-labelledby="evaluation-title">
    <p><Link href="/workspace" prefetch={false}>← Back to workspace preview</Link></p>
    <h1 id="evaluation-title">Recorded evaluation comparison</h1>
    <div className="panel"><strong>Connected, read-only view</strong><p>Compares recorded evaluation runs returned for your account. No tests, releases or approvals are started here. Recorded thresholds may be proposed; meeting one is not an acceptance decision.</p></div>
    {error && <ErrorState error={error} what="Evaluations" />}
    {runs?.length === 0 && <Empty>No recorded evaluation runs were returned.</Empty>}
    {runs && runs.length >= 50 && <p role="status" className="warn">The service returned 50 runs. Older runs may not be available for selection here.</p>}
    {runs && runs.length > 0 && <form className="panel evaluation-filter" method="get"><h2>Select two recorded runs</h2>
      <label htmlFor="baseline">Baseline run</label>{" "}<select id="baseline" name="baseline" defaultValue={baseline?.evaluation_id ?? ""} required><option value="">Select a run</option>{runs.map((run) => <option key={run.evaluation_id} value={run.evaluation_id}>{run.dataset} {run.dataset_version} · {run.evaluation_id.slice(0, 8)}</option>)}</select>{" "}
      <label htmlFor="candidate">Candidate run</label>{" "}<select id="candidate" name="candidate" defaultValue={candidate?.evaluation_id ?? ""} required><option value="">Select a run</option>{runs.map((run) => <option key={run.evaluation_id} value={run.evaluation_id}>{run.dataset} {run.dataset_version} · {run.evaluation_id.slice(0, 8)}</option>)}</select>{" "}<button type="submit">Compare</button>
    </form>}
    {invalid && <p role="alert">A selected run was not returned for your account.</p>}
    {baseline && candidate && <section className="panel"><h2>Recorded results</h2>
      {baseline.evaluation_id === candidate.evaluation_id && <p role="status">The same run is selected twice.</p>}
      {(baseline.dataset !== candidate.dataset || baseline.dataset_version !== candidate.dataset_version) && <p role="alert">These runs use different datasets or versions; their metrics may not be directly comparable.</p>}
      {baseline.config_hash !== candidate.config_hash && <p role="status">The configuration hashes differ. Review configuration details before interpreting differences.</p>}
      <p>Baseline: {baseline.dataset} {baseline.dataset_version} · {baseline.status} · Gate: {baseline.gate} · Configuration: {baseline.config_hash} · <When iso={baseline.created_at} /></p>
      <p>Candidate: {candidate.dataset} {candidate.dataset_version} · {candidate.status} · Gate: {candidate.gate} · Configuration: {candidate.config_hash} · <When iso={candidate.created_at} /></p>
      {metrics.length === 0 ? <Empty>No metrics were returned for either run.</Empty> : <div style={{ overflowX: "auto" }} role="region" aria-label="Recorded metrics by run table" tabIndex={0}><table><caption>Recorded metrics by run</caption><thead><tr><th scope="col">Metric</th><th scope="col">Baseline</th><th scope="col">Candidate</th></tr></thead><tbody>{metrics.map((name) => <tr key={name}><td>{name}</td><td>{metricValue(baseline.metrics?.[name])}</td><td>{metricValue(candidate.metrics?.[name])}</td></tr>)}</tbody></table></div>}
      <p><Link prefetch={false} href="/evaluations">Open existing evaluation dashboard →</Link></p>
    </section>}
  </section>;
}
