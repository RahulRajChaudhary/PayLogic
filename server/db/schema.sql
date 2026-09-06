
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

CREATE TABLE working_schedules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- weekly hours are NEVER stored — always summed from schedule_lines on read
CREATE TABLE schedule_lines (
  id SERIAL PRIMARY KEY,
  schedule_id INT REFERENCES working_schedules(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INT NOT NULL DEFAULT 0
);

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
  working_schedule_id INT REFERENCES working_schedules(id),
  expected_start_time TIME DEFAULT '09:00:00',
  expected_end_time TIME DEFAULT '18:00:00',
  bank_account TEXT,
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
  requires_allocation BOOLEAN DEFAULT TRUE,
  unit TEXT NOT NULL DEFAULT 'day' CHECK (unit IN ('day', 'hour')),
  approval TEXT NOT NULL DEFAULT 'manager' CHECK (approval IN ('manager', 'officer')),
  color TEXT NOT NULL DEFAULT 'blue'
);

CREATE TABLE time_off_allocations (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) NOT NULL,
  type_id INT REFERENCES time_off_types(id) NOT NULL,
  allocated NUMERIC(6,2) NOT NULL,
  taken NUMERIC(6,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'refused')),
  approver_id INT REFERENCES employees(id),
  valid_from DATE,
  valid_to DATE,
  description TEXT,
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

CREATE TABLE salary_structures (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE salary_rules (
  id SERIAL PRIMARY KEY,
  structure_id INT REFERENCES salary_structures(id) NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT CHECK (category IN ('basic', 'allowance', 'gross', 'deduction', 'net')) NOT NULL,
  sequence INT NOT NULL,
  computation_method TEXT CHECK (computation_method IN ('fixed', 'percentage', 'formula')) NOT NULL,
  amount NUMERIC(12,2),
  percentage NUMERIC(5,2),
  percentage_of_code TEXT,
  formula TEXT,
  UNIQUE (structure_id, code)
);

CREATE SEQUENCE contract_code_seq START 1;\



CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  contract_code TEXT UNIQUE NOT NULL DEFAULT ('CON-' || LPAD(nextval('contract_code_seq')::text, 4, '0')),
  employee_id INT REFERENCES employees(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  wage NUMERIC(12,2) NOT NULL,
  salary_structure_id INT REFERENCES salary_structures(id),
  department_id INT REFERENCES departments(id),
  job_position TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE payruns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  structure_id INT REFERENCES salary_structures(id) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'computed', 'validated', 'paid')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE payslips (
  id SERIAL PRIMARY KEY,
  payrun_id INT REFERENCES payruns(id) NOT NULL,
  employee_id INT REFERENCES employees(id) NOT NULL,
  contract_id INT REFERENCES contracts(id),
  worked_days NUMERIC(5,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'computed', 'validated', 'paid')),
  warnings TEXT[] DEFAULT '{}',
  sent_at TIMESTAMP,
  UNIQUE (payrun_id, employee_id)
);

CREATE TABLE payslip_lines (
  id SERIAL PRIMARY KEY,
  payslip_id INT REFERENCES payslips(id) NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL
);
