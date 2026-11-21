import Link from "next/link";
import { Empty, ErrorState, When } from "@/components/ui";
import { load } from "@/lib/api";
import { requireSession } from "@/lib/session";

interface Esc {
  escalation_id: string; case_id: string; case_status: string; due_at: string; escalated_at: string; owner_role: string;
  notification_status: string; resolved_at: string | null;
}

export default async function Escalations() {
  await requireSession();
  const { data, error } = await load<{ items: Esc[] }>("/api/v1/escalations");
  return (
    <section aria-labelledby="h">
      <h1 id="h">Escalation queue</h1>
      <p className="muted">Due times are PROPOSED defaults (DEC-16); notification delivery state is shown, including failures.</p>
      {error ? <ErrorState error={error} what="Escalations" /> : null}
      {data && data.items.length === 0 ? <Empty>No open escalations were returned for your account.</Empty> : null}
      {data && data.items.length > 0 ? (
        <div className="escalation-table" role="region" aria-label="Escalation table" tabIndex={0}><table>
          <caption>Open escalations in your access scope</caption>
          <thead><tr><th scope="col">Case</th><th scope="col">Status when due</th><th scope="col">Due</th><th scope="col">Escalated</th><th scope="col">Owner</th><th scope="col">Notification</th></tr></thead>
          <tbody>{data.items.map((e) => (
            <tr key={e.escalation_id}>
              <td><Link href={`/cases/${e.case_id}`}>{e.case_id.slice(0, 8)}</Link></td>
              <td>{e.case_status}</td><td><When iso={e.due_at} /></td><td><When iso={e.escalated_at} /></td>
              <td>{e.owner_role}</td><td>{e.notification_status}</td>
            </tr>))}</tbody>
        </table></div>
      ) : null}
    </section>
  );
}
