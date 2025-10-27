# The Ninjas — Agentic IT Co-Pilot

An AI-powered IT operations assistant that autonomously detects system issues, creates actionable tickets, and recommends or executes fixes — so human technicians focus only on judgment, not routine firefighting.

## 🚀 Quick Start

### Prerequisites

-   Node.js 18+ and npm
-   PostgreSQL database

### Backend Setup

```bash
cd backend
npm install

# Create PostgreSQL database
createdb the_ninjas

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
psql -U postgres -d the_ninjas -f init.sql

# Start backend server
npm start
# or for development:
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Create environment file
echo "NEXT_PUBLIC_API_BASE=http://localhost:4000" > .env.local

# Start frontend dev server
npm run dev
```

Visit http://localhost:3000

## 🎯 Features

### MVP (Completed)

-   ✅ JWT-based authentication with role management
-   ✅ Real-time updates via Socket.IO
-   ✅ Dashboard with live alert/ticket counts
-   ✅ Alerts management with filtering
-   ✅ Ticket creation and tracking
-   ✅ Agent action submission
-   ✅ Patch job management
-   ✅ Responsive UI with Tailwind CSS

### v1 Features

-   ✅ Analytics dashboard with charts
-   ✅ User management (admin)
-   ✅ Settings and webhook configuration
-   ✅ Error handling and toast notifications

## 👥 User Roles

-   **Admin**: Full access to all features including user management
-   **Technician**: Access to alerts, tickets, agents, and analytics
-   **User**: Basic read access

## 🔧 Tech Stack

**Frontend:**

-   Next.js 14
-   React 18
-   Tailwind CSS
-   Socket.IO Client
-   Recharts
-   React Hot Toast

**Backend:**

-   Node.js + Express
-   PostgreSQL
-   Socket.IO
-   JWT Authentication

## 📁 Project Structure

```
SuperHack/
├── backend/
│   ├── index.js          # Express server with Socket.IO
│   ├── init.sql          # Database schema
│   └── package.json
├── frontend/
│   ├── pages/            # Next.js pages
│   │   ├── dashboard.js
│   │   ├── alerts.js
│   │   ├── tickets.js
│   │   └── ...
│   ├── components/       # Reusable components
│   ├── contexts/         # React contexts
│   ├── lib/             # Utilities
│   └── styles/           # CSS
└── README.md
```

## 🧪 Testing

```bash
cd frontend
npm test
```

## 📖 API Endpoints

### Auth

-   `POST /api/auth/login` - Login
-   `POST /api/auth/register` - Register

### Alerts

-   `GET /api/alerts` - List alerts (with filters)
-   `POST /api/alerts` - Create alert

### Tickets

-   `GET /api/tickets` - List tickets
-   `POST /api/tickets` - Create ticket
-   `PATCH /api/tickets/:id` - Update ticket

### Agents

-   `POST /api/agents/act` - Submit action
-   `GET /api/actions` - List actions

### Patch Jobs

-   `GET /api/patch_jobs` - List patch jobs
-   `POST /api/patch_jobs` - Create patch job

### Admin

-   `GET /api/users` - List users (admin only)

## 🔌 Socket Events

-   `alert:created` - New alert received
-   `ticket:created` - New ticket created
-   `action:updated` - Agent action status updated

## 📝 License

MIT
