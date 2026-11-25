import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, client } from '../api';
import { PriorityBadge, StatusBadge, ticketLabel } from '../components/Badges';
import type { Assignment, Comment, Priority, Ticket, TicketStatus, User } from '../types';

export function TicketDetailPage() {
  const { id = '' } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<Assignment[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([client.ticket(id), client.comments(id), client.assignments(id), client.users()])
      .then(([nextTicket, nextComments, nextHistory, nextStaff]) => {
        if (cancelled) return;
        setTicket(nextTicket);
        setComments(nextComments);
        setHistory(nextHistory);
        setStaff(nextStaff.filter((person) => person.role !== 'customer'));
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load this ticket');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  }

  function changeStatus(status: TicketStatus) {
    return run(async () => {
      setTicket(await client.updateTicket(id, { status }));
    });
  }

  function changePriority(priority: Priority) {
    return run(async () => {
      setTicket(await client.updateTicket(id, { priority }));
    });
  }

  function changeAssignee(assigneeId: string) {
    return run(async () => {
      if (!assigneeId || !ticket || assigneeId === ticket.assigneeId) return;
      await client.assign(id, assigneeId);
      const [updated, nextHistory] = await Promise.all([client.ticket(id), client.assignments(id)]);
      setTicket(updated);
      setHistory(nextHistory);
    });
  }

  function addComment(event: FormEvent) {
    event.preventDefault();
    return run(async () => {
      const created = await client.addComment(id, body, internal);
      setComments((current) => [...current, created]);
      setBody('');
      setInternal(false);
    });
  }

  if (!ticket && error) {
    return <p className="error">{error}</p>;
  }
  if (!ticket) {
    return <p className="muted">Loading ticket…</p>;
  }

  return (
    <section>
      <p className="crumb">
        <Link to="/">Tickets</Link> / <span className="mono">{ticketLabel(ticket.ticketNumber)}</span>
      </p>
      {error && <p className="error">{error}</p>}
      <header className="page-head">
        <div>
          <h1>{ticket.title}</h1>
          <div className="row-gap">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            {ticket.slaBreachedAt && <span className="badge breach">SLA breached</span>}
          </div>
        </div>
      </header>

      <div className="detail-grid">
        <article className="card">
          <p className="description">{ticket.description}</p>
          <dl className="meta">
            <div>
              <dt>Requester</dt>
              <dd>
                {ticket.requester.name}
                <span className="muted"> {ticket.requester.email}</span>
              </dd>
            </div>
            <div>
              <dt>Opened</dt>
              <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>SLA due</dt>
              <dd>{new Date(ticket.slaDueAt).toLocaleString()}</dd>
            </div>
          </dl>
        </article>

        <aside className="card">
          <label>
            Status
            <select value={ticket.status} onChange={(event) => void changeStatus(event.target.value as TicketStatus)}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="waiting">Waiting</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label>
            Priority
            <select value={ticket.priority} onChange={(event) => void changePriority(event.target.value as Priority)}>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            Assignee
            <select
              value={ticket.assigneeId ?? ''}
              onChange={(event) => void changeAssignee(event.target.value)}
            >
              <option value="">Unassigned</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} ({person.role})
                </option>
              ))}
            </select>
          </label>
          {history.length > 0 && (
            <ol className="history">
              {history.map((row) => (
                <li key={row.id}>
                  {row.assignedBy.name} assigned {row.assignee.name}
                  <span className="muted"> {new Date(row.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      <h2>Comments</h2>
      <ul className="comments">
        {comments.map((comment) => (
          <li key={comment.id} className={comment.internal ? 'internal' : ''}>
            <div className="comment-head">
              <strong>{comment.author.name}</strong>
              {comment.internal && <span className="badge">internal</span>}
              <span className="muted">{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p>{comment.body}</p>
          </li>
        ))}
        {comments.length === 0 && <li className="muted">No comments yet.</li>}
      </ul>

      <form className="card comment-form" onSubmit={(event) => void addComment(event)}>
        <label>
          Add a comment
          <textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={4} />
        </label>
        <label className="check">
          <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
          Internal note (hidden from the customer)
        </label>
        <button type="submit">Post</button>
      </form>
    </section>
  );
}
