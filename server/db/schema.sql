
CREATE TABLE company (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin')) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);


CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- working_schedule_id is added later, once working_schedules exists (its own build session)

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  name TEXT NOT NULL,
  department_id INT REFERENCES departments(id),
  manager_id INT REFERENCES employees(id),
  job_position TEXT,
  employee_type TEXT DEFAULT 'full_time' CHECK (employee_type IN ('full_time', 'part_time', 'contract')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT now()
);
