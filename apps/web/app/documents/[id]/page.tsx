import Link from "next/link";
import { correctField } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, ErrorState, Flash, Json, When } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface FieldRow {
  field_id: string; field_key: string; value: string | null; value_type: string; value_state: string;
  validation_status: string; currency: string | null; page: number | null; row: number | null; section: string | null;
  confidence_note: string | null; origin: string; correction_reason: string | null; created_at: string | null;
}
interface Version {
  version_id: string; version_no: number; status: string; status_reason: string | null; next_action: string | null;
  declared_media_type: string; size_bytes: number; sha256: string; scan_result: string | null; scan_engine: string | null;
  attempts: number; created_at: string; downloadable: boolean;
  extraction: { parser: string; status: string; page_count: number | null; row_count: number | null; warnings: string[]; segments: unknown[] } | null;
  quarantine: { reason_code: string; detail: string; owner_role: string; status: string } | null;
}
interface Doc {
  document_id: string; case_id: string; document_type: string; title: string; source: string; status: string | null;
  versions: Version[]; fields: FieldRow[]; field_history: FieldRow[];
}

function where(f: FieldRow): string {
  return f.page ? `page ${f.page}` : f.row ? `row ${f.row}` : f.section ?? "document";
}

export default async function DocumentReview({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const { data: d, error } = await load<Doc>(`/api/v1/documents/${id}`);
  if (error) return <ErrorState error={error} what="Document" />;
  const current = d.versions[0];
  return (
    <section aria-labelledby="h">
      <h1 id="h">Document review: {d.title}</h1>
      <p><Link href={`/cases/${d.case_id}/documents`}>← Back to case documents</Link></p>
      <p><Link href={`/workspace/recorded-provenance?${new URLSearchParams({ case: d.case_id, document: d.document_id })}#document-details`}>View recorded document provenance →</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      {current?.quarantine ? (
        <p role="alert" className="flash flash-error">Quarantined ({current.quarantine.reason_code}): {current.quarantine.detail}
          {" "}Owner: {current.quarantine.owner_role}. The original file is not available for download while quarantined.</p>
      ) : null}
      {current?.next_action && !current.quarantine ? <p className="warn">{current.next_action}</p> : null}
      {current?.downloadable ? <p><a href={`/documents/${id}/download`}>Download original (short-lived, re-authorized link)</a></p> : null}
      {current && !current.downloadable && !current.quarantine ? <p className="muted">The original file is not currently available for download. Check the processing status and any next action.</p> : null}
      <h2>Extracted fields ({d.document_type})</h2>
      <p className="muted">Values are extracted from the document; authenticity is not verified. Corrections add a new value and keep the original.</p>
      {d.fields.length > 100 && <p role="status">Showing the first 100 of {d.fields.length} current fields. Additional fields are not displayed on this page.</p>}
      {d.fields.length === 0 ? <Empty>No fields extracted.</Empty> : (
        <div className="document-review-table" role="region" aria-label="Extracted document fields table" tabIndex={0}><table>
          <caption>Extracted fields and corrections</caption>
          <thead><tr><th scope="col">Field</th><th scope="col">Value</th><th scope="col">State / validation</th><th scope="col">Provenance</th><th scope="col">Origin</th><th scope="col">Correct</th></tr></thead>
          <tbody>
            {d.fields.slice(0, 100).map((f) => (
              <tr key={f.field_id}>
                <td>{f.field_key}</td>
                <td>{f.value ?? <span className="muted">-</span>}{f.currency ? ` ${f.currency}` : ""}</td>
                <td>{f.value_state} / {f.validation_status}<div className="muted">{f.confidence_note}</div></td>
                <td>{where(f)}</td>
                <td>{f.origin}{f.correction_reason ? <div className="muted">{f.correction_reason}</div> : null}</td>
                <td>
                  <form action={correctField} className="stack">
                    <input type="hidden" name="document_id" value={id} />
                    <input type="hidden" name="field_id" value={f.field_id} />
                    <label htmlFor={`v-${f.field_id}`}>New value for {f.field_key}</label>
                    <input id={`v-${f.field_id}`} name="value" required maxLength={1000} />
                    <label htmlFor={`r-${f.field_id}`}>Reason for correcting {f.field_key}</label>
                    <input id={`r-${f.field_id}`} name="reason" required minLength={10} maxLength={300} />
                    <SubmitButton>{`Save correction for ${f.field_key}`}</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {d.field_history.length > 0 ? (
        <>
          <h2>Superseded values (kept)</h2>
          <ul>{d.field_history.map((f) => <li key={f.field_id}>{f.field_key}: {f.value} ({f.origin}, {where(f)})</li>)}</ul>
        </>
      ) : null}
      <h2>Versions</h2>
      {d.versions.length === 0 ? <Empty>No document versions were returned.</Empty> : <div className="document-review-table" role="region" aria-label="Document versions table" tabIndex={0}><table>
        <caption>Recorded document versions</caption>
        <thead><tr><th scope="col">Version</th><th scope="col">Status</th><th scope="col">Scan</th><th scope="col">Parser</th><th scope="col">Size / sha256</th><th scope="col">Created</th></tr></thead>
        <tbody>
          {d.versions.map((v) => (
            <tr key={v.version_id}>
              <td>v{v.version_no}</td>
              <td>{v.status}{v.status_reason ? <div className="muted">{v.status_reason}</div> : null}</td>
              <td>{v.scan_result} <div className="muted">{v.scan_engine}</div></td>
              <td>{v.extraction ? `${v.extraction.parser} (${v.extraction.status})` : "-"}
                {v.extraction?.warnings.length ? <div className="muted">{v.extraction.warnings.join(", ")}</div> : null}</td>
              <td>{v.size_bytes} B <div className="muted">{v.sha256.slice(0, 16)}</div></td>
              <td><When iso={v.created_at} /></td>
            </tr>
          ))}
        </tbody>
      </table></div>}
      {current?.extraction ? (
        <details><summary>Extracted text segments with provenance</summary>{current.extraction.segments.length > 50 && <p>Showing the first 50 of {current.extraction.segments.length} segments.</p>}<Json value={current.extraction.segments.slice(0, 50)} /></details>
      ) : null}
    </section>
  );
}
