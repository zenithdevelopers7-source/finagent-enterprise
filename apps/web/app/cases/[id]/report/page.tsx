import { randomUUID } from "node:crypto";
import Link from "next/link";
import { createExport, editReport, withdrawReport } from "@/app/actions";
import { SubmitReportForm } from "@/components/SubmitReportForm";
import { FindingTag, type FindingKind } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, ErrorState, Flash, Tabs, When } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface Section { section_id: string; title: string; text: string; claim_ids: string[] }
interface Claim { claim_id: string; section: string; claim_type: FindingKind; text: string; support_status: string; evidence_refs: string[]; citation_refs: string[] }
interface Version {
  report_id: string; report_status: string; current_version_no: number; version_id: string; version_no: number;
  snapshot_id: string; origin: string; author_label: string; edit_note: string | null; created_at: string;
  sections: Section[]; claims: Claim[]; validation: { valid: boolean; problems?: { code: string; section?: string }[] };
  watermark: string | null; diff_from_previous?: { section_id: string; change: string; diff: string[] }[];
}
interface Reports { report: { status: string; current_version_no: number } | null; versions: { version_no: number; origin: string; author_label: string; created_at: string; valid: boolean; edit_note: string | null }[] }

export default async function ReportPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const list = await load<Reports>(`/api/v1/cases/${id}/reports`);
  if (list.error) return <ErrorState error={list.error} what="Report" />;
  const report = list.data.report;
  const requested = sp.v === undefined ? null : /^[1-9]\d{0,8}$/.test(sp.v) ? Number(sp.v) : null;
  const invalidVersion = sp.v !== undefined && (requested === null || !list.data.versions.some((item) => item.version_no === requested));
  const shown = sp.v === undefined ? report?.current_version_no ?? 0 : requested ?? 0;
  const v = report && !invalidVersion ? await load<Version>(`/api/v1/cases/${id}/reports/versions/${shown}`) : null;
  const isCurrent = report && shown === report.current_version_no;
  return (
    <section aria-labelledby="h">
      <h1 id="h">Investigation report</h1>
      <Tabs caseId={id} active="/report" />
      <p><Link href={`/workspace/recorded-review?${new URLSearchParams({ case: id })}`}>Compare recorded report versions →</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      {invalidVersion && <p role="alert">The selected report version was not returned for this case. Choose a version from the revision history.</p>}
      {!report ? <Empty>No draft yet. The draft is produced by the investigation run after evidence and analysis.</Empty> : null}
      {v?.error ? <ErrorState error={v.error} what="Report version" /> : null}
      {v?.data ? (
        <>
          <p>Report status <span className={`badge badge-${report?.status.toLowerCase()}`}>{report?.status}</span> - viewing
            version {v.data.version_no} of {v.data.current_version_no} ({v.data.origin}, {v.data.author_label},{" "}
            <When iso={v.data.created_at} />)</p>
          {!isCurrent ? <p className="warn">You are viewing an earlier version. <Link href={`/cases/${id}/report`}>Return to the current report</Link> to manage the current submission.</p> : null}
          {v.data.watermark ? <p className="warn"><strong>{v.data.watermark}</strong></p> : null}
          {!v.data.validation.valid ? (
            <div role="alert" className="flash flash-error">Validation problems (block submission):
              <ul>{v.data.validation.problems?.map((p, i) => <li key={i}>{p.code}{p.section ? ` in ${p.section}` : ""}</li>)}</ul></div>
          ) : <p className="flash flash-ok">Deterministic validation passed.</p>}
          {isCurrent && report?.status === "DRAFT" ? (
            <form action={editReport} className="stack">
              <input type="hidden" name="case_id" value={id} />
              <input type="hidden" name="base_version_no" value={v.data.version_no} />
              {v.data.sections.map((s) => (
                <div key={s.section_id} className="panel">
                  <input type="hidden" name="section_id" value={s.section_id} />
                  <label htmlFor={`s-${s.section_id}`}>{s.title}</label>
                  <textarea id={`s-${s.section_id}`} name="section_text" defaultValue={s.text} />
                  {s.claim_ids.length ? <p className="muted">Backed by claims: {s.claim_ids.join(", ")}</p> : null}
                </div>
              ))}
              <label htmlFor="edit_note">Edit note (required)</label>
              <input id="edit_note" name="edit_note" required minLength={3} maxLength={500} />
              <SubmitButton>Save as new version</SubmitButton>
            </form>
          ) : (
            v.data.sections.map((s) => (
              <div key={s.section_id} className="panel"><h2>{s.title}</h2><p style={{ whiteSpace: "pre-wrap" }}>{s.text}</p></div>
            ))
          )}
          <h2>Claims and evidence links</h2>
          <ul>
            {v.data.claims.map((c) => (
              <li key={c.claim_id} className="claim"><FindingTag kind={c.claim_type} /> {c.text}{" "}
                <span className="muted">[{c.support_status}; {[...c.evidence_refs, ...c.citation_refs].map((r) =>
                  r.startsWith("cite:") ? <Link key={r} href={`/policies/chunks/${r.slice(5)}`}>{r} </Link> : `${r} `)}]</span></li>
            ))}
          </ul>
          {v.data.diff_from_previous?.length ? (
            <details><summary>Changes from the previous version</summary>
              {v.data.diff_from_previous.map((d) => (
                <div key={d.section_id}><strong>{d.section_id}</strong> ({d.change})<pre className="diff">{d.diff.join("\n")}</pre></div>
              ))}
            </details>
          ) : null}
          {isCurrent && report?.status === "DRAFT" && v.data.validation.valid ? (
            <SubmitReportForm caseId={id} version={v.data.version_no} requestKey={randomUUID()} />
          ) : null}
          {isCurrent && report?.status === "DRAFT" && !v.data.validation.valid ? <p className="warn">Resolve the validation problems above before submitting this version for review.</p> : null}
          {isCurrent && report?.status === "SUBMITTED" ? (
            <form action={withdrawReport} className="inline panel">
              <input type="hidden" name="case_id" value={id} />
              <label htmlFor="wreason">Reason for withdrawing the current submission</label>
              <input id="wreason" name="reason" required minLength={5} maxLength={300} />
              <SubmitButton danger>Withdraw current submission</SubmitButton>
            </form>
          ) : null}
          <form action={createExport} className="inline panel">
            <input type="hidden" name="case_id" value={id} />
            <input type="hidden" name="version_no" value={v.data.version_no} />
            <SubmitButton>Export this version</SubmitButton>
            <span className="muted">Reviewers and supervisors only. Unapproved versions carry a DRAFT watermark.</span>
          </form>
        </>
      ) : null}
      {list.data.versions.length ? (
        <>
          <h2>Revision history</h2>
          <div className="report-history-table" role="region" aria-label="Report revision history table" tabIndex={0}><table>
            <caption>Recorded report revisions</caption>
            <thead><tr><th scope="col">Version</th><th scope="col">Origin</th><th scope="col">Author</th><th scope="col">Valid</th><th scope="col">Note</th><th scope="col">Created</th></tr></thead>
            <tbody>
              {list.data.versions.map((h) => (
                <tr key={h.version_no}>
                  <td><Link href={`/cases/${id}/report?v=${h.version_no}`}>v{h.version_no}</Link></td>
                  <td>{h.origin}</td><td>{h.author_label}</td><td>{h.valid ? "yes" : "no"}</td>
                  <td>{h.edit_note ?? "-"}</td><td><When iso={h.created_at} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      ) : null}
    </section>
  );
}
