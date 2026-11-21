import { freezeSnapshot } from "@/app/actions";
import { ResolveConflictForm } from "@/components/ResolveConflictForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, ErrorState, Flash, Json, Tabs, When } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface Item {
  evidence_item_id: string;
  source_type: string;
  source_ref: string;
  version_no: number;
  content_hash: string;
  source_system: string;
  retrieved_at: string;
  as_of: string | null;
  freshness: string;
  completeness: string;
  classification: string;
  change_reason: string | null;
  content: unknown;
}
interface Gap { code: string; severity: string; source_type: string; source_ref: string | null; detail: string }
interface Conflict {
  conflict_id: string; field_key: string; item_a_id: string; item_b_id: string; value_a: string | null;
  value_b: string | null; status: string; resolution: string | null; rationale: string | null;
}
interface Snapshot { snapshot_id: string; version_no: number; completeness_status: string; open_conflicts: number; created_at: string; created_by: string; gaps: Gap[] }
interface Evidence { items: Item[]; gaps: Gap[]; conflicts: Conflict[]; latest_snapshot: Snapshot | null; requirements_version: string }

export default async function EvidencePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const { data, error } = await load<Evidence>(`/api/v1/cases/${id}/evidence`);
  const snaps = await load<{ items: Snapshot[] }>(`/api/v1/cases/${id}/snapshots`);
  return (
    <section aria-labelledby="h">
      <h1 id="h">Evidence</h1>
      <Tabs caseId={id} active="/evidence" />
      <Flash ok={sp.ok} error={sp.error} />
      {error ? <ErrorState error={error} what="Evidence" /> : null}
      {data ? (
        <>
          <h2>Gaps and limitations ({data.requirements_version})</h2>
          {data.gaps.length === 0 ? <Empty>No gaps were returned by the current evidence checklist. Review the sources before making a decision.</Empty> : (
            <ul>
              {data.gaps.map((g, i) => (
                <li key={i}><strong>{g.severity === "BLOCKING" ? "Blocking" : "Review"}:</strong> {g.code} - {g.detail}
                  {g.source_ref ? <span className="muted"> ({g.source_type} {g.source_ref})</span> : null}</li>
              ))}
            </ul>
          )}
          <h2>Contradictory records</h2>
          {data.conflicts.length === 0 ? <Empty>No conflicts were returned in the current evidence.</Empty> : data.conflicts.map((c) => (
            <div key={c.conflict_id} className="panel">
              <p><strong>{c.field_key}</strong>: source A says {c.value_a === null ? <em>value not available</em> : <q>{c.value_a}</q>}, source B says {c.value_b === null ? <em>value not available</em> : <q>{c.value_b}</q>}.
                Status: <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span></p>
              {c.status === "RESOLVED" ? <p>Resolution {c.resolution}: {c.rationale}</p> : null}
              {c.status === "OPEN" ? (
                <ResolveConflictForm caseId={id} conflictId={c.conflict_id} />
              ) : null}
            </div>
          ))}
          <h2>Current evidence</h2>
          {data.items.length === 0 ? <Empty>No current evidence was returned. This does not establish that evidence does not exist.</Empty> : (
            <div className="case-evidence-table" role="region" aria-label="Current evidence table" tabIndex={0}><table>
              <caption>Current evidence sources</caption>
              <thead><tr><th scope="col">Source</th><th scope="col">Version</th><th scope="col">Freshness / completeness</th><th scope="col">As of</th><th scope="col">Content</th></tr></thead>
              <tbody>
                {data.items.map((i) => (
                  <tr id={`evidence-${i.evidence_item_id}`} key={i.evidence_item_id}>
                    <td>{i.source_type}<div className="muted">{i.source_ref} - {i.source_system}</div></td>
                    <td>v{i.version_no}{i.change_reason ? <div className="muted">{i.change_reason}</div> : null}
                      <div className="muted">sha256 {i.content_hash.slice(0, 12)}</div></td>
                    <td>{i.freshness} / {i.completeness}</td>
                    <td><When iso={i.as_of} /></td>
                    <td><details><summary>View content for {i.source_type} ({i.source_ref})</summary><Json value={i.content} /></details></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </>
      ) : null}
      <h2>Immutable snapshots</h2>
      {data && <form action={freezeSnapshot} className="inline">
        <input type="hidden" name="case_id" value={id} />
        <SubmitButton>Freeze current evidence</SubmitButton>
      </form>}
      {snaps.error && <ErrorState error={snaps.error} what="Snapshot history" />}
      {snaps.data && snaps.data.items.length > 0 ? (
        <div className="case-evidence-table" role="region" aria-label="Evidence snapshots table" tabIndex={0}><table>
          <caption>Recorded evidence snapshots</caption>
          <thead><tr><th scope="col">Version</th><th scope="col">Completeness</th><th scope="col">Open conflicts</th><th scope="col">Gaps</th><th scope="col">Created</th></tr></thead>
          <tbody>
            {snaps.data.items.map((s) => (
              <tr key={s.snapshot_id}>
                <td>v{s.version_no} <span className="muted">{s.snapshot_id.slice(0, 8)}</span></td>
                <td><span className={`badge badge-${s.completeness_status.toLowerCase()}`}>{s.completeness_status}</span></td>
                <td>{s.open_conflicts}</td>
                <td>{s.gaps.length}</td>
                <td><When iso={s.created_at} /> by {s.created_by}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : snaps.data ? <Empty>No snapshots were returned for this case.</Empty> : null}
    </section>
  );
}
