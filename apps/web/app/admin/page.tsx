import { createDelegation, revokeDelegation, setFlag } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, ErrorState, Flash, When } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface Delegation {
  delegation_id: string; delegator_id: string; delegate_id: string; role: string; reason: string;
  valid_from: string; valid_to: string; revoked_at: string | null; active: boolean;
}

export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireSession();
  const sp = await searchParams;
  const dels = await load<{ items: Delegation[] }>("/api/v1/admin/delegations");
  return (
    <section aria-labelledby="h">
      <h1 id="h">Tenant administration</h1>
      <p className="muted">Tenant administrators only (MFA). Administration grants no access to case content.</p>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="panel">
        <h2>Downstream case-status write</h2>
        <p>The ONLY business write in Release 1. It also requires the deployment setting; both are OFF by default (DATA-D06).</p>
        <form action={setFlag} className="stack">
          <input type="hidden" name="flag_key" value="case_status_write" />
          <label htmlFor="enabled">State</label>
          <select id="enabled" name="enabled"><option value="false">Disabled</option><option value="true">Enabled</option></select>
          <label htmlFor="freason">Reason (recorded)</label>
          <input id="freason" name="reason" required minLength={10} maxLength={300} />
          <SubmitButton>Update flag</SubmitButton>
        </form>
      </div>
      <div className="panel">
        <h2>Delegations</h2>
        {dels.error ? <ErrorState error={dels.error} what="Delegations" /> : null}
        {dels.data && dels.data.items.length === 0 ? <Empty>No delegations.</Empty> : null}
        {dels.data && dels.data.items.length > 0 ? (
          <div className="admin-table" role="region" aria-label="Delegations table" tabIndex={0}><table>
            <caption>Recorded delegations</caption>
            <thead><tr><th scope="col">Role</th><th scope="col">From</th><th scope="col">To</th><th scope="col">Window</th><th scope="col">State</th><th scope="col">Revoke</th></tr></thead>
            <tbody>{dels.data.items.map((d) => (
              <tr key={d.delegation_id}>
                <td>{d.role}</td><td>{d.delegator_id.slice(0, 8)}</td><td>{d.delegate_id.slice(0, 8)}</td>
                <td><When iso={d.valid_from} /> to <When iso={d.valid_to} /></td>
                <td>{d.revoked_at ? "revoked" : d.active ? "active" : "inactive"}</td>
                <td>{!d.revoked_at ? (
                  <form action={revokeDelegation}><input type="hidden" name="delegation_id" value={d.delegation_id} />
                    <SubmitButton danger>Revoke</SubmitButton></form>) : "-"}</td>
              </tr>))}</tbody>
          </table></div>
        ) : null}
        <form action={createDelegation} className="stack">
          <h3>Create delegation</h3>
          <label htmlFor="delegator_id">Delegator principal id</label><input id="delegator_id" name="delegator_id" required />
          <label htmlFor="delegate_id">Delegate principal id</label><input id="delegate_id" name="delegate_id" required />
          <label htmlFor="role">Role</label>
          <select id="role" name="role"><option>REVIEWER</option><option>ANALYST</option></select>
          <label htmlFor="days">Days (maximum is configured)</label><input id="days" name="days" type="number" min={1} max={30} defaultValue={1} />
          <label htmlFor="dreason">Reason</label><input id="dreason" name="reason" required minLength={10} maxLength={300} />
          <SubmitButton>Create delegation</SubmitButton>
        </form>
      </div>
    </section>
  );
}
