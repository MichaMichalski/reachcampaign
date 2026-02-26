# ReachCampaign

**Self-hosted marketing automation platform built with Next.js**

A full-featured marketing automation platform for managing contacts, building email campaigns, creating landing pages, and running visual automation workflows—all self-hosted and under your control.

### Features

- **Contact Management** — CRUD, custom fields, lead scoring, tags, import/export
- **Dynamic & Static Segmentation** — Build audiences with filters or manual lists
- **Drag-and-Drop Email Builder** — GrapesJS-powered WYSIWYG editor
- **Drag-and-Drop Landing Page Builder** — GrapesJS-powered page creation
- **Form Builder** — Create forms with submissions tracking
- **Visual Campaign Workflow Builder** — React Flow-based automation designer
- **Multi-Provider Email Delivery** — SMTP, SendGrid, AWS SES, Mailgun, Postmark
- **Domain Warmup & Health Monitoring** — Automatic warmup and bounce handling
- **Email Open & Click Tracking** — Track engagement with pixel and link tracking
- **Website Visitor Tracking** — JavaScript snippet for page views
- **Lead Scoring** — Event-based scoring rules
- **Reports & Analytics Dashboard** — Overview and email performance metrics
- **Full REST API** — Complete programmatic access
- **API Key Authentication** — Secure API access
- **Webhook Support** — Bounce/complaint webhooks from providers
- **Rate Limiting** — Protect API and sending limits

---

## Features

| Feature | Description |
|---------|-------------|
| **Contact Management** | Full CRUD, custom fields (JSON), lead scoring, tags, notes, CSV import/export |
| **Dynamic & Static Segmentation** | Dynamic segments with filters; static segments with manual member management |
| **Drag-and-Drop Email Builder** | GrapesJS with MJML support for responsive email templates |
| **Drag-and-Drop Landing Page Builder** | GrapesJS for WYSIWYG landing page creation |
| **Form Builder** | Define form fields, success messages, redirects; collect submissions |
| **Visual Campaign Workflow Builder** | React Flow-based editor for triggers, conditions, actions, delays |
| **Multi-Provider Email Delivery** | SMTP, SendGrid, AWS SES, Mailgun, Postmark with domain rotation |
| **Domain Warmup & Health Monitoring** | Gradual volume ramp, bounce/complaint tracking, auto-pause |
| **Email Open & Click Tracking** | Tracking pixel and link redirects with event logging |
| **Website Visitor Tracking** | Embeddable script for page view and custom events |
| **Lead Scoring** | Configurable rules (e.g., email open, click, page view, form submit) |
| **Reports & Analytics Dashboard** | Overview stats, email performance, Recharts visualizations |
| **Full REST API** | RESTful endpoints for all resources |
| **API Key Authentication** | `X-API-Key` header or session-based auth |
| **Webhook Support** | Incoming bounce/complaint webhooks; outgoing webhooks in workflows |
| **Rate Limiting** | Provider daily/hourly limits; domain warmup caps |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Queue/Cache** | Redis + BullMQ |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Email Builder** | GrapesJS + grapesjs-preset-newsletter |
| **Page Builder** | GrapesJS + grapesjs-preset-webpage |
| **Workflow Builder** | React Flow (@xyflow/react) |
| **Charts** | Recharts |
| **Email Sending** | Nodemailer (multi-SMTP) |
| **Deployment** | Docker + Docker Compose |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for PostgreSQL and Redis)
- npm or pnpm

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/reachcampaign.git
   cd reachcampaign
   ```

2. **Copy environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, and other values as needed.

3. **Start PostgreSQL and Redis**

   ```bash
   docker-compose up -d postgres redis
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Initialize the database**

   ```bash
   npx prisma db push
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

7. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000). On first launch you'll be prompted to create an admin account.

---

## REST API Documentation

All API endpoints use the base path `/api/v1`. Authentication is required unless noted.

**Authentication:** Send `X-API-Key: <your-api-key>` in the request header, or use a valid session cookie.

### Authentication

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| Session | NextAuth | Sign in via `/api/auth/signin` | No (for login) |

### Contacts

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/contacts` | List contacts (paginated) | Yes |
| POST | `/api/v1/contacts` | Create contact | Yes |
| GET | `/api/v1/contacts/:id` | Get contact by ID | Yes |
| PUT | `/api/v1/contacts/:id` | Update contact | Yes |
| DELETE | `/api/v1/contacts/:id` | Delete contact | Yes |
| GET | `/api/v1/contacts/:id/notes` | List contact notes | Yes |
| POST | `/api/v1/contacts/:id/notes` | Add note to contact | Yes |
| POST | `/api/v1/contacts/import` | Import contacts (CSV) | Yes |
| GET | `/api/v1/contacts/export` | Export contacts (CSV) | Yes |

