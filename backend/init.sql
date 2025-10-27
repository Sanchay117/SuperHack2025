CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'technician',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  source TEXT,
  severity TEXT,
  summary TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  handled BOOLEAN DEFAULT FALSE
);

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  title TEXT,
  description TEXT,
  priority TEXT,
  status TEXT DEFAULT 'open',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE patch_jobs (
  id SERIAL PRIMARY KEY,
  target TEXT,
  status TEXT DEFAULT 'pending',
  plan JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE actions (
  id SERIAL PRIMARY KEY,
  type TEXT,
  payload JSONB,
  status TEXT,
  requested_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
