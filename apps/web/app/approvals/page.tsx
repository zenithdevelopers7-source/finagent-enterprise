import Link from "next/link";
import { Empty, ErrorState, When } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface Req { approval_request_id: string; case_id: string; status: string; created_at: string; reviewer_id: string | null; requested_by: string }
const STATUSES = ["PENDING", "APPROVED", "RETURNED", "INFO_REQUESTED", "REJECTED", "INVALIDATED", "WITHDRAWN", "CONSUMED"];

export default async function Approvals({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireSession();
  const sp = await searchParams;
  const invalidStatus = Boolean(sp.status && !STATUSES.includes(sp.status));
  const status = sp.status && !invalidStatus ? sp.status : "PENDING";
  const { data, error } = await load<{ items: Req[] }>(`/api/v1/approvals?status=${encodeURIComponent(status)}`);
  return (
    <section className="approval-center" aria-labelledby="h">
      <h1 id="h">Approval center</h1>
      <p>Review requests available to your account. Open a request to inspect its report, evidence snapshot, and any recorded decision.</p>
      <form className="panel approval-filter" method="get">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status}>
          {STATUSES.map((s) =>
            <option key={s}>{s}</option>)}
        </select>
        <button type="submit">Filter</button>
      </form>
      {invalidStatus && <p role="alert">The requested status was not recognized. Showing pending requests instead.</p>}
      {error ? <ErrorState error={error} what="Approvals" /> : null}
      {data && data.items.length === 0 ? <Empty>No review requests with this status in your scope.</Empty> : null}
      {data && data.items.length >= 100 ? <p role="status" className="warn">The service returned 100 requests. Additional requests may not be shown in this list.</p> : null}
      {data && data.items.length > 0 ? (
        <div className="approval-table" role="region" aria-label="Review request table" tabIndex={0}><table>
          <caption>Review requests · {status}</caption>
          <thead><tr><th scope="col">Request</th><th scope="col">Case</th><th scope="col">Status</th><th scope="col">Reviewer</th><th scope="col">Submitted</th></tr></thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.approval_request_id}>
                <td><a href={`/approvals/${r.approval_request_id}`}>{r.approval_request_id.slice(0, 8)}</a></td>
                <td><Link href={`/cases/${r.case_id}`}>{r.case_id.slice(0, 8)}</Link></td>
                <td>{r.status}</td>
                <td>{r.reviewer_id?.slice(0, 8) ?? "Not assigned"}</td>
                <td><When iso={r.created_at} /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : null}
    </section>
  );
}
