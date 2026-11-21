import Link from "next/link";
import { startEvaluation } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, ErrorState, Flash, When } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface Run {
  evaluation_id: string; dataset: string; dataset_version: string; config_hash: string; status: string;
  gate: string; metrics: Record<string, { value: number | null; threshold: number | null; threshold_status: string; passed: boolean | null }>;
  created_at: string;
}

export default async function Evaluations({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireSession();
  const sp = await searchParams;
  const { data, error } = await load<{ items: Run[]; datasets: string[] }>("/api/v1/evaluations");
  return (
    <section aria-labelledby="h">
      <h1 id="h">Evaluation dashboard</h1>
      <p className="muted">SYNTHETIC evaluation sets. Thresholds are PROPOSED and unapproved (AI-D04): a "pass" here is not an
        acceptance decision.</p>
      <p><Link href="/workspace/evaluation-comparison">Compare recorded evaluation runs →</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      {error ? <ErrorState error={error} what="Evaluations" /> : null}
      {data && data.datasets.length > 0 ? (
        <form action={startEvaluation} className="inline panel">
          <label htmlFor="dataset">Dataset</label>
          <select id="dataset" name="dataset">{data.datasets.map((d) => <option key={d}>{d}</option>)}</select>
          <SubmitButton>Run evaluation</SubmitButton>
        </form>
      ) : null}
      {data && data.datasets.length === 0 ? <Empty>No evaluation datasets were returned; an evaluation cannot be started here.</Empty> : null}
      {data && data.items.length === 0 ? <Empty>No evaluation runs were returned.</Empty> : null}
      {data && data.items.length >= 50 ? <p role="status" className="warn">The service returned 50 runs. Older runs may not be shown in this list.</p> : null}
      {data?.items.map((r) => (
        <div key={r.evaluation_id} className="panel">
          <h2>{r.dataset} {r.dataset_version} - gate {r.gate}</h2>
          <p className="muted"><When iso={r.created_at} /> - configuration {r.config_hash.slice(0, 12)} -{" "}
            Run {r.evaluation_id.slice(0, 8)}</p>
          <div className="evaluation-results-table" role="region" aria-label={`Evaluation metrics for run ${r.evaluation_id.slice(0, 8)}`} tabIndex={0}><table>
            <caption>Recorded metrics for run {r.evaluation_id.slice(0, 8)}</caption>
            <thead><tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Threshold</th><th scope="col">Threshold status</th><th scope="col">Result</th></tr></thead>
            <tbody>{Object.entries(r.metrics).map(([k, m]) => (
              <tr key={k}><td>{k}</td><td>{m.value ?? "Not available"}</td><td>{m.threshold ?? "Not recorded"}</td><td>{m.threshold_status}</td>
                <td>{m.passed === null ? "not evaluated" : m.passed ? "meets recorded threshold" : "does not meet recorded threshold"}</td></tr>))}</tbody>
          </table></div>
        </div>
      ))}
    </section>
  );
}
