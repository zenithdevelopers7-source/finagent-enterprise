import { randomUUID } from "node:crypto";
import Link from "next/link";
import { uploadDocument } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, ErrorState, Flash, Tabs, When } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface Doc {
  document_id: string; document_type: string; title: string; source: string; current_version_no: number;
  status: string | null; status_reason: string | null; next_action: string | null; created_at: string;
}

export default async function Documents({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const { data, error } = await load<{ items: Doc[] }>(`/api/v1/cases/${id}/documents`);
  return (
    <section aria-labelledby="h">
      <h1 id="h">Documents</h1>
      <Tabs caseId={id} active="/documents" />
      <p><Link href={`/workspace/recorded-provenance?${new URLSearchParams({ case: id })}`}>View recorded document provenance →</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={uploadDocument} className="stack panel">
        <input type="hidden" name="case_id" value={id} />
        <input type="hidden" name="key" value={randomUUID()} />
        <label htmlFor="file">File (PDF, DOCX or CSV; up to 20 MiB; scanned before use)</label>
        <input id="file" name="file" type="file" accept=".pdf,.docx,.csv" required />
        <label htmlFor="document_type">Document type</label>
        <select id="document_type" name="document_type">
          <option value="PASSPORT">Passport</option>
          <option value="PROOF_OF_ADDRESS">Proof of address</option>
          <option value="BANK_STATEMENT">Bank statement</option>
          <option value="SOURCE_OF_FUNDS">Source of funds</option>
          <option value="OTHER">Other</option>
        </select>
        <SubmitButton>Upload</SubmitButton>
      </form>
      {error ? <ErrorState error={error} what="Documents" /> : null}
      {data && data.items.length === 0 ? <Empty>No documents for this case.</Empty> : null}
      {data && data.items.length > 0 ? (
        <div className="case-documents-table" role="region" aria-label="Case documents table" tabIndex={0}><table>
          <caption>Documents returned for this case</caption>
          <thead><tr><th scope="col">Document</th><th scope="col">Type / source</th><th scope="col">Processing status</th><th scope="col">Created</th></tr></thead>
          <tbody>
            {data.items.map((d) => (
              <tr key={d.document_id}>
                <td><Link href={`/documents/${d.document_id}`}>{d.title}</Link> (v{d.current_version_no})</td>
                <td>{d.document_type} / {d.source}</td>
                <td><span className={`badge badge-${(d.status ?? "").toLowerCase()}`}>{d.status ?? "Not available"}</span>
                  {d.status_reason ? <div className="muted">{d.status_reason}</div> : null}
                  {d.next_action ? <div className="warn">{d.next_action}</div> : null}</td>
                <td><When iso={d.created_at} /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : null}
      <p className="muted">Status refreshes when you reload: uploads are scanned, then parsed in an isolated worker.</p>
    </section>
  );
}
