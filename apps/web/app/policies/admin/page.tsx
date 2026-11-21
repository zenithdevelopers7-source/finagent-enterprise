import { policyLifecycle, syncPolicies } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, ErrorState, Flash } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface Version {
  policy_version_id: string; policy_key: string; title: string; version_label: string; effective_from: string;
  effective_to: string | null; approval_status: string; ingestion_status: string; classification: string;
  allowed_roles: string[]; active_chunks: number; owner_label: string; status_reason: string | null;
}

const NEXT: Record<string, string[]> = { DRAFT: ["approve", "revoke", "reindex"], APPROVED: ["retire", "revoke", "reindex"], RETIRED: ["revoke"] };

export default async function PolicyAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireSession();
  const sp = await searchParams;
  const { data, error } = await load<{ items: Version[] }>("/api/v1/knowledge/policies");
  return (
    <section aria-labelledby="h">
      <h1 id="h">Policy administration</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={syncPolicies} className="inline panel">
        <SubmitButton>Synchronise from the policy repository</SubmitButton>
        <span className="muted">New versions arrive as DRAFT and are never retrievable until approved.</span>
      </form>
      {error ? <ErrorState error={error} what="Policies" /> : null}
      {data && data.items.length === 0 ? <Empty>No policy versions.</Empty> : null}
      {data && data.items.length > 0 ? (
        <div className="admin-table" role="region" aria-label="Policy versions table" tabIndex={0}><table>
          <caption>Policy versions</caption>
          <thead><tr><th scope="col">Policy</th><th scope="col">Version</th><th scope="col">Effective</th><th scope="col">Status</th><th scope="col">Access</th><th scope="col">Action</th></tr></thead>
          <tbody>{data.items.map((v) => (
            <tr key={v.policy_version_id}>
              <td>{v.title}<div className="muted">{v.policy_key} - {v.owner_label}</div></td>
              <td>{v.version_label}</td>
              <td>{v.effective_from} to {v.effective_to ?? "open"}</td>
              <td>{v.approval_status} / {v.ingestion_status} ({v.active_chunks} chunks){v.status_reason ? <div className="muted">{v.status_reason}</div> : null}</td>
              <td>{v.classification}<div className="muted">{v.allowed_roles.join(", ")}</div></td>
              <td>
                {(NEXT[v.approval_status] ?? []).length ? (
                  <form action={policyLifecycle} className="stack">
                    <input type="hidden" name="version_id" value={v.policy_version_id} />
                    <label htmlFor={`a-${v.policy_version_id}`}>Action</label>
                    <select id={`a-${v.policy_version_id}`} name="action">
                      {(NEXT[v.approval_status] ?? []).map((a) => <option key={a}>{a}</option>)}
                    </select>
                    <label htmlFor={`r-${v.policy_version_id}`}>Reason</label>
                    <input id={`r-${v.policy_version_id}`} name="reason" minLength={5} maxLength={300} defaultValue="" />
                    <SubmitButton>Apply</SubmitButton>
                  </form>
                ) : "-"}
              </td>
            </tr>))}</tbody>
        </table></div>
      ) : null}
    </section>
  );
}
