require('dotenv').config();
const pool = require('./pool');
const { hashPassword } = require('../services/auth');

const DEMO_PASSWORD = 'Demo@1234';

const DEPARTMENTS = ['Finance', 'Engineering', 'Sales', 'Support', 'Human Resources'];

// Order matters: Sara Khan must exist before Aarav Mehta references her as manager.
const EMPLOYEES = [
  {
    email: 'sara.khan@paylogic.demo',
    role: 'hr_manager',
    name: 'Sara Khan',
    department: 'Human Resources',
    job_position: 'HR Officer',
    manager: null,
  },
  {
    email: 'aarav.mehta@paylogic.demo',
    role: 'hr_payroll_user',
    name: 'Aarav Mehta',
    department: 'Finance',
    job_position: 'Payroll Specialist',
    manager: 'Sara Khan',
  },
  {
    email: 'john.dsouza@paylogic.demo',
    role: 'employee',
    name: 'John Dsouza',
    department: 'Engineering',
    job_position: 'Developer',
    manager: null,
  },
  {
    email: 'neha.patel@paylogic.demo',
    role: 'hr_payroll_manager',
    name: 'Neha Patel',
    department: 'Sales',
    job_position: 'Recruiter',
    manager: null,
  },
  {
    email: 'priya.sharma@paylogic.demo',
    role: 'admin',
    name: 'Priya Sharma',
    department: 'Human Resources',
    job_position: 'System Administrator',
    manager: null,
  },
];

async function upsertDepartment(name) {
  const { rows } = await pool.query('SELECT id FROM departments WHERE name = $1', [name]);
  if (rows[0]) return rows[0].id;
  const inserted = await pool.query(
    'INSERT INTO departments (name) VALUES ($1) RETURNING id',
    [name]
  );
  return inserted.rows[0].id;
}

async function upsertUser(email, role) {
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows[0]) return rows[0].id;
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const inserted = await pool.query(
    'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
    [email, passwordHash, role]
  );
  return inserted.rows[0].id;
}

async function upsertEmployee({ userId, name, departmentId, jobPosition, managerId }) {
  const { rows } = await pool.query('SELECT id FROM employees WHERE name = $1', [name]);
  if (rows[0]) return rows[0].id;
  const inserted = await pool.query(
    `INSERT INTO employees (user_id, name, department_id, manager_id, job_position)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, name, departmentId, managerId, jobPosition]
  );
  return inserted.rows[0].id;
}

async function seed() {
  console.log('Seeding departments...');
  const departmentIds = {};
  for (const name of DEPARTMENTS) {
    departmentIds[name] = await upsertDepartment(name);
  }

  console.log('Seeding demo users + employees...');
  const employeeIdsByName = {};
  for (const emp of EMPLOYEES) {
    const userId = await upsertUser(emp.email, emp.role);
    const managerId = emp.manager ? employeeIdsByName[emp.manager] ?? null : null;
    const employeeId = await upsertEmployee({
      userId,
      name: emp.name,
      departmentId: departmentIds[emp.department],
      jobPosition: emp.job_position,
      managerId,
    });
    employeeIdsByName[emp.name] = employeeId;
  }

  console.log('\nSeed complete. Demo logins (all share one password):');
  console.log(`  Password: ${DEMO_PASSWORD}`);
  for (const emp of EMPLOYEES) {
    console.log(`  ${emp.email}  (${emp.role})`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
