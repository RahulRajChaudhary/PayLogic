
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

CREATE SEQUENCE employee_code_seq START 1;

-- working_schedule_id is added later, once working_schedules exists (its own build session)

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  employee_code TEXT UNIQUE NOT NULL DEFAULT ('EMP-' || LPAD(nextval('employee_code_seq')::text, 4, '0')),
  name TEXT NOT NULL,
  department_id INT REFERENCES departments(id),
  manager_id INT REFERENCES employees(id),
  job_position TEXT,
  employee_type TEXT DEFAULT 'full_time' CHECK (employee_type IN ('full_time', 'part_time', 'contract')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  work_email TEXT,
  work_phone TEXT,
  private_email TEXT,
  private_phone TEXT,
  home_address TEXT,
  home_city TEXT,
  home_state TEXT,
  home_country TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
  working_schedule TEXT,
  expected_start_time TIME DEFAULT '09:00:00',
  expected_end_time TIME DEFAULT '18:00:00',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE employee_tags (
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, tag_id)
);

CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) NOT NULL,
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP,
  worked_hours NUMERIC(5,2),
  is_late BOOLEAN DEFAULT FALSE,
  is_overtime BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX attendance_one_open_per_employee
  ON attendance (employee_id) WHERE check_out IS NULL;

CREATE TABLE time_off_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  requires_allocation BOOLEAN DEFAULT TRUE
);

CREATE TABLE time_off_allocations (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) NOT NULL,
  type_id INT REFERENCES time_off_types(id) NOT NULL,
  allocated NUMERIC(6,2) NOT NULL,
  taken NUMERIC(6,2) DEFAULT 0,
  UNIQUE (employee_id, type_id)
);

CREATE TABLE time_off_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) NOT NULL,
  type_id INT REFERENCES time_off_types(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration NUMERIC(6,2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'refused', 'cancelled')),
  created_at TIMESTAMP DEFAULT now()
);

INSERT INTO time_off_types (name, requires_allocation) VALUES
  ('Annual Leave', TRUE),
  ('Sick Leave', TRUE),
  ('Casual Leave', TRUE);

-- salary_structure_id is added later, once salary_structures exists (Salary Rule Engine build session)

CREATE SEQUENCE contract_code_seq START 1;

CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  contract_code TEXT UNIQUE NOT NULL DEFAULT ('CON-' || LPAD(nextval('contract_code_seq')::text, 4, '0')),
  employee_id INT REFERENCES employees(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  wage NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMP DEFAULT now()
);
