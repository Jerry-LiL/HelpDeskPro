# HelpDeskPro

Support ticketing for a small team. Customers open tickets through the API. Agents and admins work the queue from a React console: paginated lists, assignments, comments, and SLA breaches.

The API is a NestJS service. PostgreSQL stores the tickets. Redis backs two BullMQ queues, one for email and one for SLA scans. Swagger documents every route.

## Features

- Accounts with three roles: customer, agent, and admin. Public registration creates a customer. An admin promotes people afterward.
- Passport JWT login. Role guards sit on the agent and admin routes.
- Tickets with priority, status, comments, and an assignment history.
- Customers only see their own tickets. A ticket they do not own comes back as not found.
- Internal notes are stored with the ticket and omitted from customer responses.
- Email (ticket opened, updated, commented, assigned, SLA breached) is queued on BullMQ instead of being sent inside the request.
- A repeatable BullMQ job scans for open tickets past their SLA deadline. An admin can run the same check immediately.
- Offset pagination, plus filters for status, priority, assignee, unassigned tickets, breached tickets, and free text.
- Swagger UI at `/docs`.

## Architecture

```mermaid
flowchart LR
  console[React agent console] --> api[NestJS API]
  api --> pg[(PostgreSQL)]
  api --> queues[BullMQ]
  queues --> redis[(Redis)]
  queues --> workers[Email and SLA workers]
  workers --> pg
  workers --> smtp[SMTP or local log]
```

The workers live in the same Nest process as the HTTP server. That is enough for one node. If you run more than one API process, BullMQ still takes each email job once, and the repeatable SLA scan is registered once in Redis. The scan also locks the overdue rows so two overlapping runs cannot breach the same ticket twice.

SLA time starts when the ticket is created:

| Priority | Window |
| --- | --- |
| urgent | 1 hour |
| high | 8 hours |
| medium | 24 hours |
| low | 72 hours |

Changing priority recomputes the deadline from the original creation time. If the new deadline is still in the future, a previous breach flag is cleared. Resolved and closed tickets are left out of the scan. Assigning an open ticket moves it to in progress.

## Folder structure

```
backend/                 NestJS API
  src/auth/              register, login, JWT strategy
  src/users/             profiles and role changes
  src/tickets/           ticket list, create, update
  src/comments/          public comments and internal notes
  src/assignments/       assignee changes and history
  src/notifications/     BullMQ email queue, SMTP mailer, send log
  src/sla/               policy, scan, repeatable job
  src/seed.ts            local sample data
  test/                  Jest and Supertest coverage
frontend/                React agent console
docker-compose.yml       Postgres, Redis, Mailhog, optional API and web
.github/workflows/ci.yml lint, test, and build
```

## Running locally

You need Node 22, PostgreSQL 16, and Redis. Docker Compose is the shortest path to the databases:

```bash
docker compose up -d postgres redis mailhog
cp .env.example .env
```

Put a real `JWT_SECRET` in `.env`. `WEB_ORIGIN` is the console origin, or a comma-separated list if you have more than one. `localhost` and `127.0.0.1` are treated as the same host, so either URL can sign in. Leave `SMTP_HOST` empty to log mail on the API process. To deliver mail, set `SMTP_HOST=localhost` and `SMTP_PORT=1025`, then open Mailhog at http://localhost:8025.

Create the database if you are not using the Compose Postgres (the Compose service creates `helpdesk` for you):

```bash
createuser helpdesk --pwprompt
createdb -O helpdesk helpdesk
```

```bash
cd backend
npm install
npm run seed
npm run start:dev
```

Seeded passwords are `password123` for:

- `admin@helpdesk.local`
- `agent@helpdesk.local`
- `agent2@helpdesk.local`
- `customer@helpdesk.local`

The API listens on http://localhost:3000. Interactive docs are at http://localhost:3000/docs.

```bash
cd frontend
npm install
npm run dev
```

The console is at http://localhost:5173. It talks to `VITE_API_URL` or `http://localhost:3000`.

`docker compose up --build` also builds the API and the console image. The browser still calls the API on `localhost:3000`, and the web container is published on port 5173.

## Tests

Jest covers the SLA window math and the local mailer. Supertest boots the Nest app against Postgres and Redis and walks registration, role guards, pagination, comments, assignments, the email queue, and the SLA scan.

```bash
# once, if the test database does not exist yet
createdb -O helpdesk helpdesk_test

cd backend
npm test
npm run lint
npm run build

cd ../frontend
npm run build
```

`backend` tests read `DATABASE_URL` and `REDIS_URL`. When those are unset they use `postgres://helpdesk:helpdesk@localhost:5432/helpdesk_test` and `redis://127.0.0.1:6379`. SMTP is forced off, so the suite never sends real mail. CI runs the same commands with Postgres and Redis service containers. See `.github/workflows/ci.yml`.

## Design decisions

- Registration cannot create an admin. The first admin comes from `npm run seed`, and further admins are promotions. An admin cannot change their own role, and the last admin cannot be demoted.
- Passwords are hashed with bcryptjs so the API does not need a native build toolchain.
- The JWT is checked on each request and the user is loaded from the database, so a role change applies before the token expires. The console keeps the token in `localStorage`.
- Customers receive `404` for tickets they do not own, rather than a response that confirms the id exists.
- Offset pagination is what the agent console needs. The list endpoint returns `page`, `limit`, `total`, and `totalPages`.
- Outbound mail is a BullMQ job with three attempts and exponential backoff. After a successful send (or a local log, when SMTP is not configured) the worker writes a row to `notifications`. That table is the send log.
- `SYNCHRONIZE=true` makes TypeORM create tables from the entities on boot. That keeps local setup small. Set it to `false` before you point this at a database you cannot rebuild, and ship migrations at that point.
- There is no customer portal in the console. Customers use the HTTP API. The UI is the agent queue the product is named for.