### Tags

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/tags` | List tags | Yes |
| POST | `/api/v1/tags` | Create tag | Yes |
| PUT | `/api/v1/tags/:id` | Update tag | Yes |
| DELETE | `/api/v1/tags/:id` | Delete tag | Yes |

### Segments

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/segments` | List segments | Yes |
| POST | `/api/v1/segments` | Create segment | Yes |
| GET | `/api/v1/segments/:id` | Get segment | Yes |
| PUT | `/api/v1/segments/:id` | Update segment | Yes |
| DELETE | `/api/v1/segments/:id` | Delete segment | Yes |
| GET | `/api/v1/segments/:id/members` | List segment members | Yes |
| POST | `/api/v1/segments/:id/members` | Add members to segment | Yes |
| DELETE | `/api/v1/segments/:id/members` | Remove members from segment | Yes |

### Emails (Templates)

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/emails` | List email templates | Yes |
| POST | `/api/v1/emails` | Create email template | Yes |
| GET | `/api/v1/emails/:id` | Get email template | Yes |
| PUT | `/api/v1/emails/:id` | Update email template | Yes |
| DELETE | `/api/v1/emails/:id` | Delete email template | Yes |
| GET | `/api/v1/emails/:id/preview` | Preview email HTML | Yes |

### Email Campaigns

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/email-campaigns` | List email campaigns | Yes |
| POST | `/api/v1/email-campaigns` | Create and send/schedule campaign | Yes |
| GET | `/api/v1/email-campaigns/:id` | Get email campaign | Yes |
| PUT | `/api/v1/email-campaigns/:id` | Update campaign (draft/scheduled only) | Yes |
| DELETE | `/api/v1/email-campaigns/:id` | Delete campaign | Yes |

### Pages (Landing Pages)

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/pages` | List landing pages | Yes |
| POST | `/api/v1/pages` | Create landing page | Yes |
| GET | `/api/v1/pages/:id` | Get landing page | Yes |
| PUT | `/api/v1/pages/:id` | Update landing page | Yes |
| DELETE | `/api/v1/pages/:id` | Delete landing page | Yes |
| GET | `/api/v1/pages/:id/preview` | Preview page | Yes |
| POST | `/api/v1/pages/:id/publish` | Publish page | Yes |
| DELETE | `/api/v1/pages/:id/publish` | Unpublish page | Yes |

### Forms

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/forms` | List forms | Yes |
| POST | `/api/v1/forms` | Create form | Yes |
| GET | `/api/v1/forms/:id` | Get form | Yes |
| PUT | `/api/v1/forms/:id` | Update form | Yes |
| DELETE | `/api/v1/forms/:id` | Delete form | Yes |
| POST | `/api/v1/forms/:id/submit` | Submit form (public) | No |
| GET | `/api/v1/forms/:id/submissions` | List form submissions | Yes |

### Campaigns (Automation Workflows)

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/campaigns` | List automation campaigns | Yes |
| POST | `/api/v1/campaigns` | Create campaign | Yes |
| GET | `/api/v1/campaigns/:id` | Get campaign | Yes |
| PUT | `/api/v1/campaigns/:id` | Update campaign | Yes |
| DELETE | `/api/v1/campaigns/:id` | Delete campaign | Yes |
| POST | `/api/v1/campaigns/:id/start` | Start campaign | Yes |
| POST | `/api/v1/campaigns/:id/pause` | Pause campaign | Yes |
| POST | `/api/v1/campaigns/:id/stop` | Stop campaign | Yes |

### Tracking

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/tracking/script` | Get visitor tracking script | No |
| POST | `/api/v1/tracking/page` | Record page view | No |
| GET | `/api/v1/tracking/open/:id` | Email open tracking (pixel) | No |
| GET | `/api/v1/tracking/click/:id` | Email click tracking (redirect) | No |
| GET | `/api/v1/tracking/events` | List tracking events | Yes |

