# The Ninjas — Setup Guide

## Quick Start

### 1. Database Setup

First, ensure PostgreSQL is running and create the database:

```bash
# Create database
createdb the_ninjas

# Or using psql:
psql -U postgres
CREATE DATABASE the_ninjas;
\q
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies (already done)
npm install

# Create .env file
cat > .env << EOF
PORT=4000
DATABASE_URL=postgresql://localhost:5432/the_ninjas
JWT_SECRET=your-secret-key-change-in-production-abc123
EOF

# Initialize database schema
psql -U postgres -d the_ninjas -f init.sql

# Start backend server
npm start

# Or for development with auto-reload:
npm run dev
```

The backend will run on http://localhost:4000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies (already done)
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_BASE=http://localhost:4000" > .env.local

# Start development server
npm run dev
```

The frontend will run on http://localhost:3000

## 🎯 Usage

### First Time Setup

1. Open http://localhost:3000
2. Click "Get Started" or "Sign In"
3. Register a new account (default role: technician)
4. You'll be redirected to the Dashboard

### User Roles

**Technician (default)**: Can view alerts, tickets, agents, patch jobs, analytics, and settings
**Admin**: All technician permissions + user management

### Creating Admin User

To create an admin user, register from the frontend then update the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Or use the backend register endpoint with role parameter:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password","name":"Admin","role":"admin"}'
```

## 🧪 Testing

To run frontend tests:

```bash
cd frontend
npm test
```

## 📊 Sample Data

You can create sample alerts and tickets using the SQL commands:

```sql
-- Insert sample alert
INSERT INTO alerts (source, severity, summary, details)
VALUES ('uptime-monitor', 'critical', 'Host gen-12 unreachable', '{"ip":"10.0.0.12","error":"timeout"}');

-- Insert sample ticket
INSERT INTO tickets (title, description, priority, created_by, status)
VALUES ('Investigate host gen-12', 'Auto-created from alert', 'high', 1, 'open');
```

## 🔧 Troubleshooting

### Backend won't start

-   Check PostgreSQL is running: `pg_isready`
-   Verify DATABASE_URL in backend/.env is correct
-   Check if port 4000 is available

### Frontend API errors

-   Ensure backend is running on port 4000
-   Check NEXT_PUBLIC_API_BASE in frontend/.env.local
-   Look for CORS issues in browser console

### Socket.IO not connecting

-   Ensure backend is running with Socket.IO enabled
-   Check browser console for connection errors
-   Verify NEXT_PUBLIC_API_BASE points to correct backend URL

## 🚀 Production Deployment

For production deployment:

1. Set strong JWT_SECRET in backend/.env
2. Use environment-specific database URLs
3. Configure proper CORS origins
4. Build frontend: `cd frontend && npm run build`
5. Start production servers:
    - Backend: `cd backend && npm start`
    - Frontend: `cd frontend && npm start`

## 📦 Project Structure

```
SuperHack/
├── backend/
│   ├── index.js          # Express + Socket.IO server
│   ├── init.sql          # Database schema
│   ├── package.json
│   └── .env              # Environment config
├── frontend/
│   ├── pages/            # Next.js routes
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── lib/             # Utilities
│   └── styles/           # CSS
├── README.md
└── SETUP.md             # This file
```

## ✅ Features Implemented

-   ✅ JWT Authentication (Login/Register)
-   ✅ Role-based access control (Admin/Technician/User)
-   ✅ Real-time updates via Socket.IO
-   ✅ Dashboard with live metrics
-   ✅ Alerts management with filtering
-   ✅ Ticket creation and tracking
-   ✅ Agent action submission
-   ✅ Patch job management
-   ✅ Analytics dashboard with charts
-   ✅ User management (admin only)
-   ✅ Settings and webhook config
-   ✅ Responsive UI with Tailwind CSS
-   ✅ Error handling and toast notifications
-   ✅ Basic testing setup

## 🎨 Tech Stack

**Frontend:**

-   Next.js 14 (React 18)
-   Tailwind CSS
-   Socket.IO Client
-   Recharts
-   React Hot Toast
-   Jest + Testing Library

**Backend:**

-   Node.js + Express
-   PostgreSQL
-   Socket.IO
-   JWT Authentication
-   Bcrypt for password hashing

Enjoy building with The Ninjas! 🥷
