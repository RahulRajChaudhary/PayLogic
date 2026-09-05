require('dotenv').config();
const pool = require('./pool');
const { hashPassword } = require('../services/auth');
const { ensureDefaultAllocations, listTypes, createRequest, approveRequest, refuseRequest } = require('../services/timeOff');
const { checkIn } = require('../services/attendance');

const DEMO_PASSWORD = 'Demo@1234';

const DEPARTMENTS = ['Finance', 'Engineering', 'Sales', 'Support', 'Human Resources'];

const TAGS = ['Remote', 'Team Lead', 'New Hire'];

// Generic insert/update helpers for seed data — plain objects in, no manual $1/$2
// counting. Safe here because seed.js only ever writes literal values (no COALESCE
// defaults, no computed SQL expressions, no transactions) — the real service files
// keep explicit SQL because they need those things.
async function insertRow(table, data, { onConflict, returning = '*' } = {}) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const conflictClause = onConflict ? ` ON CONFLICT ${onConflict}` : '';
  const { rows } = await pool.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})${conflictClause} RETURNING ${returning}`,
    values
  );
  return rows[0];
}

async function updateRow(table, id, data) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  await pool.query(`UPDATE ${table} SET ${setClause} WHERE id = $${columns.length + 1}`, [...values, id]);
}

// Order matters: Sara Khan must exist before others reference her as manager.
const EMPLOYEES = [
  {
    email: 'sara.khan@paylogic.demo',
    role: 'hr_manager',
    name: 'Sara Khan',
    department: 'Human Resources',
    job_position: 'HR Officer',
    manager: null,
    work_email: 'sara.khan@company.com',
    work_phone: '+91-98200-11223',
    private_email: 'sara.khan.personal@gmail.com',
    private_phone: '+91-98200-99887',
    home_address: '12 Marine Drive',
    home_city: 'Mumbai',
    home_state: 'Maharashtra',
    home_country: 'India',
    date_of_birth: '1990-04-12',
    gender: 'female',
    marital_status: 'married',
    tags: [],
  },
  {
    email: 'aarav.mehta@paylogic.demo',
    role: 'hr_payroll_user',
    name: 'Aarav Mehta',
    department: 'Finance',
    job_position: 'Payroll Specialist',
    manager: 'Sara Khan',
    work_email: 'aarav.mehta@company.com',
    work_phone: '+91-98450-22334',
    private_email: 'aarav.mehta.personal@gmail.com',
    private_phone: '+91-98450-88776',
    home_address: '45 MG Road',
    home_city: 'Bengaluru',
    home_state: 'Karnataka',
    home_country: 'India',
    date_of_birth: '1993-08-23',
    gender: 'male',
    marital_status: 'single',
    tags: ['Team Lead'],
  },
  {
    email: 'john.dsouza@paylogic.demo',
    role: 'employee',
    name: 'John Dsouza',
    department: 'Engineering',
    job_position: 'Developer',
    manager: null,
    work_email: 'john.dsouza@company.com',
    work_phone: '+91-99870-33445',
    private_email: 'john.dsouza.personal@gmail.com',
    private_phone: '+91-99870-77665',
    home_address: '7 FC Road',
    home_city: 'Pune',
    home_state: 'Maharashtra',
    home_country: 'India',
    date_of_birth: '1996-01-15',
    gender: 'male',
    marital_status: 'single',
    tags: ['New Hire'],
  },
  {
    email: 'neha.patel@paylogic.demo',
    role: 'hr_payroll_manager',
    name: 'Neha Patel',
    department: 'Sales',
    job_position: 'Recruiter',
    manager: null,
    work_email: 'neha.patel@company.com',
    work_phone: '+91-97110-44556',
    private_email: 'neha.patel.personal@gmail.com',
    private_phone: '+91-97110-66554',
    home_address: '29 Connaught Place',
    home_city: 'New Delhi',
    home_state: 'Delhi',
    home_country: 'India',
    date_of_birth: '1988-11-02',
    gender: 'female',
    marital_status: 'married',
    tags: [],
  },
  {
    email: 'priya.sharma@paylogic.demo',
    role: 'admin',
    name: 'Priya Sharma',
    department: 'Human Resources',
    job_position: 'System Administrator',
    manager: null,
    work_email: 'priya.sharma@company.com',
    work_phone: '+91-96000-55667',
    private_email: 'priya.sharma.personal@gmail.com',
    private_phone: '+91-96000-77889',
    home_address: '18 Anna Salai',
    home_city: 'Chennai',
    home_state: 'Tamil Nadu',
    home_country: 'India',
    date_of_birth: '1991-06-30',
    gender: 'female',
    marital_status: 'single',
    tags: [],
  },
  {
    email: 'meera.joshi@paylogic.demo',
    role: 'employee',
    name: 'Meera Joshi',
    department: 'Support',
    job_position: 'Support Engineer',
    manager: 'Sara Khan',
    work_email: 'meera.joshi@company.com',
    work_phone: '+91-95050-66778',
    private_email: 'meera.joshi.personal@gmail.com',
    private_phone: '+91-95050-88990',
    home_address: '3 Banjara Hills',
    home_city: 'Hyderabad',
    home_state: 'Telangana',
    home_country: 'India',
    date_of_birth: '1998-03-19',
    gender: 'female',
    marital_status: 'single',
    tags: ['Remote'],
  },
];

async function upsertDepartment(name) {
  const { rows } = await pool.query('SELECT id FROM departments WHERE name = $1', [name]);
  if (rows[0]) return rows[0].id;
  const row = await insertRow('departments', { name }, { returning: 'id' });
  return row.id;
}

async function upsertTag(name) {
  const { rows } = await pool.query('SELECT id FROM tags WHERE name = $1', [name]);
  if (rows[0]) return rows[0].id;
  const row = await insertRow('tags', { name }, { returning: 'id' });
  return row.id;
}

async function upsertUser(email, role) {
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows[0]) return rows[0].id;
  const password_hash = await hashPassword(DEMO_PASSWORD);
  const row = await insertRow('users', { email, password_hash, role }, { returning: 'id' });
  return row.id;
}

async function upsertEmployee({ userId, name, departmentId, jobPosition, managerId }) {
  const { rows } = await pool.query('SELECT id FROM employees WHERE name = $1', [name]);
  if (rows[0]) return rows[0].id;
  const row = await insertRow(
    'employees',
    { user_id: userId, name, department_id: departmentId, manager_id: managerId, job_position: jobPosition },
    { returning: 'id' }
  );
  return row.id;
}

// Backfills profile fields on an employee row regardless of whether it was just inserted
// or already existed from an earlier seed run — safe to re-run, always sets the same
// deterministic demo values.
async function fillEmployeeProfile(employeeId, emp) {
  await updateRow('employees', employeeId, {
    work_email: emp.work_email,
    work_phone: emp.work_phone,
    private_email: emp.private_email,
    private_phone: emp.private_phone,
    home_address: emp.home_address,
    home_city: emp.home_city,
    home_state: emp.home_state,
    home_country: emp.home_country,
    date_of_birth: emp.date_of_birth,
    gender: emp.gender,
    marital_status: emp.marital_status,
  });
}

async function assignTags(employeeId, tagNames, tagIdsByName) {
  for (const tagName of tagNames) {
    await insertRow(
      'employee_tags',
      { employee_id: employeeId, tag_id: tagIdsByName[tagName] },
      { onConflict: 'DO NOTHING', returning: 'employee_id' }
    );
  }
}

function pastWeekdays(count, beforeDate) {
  const days = [];
  const cursor = new Date(beforeDate);
  cursor.setDate(cursor.getDate() - 1); // start from yesterday
  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse(); // oldest first
}

async function backdateEmployeeCreatedAt(employeeId, daysAgo) {
  await pool.query(
    `UPDATE employees SET created_at = now() - ($2 || ' days')::interval
     WHERE id = $1 AND created_at > now() - ($2 || ' days')::interval`,
    [employeeId, daysAgo]
  );
}

// Seeds 3 weeks of realistic attendance history so the demo isn't showing an empty
// table: mostly on-time, one late day, one overtime day, one day left with no row
// at all so the read-time absence detection has something to surface. variant shifts
// which historical day gets the late/overtime/absent treatment, so multiple employees
// seeded this way don't all show identical patterns on the same dates.
async function seedAttendanceHistory(employeeId, variant = 0) {
  const { rows: existing } = await pool.query(
    'SELECT id FROM attendance WHERE employee_id = $1 LIMIT 1',
    [employeeId]
  );
  if (existing.length > 0) return;

  await backdateEmployeeCreatedAt(employeeId, 25);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = pastWeekdays(15, today);

  // Place the varied days near the end of the range (closest to today) so they land
  // within whatever month the Attendance page defaults to, instead of scrolling off
  // into the previous month. `variant` staggers which day each employee's exceptions
  // fall on, so a multi-employee day-view isn't showing the exact same story for everyone.
  const n = days.length;
  const absentIndex = n - 3 - variant;
  const lateIndex = n - 2 - variant;
  const overtimeIndex = n - 1 - variant;

  for (let i = 0; i < n; i++) {
    if (i === absentIndex) continue; // deliberately absent

    const day = days[i];
    let checkInHour = 9;
    let checkInMinute = 2;
    let checkOutHour = 18;
    let checkOutMinute = 4;

    if (i === lateIndex) checkInMinute = 22;
    if (i === overtimeIndex) {
      checkOutHour = 20;
      checkOutMinute = 15;
    }

    const checkInAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), checkInHour, checkInMinute);
    const checkOutAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), checkOutHour, checkOutMinute);
    const workedHours = Math.round(((checkOutAt - checkInAt) / 3600000) * 100) / 100;

    await insertRow('attendance', {
      employee_id: employeeId,
      check_in: checkInAt,
      check_out: checkOutAt,
      worked_hours: workedHours,
      is_late: i === lateIndex,
      is_overtime: i === overtimeIndex,
    });
  }
}

// Actually checks the employee in right now (via the real service, not backdated SQL) so
// the HR Attendance day-view — which defaults to today — has something to show the moment
// someone runs the seed, instead of looking empty until people start punching in for real.
async function seedTodayCheckIn(employeeId) {
  const { rows: open } = await pool.query(
    'SELECT id FROM attendance WHERE employee_id = $1 AND check_out IS NULL',
    [employeeId]
  );
  if (open.length > 0) return;
  const { rows: today } = await pool.query(
    `SELECT id FROM attendance WHERE employee_id = $1 AND check_in::date = now()::date`,
    [employeeId]
  );
  if (today.length > 0) return;
  await checkIn(employeeId);
}

// Demo Time Off requests covering all three outcomes (pending / approved / refused) so
// the approval workflow and balance deduction are visible without a judge having to
// submit one live. Skips an employee entirely if they already have any request (keeps
// npm run seed safe to re-run).
async function seedTimeOffRequest(employeeId, typeIdsByName, { typeName, startOffsetDays, endOffsetDays, reason, outcome }) {
  const { rows: existing } = await pool.query(
    'SELECT id FROM time_off_requests WHERE employee_id = $1 LIMIT 1',
    [employeeId]
  );
  if (existing.length > 0) return;

  const start = new Date();
  start.setDate(start.getDate() + startOffsetDays);
  const end = new Date();
  end.setDate(end.getDate() + endOffsetDays);
  const toDateStr = (d) => d.toISOString().slice(0, 10);

  const request = await createRequest(employeeId, {
    type_id: typeIdsByName[typeName],
    start_date: toDateStr(start),
    end_date: toDateStr(end),
    reason,
  });

  if (outcome === 'approved') await approveRequest(request.id);
  if (outcome === 'refused') await refuseRequest(request.id);
}

async function seed() {
  console.log('Seeding departments...');
  const departmentIds = {};
  for (const name of DEPARTMENTS) {
    departmentIds[name] = await upsertDepartment(name);
  }

  console.log('Seeding tags...');
  const tagIdsByName = {};
  for (const name of TAGS) {
    tagIdsByName[name] = await upsertTag(name);
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
    await fillEmployeeProfile(employeeId, emp);
    await assignTags(employeeId, emp.tags, tagIdsByName);
  }

  console.log('Seeding default time off allocations...');
  const allocClient = await pool.connect();
  try {
    for (const employeeId of Object.values(employeeIdsByName)) {
      await ensureDefaultAllocations(allocClient, employeeId);
    }
  } finally {
    allocClient.release();
  }

  console.log('Seeding demo attendance history...');
  await seedAttendanceHistory(employeeIdsByName['John Dsouza'], 0);
  await seedAttendanceHistory(employeeIdsByName['Aarav Mehta'], 4);
  await seedAttendanceHistory(employeeIdsByName['Meera Joshi'], 8);

  console.log('Checking in demo employees for today...');
  await seedTodayCheckIn(employeeIdsByName['John Dsouza']);
  await seedTodayCheckIn(employeeIdsByName['Meera Joshi']);

  console.log('Seeding demo time off requests...');
  const types = await listTypes();
  const typeIdsByName = Object.fromEntries(types.map((t) => [t.name, t.id]));
  await seedTimeOffRequest(employeeIdsByName['John Dsouza'], typeIdsByName, {
    typeName: 'Casual Leave',
    startOffsetDays: 7,
    endOffsetDays: 7,
    reason: 'Personal errand',
    outcome: 'pending',
  });
  await seedTimeOffRequest(employeeIdsByName['Aarav Mehta'], typeIdsByName, {
    typeName: 'Sick Leave',
    startOffsetDays: -10,
    endOffsetDays: -9,
    reason: 'Fever',
    outcome: 'approved',
  });
  await seedTimeOffRequest(employeeIdsByName['Meera Joshi'], typeIdsByName, {
    typeName: 'Annual Leave',
    startOffsetDays: 14,
    endOffsetDays: 18,
    reason: 'Family vacation',
    outcome: 'refused',
  });

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
