import Link from "next/link";
import { Empty, ErrorState, When } from "@/components/ui";
import { api, ApiRequestError, listCases } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { summarizePosted } from "@/lib/transaction-summary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recorded transactions | FinAgent Enterprise" };
const CASE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROWS_PER_PAGE = 25;

interface Transaction {
  source_transaction_id: string; booking_time: string; amount: string; currency: string;
  direction: string; status: string; counterparty_ref: string | null;
}
interface EvidenceItem {
  evidence_item_id: string; source_type: string; source_ref: string; source_system: string;
  version_no: number; freshness: string; completeness: string; as_of: string | null;
  content: { items?: Transaction[] } | null;
}
interface Evidence { items: EvidenceItem[]; gaps: { source_type: string; detail: string }[] }

export default async function RecordedTransactionsPage({ searchParams }: {
  searchParams: Promise<{ case?: string; cursor?: string; q?: string; direction?: string; status?: string; page_source?: string; page?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const selected = typeof params.case === "string" ? params.case : "";
  const valid = CASE_ID.test(selected);
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const direction = ["CREDIT", "DEBIT"].includes(params.direction ?? "") ? params.direction! : "";
  const status = ["POSTED", "PENDING", "REVERSED"].includes(params.status ?? "") ? params.status! : "";
  const invalidFilters = Boolean((params.direction && !direction) || (params.status && !status));
  let cases: Awaited<ReturnType<typeof listCases>> | null = null;
  let caseError: ApiRequestError | null = null;
  let evidence: Evidence | null = null;
  let evidenceError: ApiRequestError | null = null;
  try { cases = await listCases(undefined, cursor); }
  catch (error) { if (!(error instanceof ApiRequestError)) throw error; caseError = error; }
  if (valid) {
    try { evidence = await api<Evidence>(`/api/v1/cases/${selected}/evidence`); }
    catch (error) { if (!(error instanceof ApiRequestError)) throw error; evidenceError = error; }
  }
  const sources = (evidence?.items ?? []).filter((item) => item.source_type === "TRANSACTIONS");
  const search = query.toLocaleLowerCase();
  return <section className="connected-workspace" aria-labelledby="recorded-transactions-title">
    <p><Link href="/workspace" prefetch={false}>← Back to workspace preview</Link></p>
    {valid && <p><Link href={`/workspace/case-overview?${new URLSearchParams({ case: selected })}`} prefetch={false}>← Back to case overview</Link></p>}
    <h1 id="recorded-transactions-title">Recorded case transactions</h1>
    <div className="panel"><strong>Connected, read-only view</strong>
      <p>Shows current transaction evidence for an accessible case. Records may be incomplete or stale; this is not a live ledger or a risk determination.</p></div>
    <section className="panel"><h2>Choose an accessible case</h2>
      {caseError && <ErrorState error={caseError} what="Cases" />}
      {cases?.items.length === 0 && <Empty>No cases are available on this page.</Empty>}
      {cases && cases.items.length > 0 && <ul>{cases.items.map((item) => <li key={item.case_id}>
        <Link prefetch={false} aria-current={selected === item.case_id ? "true" : undefined} href={`/workspace/recorded-transactions?${new URLSearchParams({ case: item.case_id, ...(cursor ? { cursor } : {}) })}`}>Case {item.case_id.slice(0, 8)}</Link>{selected === item.case_id && <span className="case-selected">Selected</span>} · {item.status}
      </li>)}</ul>}
      {cases?.next_cursor && <p><Link prefetch={false} href={`/workspace/recorded-transactions?${new URLSearchParams({ ...(valid ? { case: selected, ...(query ? { q: query } : {}), ...(direction ? { direction } : {}), ...(status ? { status } : {}), ...(params.page_source ? { page_source: params.page_source } : {}), ...(params.page ? { page: params.page } : {}) } : {}), cursor: cases.next_cursor })}`}>Next cases →</Link></p>}
      {cursor && <p><Link prefetch={false} href={`/workspace/recorded-transactions?${new URLSearchParams(valid ? { case: selected, ...(query ? { q: query } : {}), ...(direction ? { direction } : {}), ...(status ? { status } : {}), ...(params.page_source ? { page_source: params.page_source } : {}), ...(params.page ? { page: params.page } : {}) } : {})}`}>← First cases</Link></p>}
    </section>
    {selected && !valid && <p role="alert">The selected case identifier is invalid.</p>}
    {valid && <section><h2>Transactions for case {selected.slice(0, 8)}</h2>
      {evidenceError && <ErrorState error={evidenceError} what="Transaction evidence" />}
      {evidence && <>
        <form className="panel transaction-filters" method="get"><input type="hidden" name="case" value={selected} />
          {cursor && <input type="hidden" name="cursor" value={cursor} />}
          <label htmlFor="transaction-search">Search transaction ID, counterparty, date, direction or status</label>{" "}
          <input id="transaction-search" name="q" defaultValue={query} maxLength={100} />{" "}
          <label htmlFor="transaction-direction">Direction</label>{" "}<select id="transaction-direction" name="direction" defaultValue={direction}><option value="">All directions</option><option value="CREDIT">Credit</option><option value="DEBIT">Debit</option></select>{" "}
          <label htmlFor="transaction-status">Status</label>{" "}<select id="transaction-status" name="status" defaultValue={status}><option value="">All statuses</option><option value="POSTED">Posted</option><option value="PENDING">Pending</option><option value="REVERSED">Reversed</option></select>{" "}<button type="submit">Apply filters</button>
          {(query || direction || status) && <Link prefetch={false} href={`/workspace/recorded-transactions?${new URLSearchParams({ case: selected, ...(cursor ? { cursor } : {}) })}`}>Clear filters</Link>}
        </form>
        {(query || direction || status) && <p role="status">Active filters: {query ? `search “${query}”` : "all search terms"} · {direction || "all directions"} · {status || "all statuses"}.</p>}
        {invalidFilters && <p role="alert">An unrecognized filter was ignored. Choose a direction and status from the lists.</p>}
        {evidence.gaps.filter((gap) => gap.source_type === "TRANSACTIONS").map((gap, index) => <p role="status" key={index}>Evidence gap: {gap.detail}</p>)}
        {sources.length === 0 && <Empty>No current transaction evidence is available for this case. This does not establish that no transactions exist.</Empty>}
        {sources.map((source) => {
          const rows = Array.isArray(source.content?.items) ? source.content.items : [];
          const filtered = rows.filter((row) => (!direction || row.direction === direction) && (!status || row.status === status) && [row.source_transaction_id, row.counterparty_ref, row.booking_time, row.direction, row.status].some((value) => typeof value === "string" && value.toLocaleLowerCase().includes(search))).slice().sort((a, b) => {
            const first = Date.parse(a.booking_time), second = Date.parse(b.booking_time);
            if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
            if (!Number.isFinite(second)) return -1;
            return first - second;
          });
          const summary = summarizePosted(filtered);
          const requestedPage = params.page_source === source.evidence_item_id && typeof params.page === "string" && /^[1-9]\d{0,6}$/.test(params.page) ? Number(params.page) : 1;
          const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
          const currentPage = Math.min(requestedPage, pageCount);
          const firstRow = (currentPage - 1) * ROWS_PER_PAGE;
          const visibleRows = filtered.slice(firstRow, firstRow + ROWS_PER_PAGE);
          const pageLink = (page: number) => `/workspace/recorded-transactions?${new URLSearchParams({ case: selected, ...(cursor ? { cursor } : {}), ...(query ? { q: query } : {}), ...(direction ? { direction } : {}), ...(status ? { status } : {}), page_source: source.evidence_item_id, page: String(page) })}`;
          return <article className="panel" key={source.evidence_item_id}>
            <h3>Evidence source: {source.source_ref}</h3>
            <p>{source.source_system} · Version {source.version_no} · {source.freshness} / {source.completeness} · As of <When iso={source.as_of} /></p>
            <p>Ordered by booking time, oldest first. Unavailable dates appear last. Each evidence source is shown separately.</p>
            <h4>Filtered posted amounts by currency and direction</h4>
            <p>Calculated from all filtered rows in this evidence source, including rows on other pages; not a balance or a risk assessment. Evidence may be incomplete.</p>
            {summary.totals.length ? <ul>{summary.totals.map((total) => <li key={`${total.currency}-${total.direction}`}>{total.currency} · {total.direction}: {total.amount} ({total.count} posted transaction(s))</li>)}</ul> : <p>No summarizable posted amounts match the filters.</p>}
            <p>Pending or reversed rows excluded: {summary.excluded}. Rows not summarized due to unrecognized status, currency, direction or amount: {summary.unrecognized}.</p>
            {filtered.length === 0 ? <Empty>{rows.length ? "No recorded transactions match this search." : "This evidence source contains no transaction rows."}</Empty> :
              <div style={{ overflowX: "auto" }} role="region" aria-label={`Transactions for evidence source ${source.source_ref}`} tabIndex={0}><table><caption>Transactions from this evidence source</caption><thead><tr><th scope="col">Transaction</th><th scope="col">Booked</th><th scope="col">Counterparty</th><th scope="col">Direction</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
                <tbody>{visibleRows.map((row, index) => <tr key={`${row.source_transaction_id}-${firstRow + index}`}><td>{row.source_transaction_id}</td><td>{row.booking_time}</td><td>{row.counterparty_ref ?? "Not recorded"}</td><td>{row.direction}</td><td>{row.currency} {row.amount}</td><td>{row.status}</td></tr>)}</tbody></table></div>}
            {filtered.length > 0 && <nav className="transaction-pagination" aria-label={`Transaction pages for ${source.source_ref}`}>
              <span>Showing {firstRow + 1}–{firstRow + visibleRows.length} of {filtered.length} filtered transactions · Page {currentPage} of {pageCount}</span>
              {currentPage > 1 && <Link prefetch={false} href={pageLink(currentPage - 1)}>← Previous page</Link>}
              {currentPage < pageCount && <Link prefetch={false} href={pageLink(currentPage + 1)}>Next page →</Link>}
            </nav>}
          </article>;
        })}
        <p><Link href={`/cases/${selected}/evidence`} prefetch={false}>Open complete case evidence →</Link></p>
      </>}
    </section>}
  </section>;
}