### Reports

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/reports/overview` | Dashboard overview stats | Yes |
| GET | `/api/v1/reports/email-performance` | Email campaign performance | Yes |

### Settings

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/settings/domains` | List sending domains | Yes |
| POST | `/api/v1/settings/domains` | Add sending domain | Yes |
| GET | `/api/v1/settings/domains/:id` | Get domain | Yes |
| PUT | `/api/v1/settings/domains/:id` | Update domain | Yes |
| DELETE | `/api/v1/settings/domains/:id` | Delete domain | Yes |
| POST | `/api/v1/settings/domains/:id/verify` | Verify domain DNS | Yes |
| GET | `/api/v1/settings/providers` | List email providers | Yes |
| POST | `/api/v1/settings/providers` | Add email provider | Yes |
| GET | `/api/v1/settings/providers/:id` | Get provider | Yes |
| PUT | `/api/v1/settings/providers/:id` | Update provider | Yes |
| DELETE | `/api/v1/settings/providers/:id` | Delete provider | Yes |
| GET | `/api/v1/settings/api-keys` | List API keys | Yes |
| POST | `/api/v1/settings/api-keys` | Create API key | Yes |
| DELETE | `/api/v1/settings/api-keys/:id` | Revoke API key | Yes |

### Webhooks

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/v1/webhooks/bounce` | Receive bounce/complaint events from providers | `X-Webhook-Secret` or `?secret=` |

### Scoring Rules

Scoring rules map event types (`EMAIL_OPEN`, `EMAIL_CLICK`, `PAGE_VIEW`, `FORM_SUBMIT`) to point values.

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/scoring-rules` | List scoring rules | Yes |
| POST | `/api/v1/scoring-rules` | Create scoring rule | Yes |
| PUT | `/api/v1/scoring-rules/:id` | Update scoring rule | Yes |
| DELETE | `/api/v1/scoring-rules/:id` | Delete scoring rule | Yes |

---

## Architecture

| Component | Role |
|-----------|------|
| **Next.js** | Serves UI (App Router) and API routes under `/api/**` |
| **PostgreSQL** | Persistent storage for contacts, campaigns, templates, logs, etc. |
| **Redis** | Job queues (BullMQ) and caching |
| **BullMQ Workers** | Process email sending, campaign automation, domain warmup jobs |
| **GrapesJS** | WYSIWYG editors for emails and landing pages |
| **React Flow** | Visual campaign workflow designer |

**Flow:**

1. Users interact with the Next.js UI and API.
2. Campaigns, emails, and automation workflows are stored in PostgreSQL.
3. Jobs (send campaign, process automation step, warmup) are queued in Redis.
4. Workers consume jobs and execute them (email sending, campaign logic, etc.).

---

## Email Deliverability

ReachCampaign includes several features to improve deliverability:

| Feature | Description |
|---------|-------------|
| **Multi-Provider Sending** | SMTP, SendGrid, AWS SES, Mailgun, Postmark |
| **Domain Rotation** | Round-Robin, Weighted, or Failover strategies |
| **Automatic Domain Warmup** | Gradual volume ramp (daily target, ramp percentage) |
| **Bounce Handling** | Hard/soft bounce detection and contact flagging |
| **Complaint Handling** | Process complaint webhooks |
| **Auto-Pause** | Pause domains/providers on high bounce/complaint rates |
| **DNS Verification** | SPF, DKIM, DMARC checks and status tracking |

Configure sending domains and providers in **Settings**, then attach domains to providers. Use the bounce webhook URL with your provider to receive delivery events.

---

## Docker Deployment

### Production with Docker Compose

1. **Clone and configure**

   ```bash
   git clone https://github.com/your-org/reachcampaign.git
   cd reachcampaign
   cp .env.example .env
   ```

2. **Set required secrets in `.env`**

   ```env
   NEXTAUTH_SECRET="your-secure-random-string"
   ENCRYPTION_KEY="your-32-char-encryption-key-here"
   ```

3. **Build and run**

   ```bash
   docker-compose up -d
   ```

   This starts:

   - **app** — Next.js app on port 3000
   - **worker** — BullMQ worker for jobs
   - **postgres** — PostgreSQL 16
   - **redis** — Redis 7

4. **Access the app**

   Open [http://localhost:3000](http://localhost:3000). On first launch you'll be prompted to create an admin account. Database migrations run automatically on startup.

### Development (Postgres + Redis only)

```bash
docker-compose up -d postgres redis
npm install
npx prisma db push
npm run dev
```

Run the worker in a separate terminal:

```bash
npm run worker
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth session encryption | Yes |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `http://localhost:3000`) | Yes |
| `ENCRYPTION_KEY` | 32-character key for encrypting sensitive data | Yes |
| `NEXT_PUBLIC_APP_URL` | Public URL for tracking script (default: `http://localhost:3000`) | No |
| `WEBHOOK_SECRET` | Secret for webhook verification (bounce/complaint) | No (recommended for production) |

---

## License

MIT License
