import Link from "next/link";

import { Empty, ErrorState, When } from "@/components/ui";
import { api, ApiRequestError, listCases } from "@/lib/api";
import { recordedCalculations, recordedIndicators, type RecordedOutput } from "@/lib/connected-risk";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recorded risk findings | FinAgent Enterprise" };

const CASE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RecordedRiskPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string; cursor?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const selected = typeof params.case === "string" ? params.case : "";
  const validCase = CASE_ID.test(selected);
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;

  let page: Awaited<ReturnType<typeof listCases>> | null = null;
  let pageError: ApiRequestError | null = null;
  try {
    page = await listCases(undefined, cursor);
  } catch (error) {
    if (!(error instanceof ApiRequestError)) throw error;
    pageError = error;
  }

  let outputs: RecordedOutput[] | null = null;
  let outputError: ApiRequestError | null = null;
  if (validCase) {
    try {
      const response = await api<{ items: RecordedOutput[] }>(`/api/v1/cases/${selected}/agent-outputs`);
      outputs = response.items;
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
      outputError = error;
    }
  }

  const groups = (outputs ?? []).map((output) => ({
    output,
    indicators: recordedIndicators(output),
    calculations: recordedCalculations(output),
  })).filter((group) => group.indicators.length > 0 || group.calculations.length > 0).reverse();

  return (
    <section className="connected-workspace" aria-labelledby="recorded-risk-title">
      <p><Link href="/workspace" prefetch={false}>← Back to workspace preview</Link></p>
      {validCase && <p><Link href={`/workspace/case-overview?${new URLSearchParams({ case: selected })}`} prefetch={false}>← Back to case overview</Link></p>}
      <h1 id="recorded-risk-title">Recorded case risk indicators</h1>
      <div className="panel">
        <strong>Connected, read-only view</strong>
        <p>This page reads selected recorded AML indicator claims and calculations from the existing API under your account’s case permissions. It does not run detection, change a case, or submit a decision. The workspace also contains illustrative sample screens.</p>
        <p>Results can be historical and may refer to different evidence snapshots. Calculations are displayed as recorded; they are not recalculated here. Indicators are interpretations for human review, not proof of wrongdoing.</p>
      </div>

      <section className="panel" aria-labelledby="case-selection-title">
        <h2 id="case-selection-title">Choose an accessible case</h2>
        {pageError && <ErrorState error={pageError} what="Cases" />}
        {page && page.items.length === 0 && <Empty>No cases are available on this page.</Empty>}
        {page && page.items.length > 0 && (
          <div style={{ overflowX: "auto" }} role="region" aria-label="Case selection table" tabIndex={0}>
            <table>
              <caption>Cases returned for your signed-in account</caption>
              <thead><tr><th scope="col">Case</th><th scope="col">Status</th><th scope="col">Priority</th><th scope="col">Alert type</th><th scope="col">Action</th></tr></thead>
              <tbody>{page.items.map((item) => (
                <tr key={item.case_id}>
                  <td>{item.case_id.slice(0, 8)}</td><td>{item.status}</td><td>{item.priority}</td><td>{item.alert_type}</td>
                  <td><Link prefetch={false} aria-label={`View recorded indicators for case ${item.case_id.slice(0, 8)}`} aria-current={selected === item.case_id ? "true" : undefined} href={`/workspace/recorded-risk?${new URLSearchParams({ case: item.case_id, ...(cursor ? { cursor } : {}) })}`}>View recorded indicators</Link>{selected === item.case_id && <span className="case-selected">Selected</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {page?.next_cursor && <p><Link prefetch={false} href={`/workspace/recorded-risk?${new URLSearchParams({ ...(validCase ? { case: selected } : {}), cursor: page.next_cursor })}`}>Next cases →</Link></p>}
        {cursor && <p><Link prefetch={false} href={validCase ? `/workspace/recorded-risk?${new URLSearchParams({ case: selected })}` : "/workspace/recorded-risk"}>← First cases</Link></p>}
      </section>

      {selected && !validCase && <p role="alert" className="flash flash-error">The selected case identifier is invalid.</p>}
      {validCase && (
        <section aria-labelledby="indicators-title">
          <h2 id="indicators-title">Recorded indicators for case {selected.slice(0, 8)}</h2>
          {outputError && <ErrorState error={outputError} what="Case findings" />}
          {outputs && groups.length === 0 && (
            <div className="panel"><p>No recognized recorded AML indicators or calculations were returned for this case.</p><p>This does not mean the case has no risk, and it does not establish that a detection has run.</p></div>
          )}
          {groups.map(({ output, indicators, calculations }) => (
            <article className="panel" key={output.output_id}>
              <h3>Recorded AML output</h3>
              <p>Created: <When iso={output.created_at} /> · Status: {output.status} · Capability: {output.capability_id} {output.capability_version}</p>
              <p>Evidence snapshot: {output.snapshot_id} {output.run_id ? `· Run: ${output.run_id}` : ""}</p>
              <h4>Recorded indicator claims</h4>
              {indicators.length === 0 ? <p>No recognized indicator claims were recorded in this output. This is not a risk determination.</p> : <ul>{indicators.map((finding) => (
                <li key={finding.claim_id}>
                  <strong>{finding.claim_id}</strong> · {finding.claim_type} · {finding.support_status}
                  <p>{finding.claim}</p>
                  <p>Calculation references: {Array.isArray(finding.evidence_refs) && finding.evidence_refs.length ? finding.evidence_refs.join(", ") : "None recorded"}</p>
                </li>
              ))}</ul>}
              {calculations.length > 0 && <><h4>Recorded calculations</h4><ul>{calculations.map((finding) => (
                <li key={finding.claim_id}><strong>{finding.claim_type}</strong> · {finding.support_status}<p>{finding.claim}</p><p>References: {finding.evidence_refs.join(", ")}</p></li>
              ))}</ul></>}
            </article>
          ))}
          {outputs && <div className="panel"><p><Link href={`/cases/${selected}/agents`} prefetch={false}>View the complete recorded agent output →</Link></p><p><Link href={`/cases/${selected}/evidence`} prefetch={false}>Open the case evidence and snapshots →</Link></p></div>}
        </section>
      )}
    </section>
  );
}
