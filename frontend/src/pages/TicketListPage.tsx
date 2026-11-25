import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, client } from '../api';
import { useAuth } from '../auth';
import { PriorityBadge, StatusBadge, ticketLabel } from '../components/Badges';
import { Pagination } from '../components/Pagination';
import type { Priority, TicketPage, TicketStatus } from '../types';

const PAGE_SIZE = 10;

interface Filters {
  q: string;
  status: '' | TicketStatus;
  priority: '' | Priority;
  unassigned: boolean;
  breached: boolean;
}

const emptyFilters: Filters = {
  q: '',
  status: '',
  priority: '',
  unassigned: false,
  breached: false,
};

export function TicketListPage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<TicketPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (filters.q) params.set('q', filters.q);
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.unassigned) params.set('unassigned', 'true');
    if (filters.breached) params.set('slaBreached', 'true');

    let cancelled = false;
    client
      .tickets(`?${params.toString()}`)
      .then((pageResult) => {
        if (!cancelled) {
          setResult(pageResult);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load tickets');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  function apply(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters(draft);
  }

  async function runScan() {
    setScanNote(null);
    try {
      const resultScan = await client.slaScan();
      setScanNote(
        resultScan.breached === 0
          ? 'No open tickets are past their SLA.'
          : `Marked ${resultScan.breached} ticket${resultScan.breached === 1 ? '' : 's'} as breached.`,
      );
      setFilters({ ...filters });
    } catch (err) {
      setScanNote(err instanceof ApiError ? err.message : 'Scan failed');
    }
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Tickets</h1>
          <p className="muted">Newest first. Customers only show up here as requesters.</p>
        </div>
        {user?.role === 'admin' && (
          <button type="button" onClick={runScan}>
            Run SLA check
          </button>
        )}
      </header>
      {scanNote && <p className="note">{scanNote}</p>}
      {error && <p className="error">{error}</p>}

      <form className="filters" onSubmit={apply}>
        <input
          placeholder="Search title or description"
          value={draft.q}
          onChange={(event) => setDraft({ ...draft, q: event.target.value })}
        />
        <select
          value={draft.status}
          onChange={(event) => setDraft({ ...draft, status: event.target.value as Filters['status'] })}
        >
          <option value="">Any status</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={draft.priority}
          onChange={(event) => setDraft({ ...draft, priority: event.target.value as Filters['priority'] })}
        >
          <option value="">Any priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.unassigned}
            onChange={(event) => setDraft({ ...draft, unassigned: event.target.checked })}
          />
          Unassigned
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.breached}
            onChange={(event) => setDraft({ ...draft, breached: event.target.checked })}
          />
          SLA breached
        </label>
        <button type="submit">Apply</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Requester</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>SLA due</th>
            </tr>
          </thead>
          <tbody>
            {result?.data.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link to={`/tickets/${ticket.id}`}>
                    <span className="mono">{ticketLabel(ticket.ticketNumber)}</span> {ticket.title}
                  </Link>
                  {ticket.slaBreachedAt && <span className="badge breach">breached</span>}
                </td>
                <td>{ticket.requester?.name}</td>
                <td>
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                <td>{ticket.assignee?.name ?? '—'}</td>
                <td>{new Date(ticket.slaDueAt).toLocaleString()}</td>
              </tr>
            ))}
            {result && result.data.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No tickets match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {result && (
        <Pagination
          page={result.meta.page}
          limit={result.meta.limit}
          total={result.meta.total}
          totalPages={result.meta.totalPages}
          onPage={setPage}
        />
      )}
    </section>
  );
}
