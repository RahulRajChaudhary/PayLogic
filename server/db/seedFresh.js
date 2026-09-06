require('dotenv').config();
const { faker } = require('@faker-js/faker');
const pool = require('./pool');
const { hashPassword } = require('../services/auth');
const {
  createType, ensureDefaultAllocations, createAllocation, setAllocationStatus,
  createRequest, approveRequest, refuseRequest, cancelRequest,
} = require('../services/timeOff');
const { createContract } = require('../services/contracts');
const { createSchedule } = require('../services/workingSchedules');
const { createPayrun, computePayrun, validatePayrun, markPaid } = require('../services/payruns');

const DEMO_PASSWORD = 'Demo@1234';

function pick(arr) { return arr[faker.number.int({ min: 0, max: arr.length - 1 })]; }
function chance(pct) { return faker.number.int({ min: 1, max: 100 }) <= pct; }
function pickSome(arr, min, max) {
  const n = faker.number.int({ min, max: Math.min(max, arr.length) });
  return faker.helpers.arrayElements(arr, n);
}
function toDateStr(d) { return d.toISOString().slice(0, 10); }
function uniqueSeq(count, genFn) {
  const seen = new Set();
  const out = [];
  let guard = 0;
  while (out.length < count && guard < count * 20) {
    guard++;
    const v = genFn();
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

const INDIAN_PLACES = [
  ['Mumbai', 'Maharashtra'], ['Bengaluru', 'Karnataka'], ['Pune', 'Maharashtra'],
  ['New Delhi', 'Delhi'], ['Chennai', 'Tamil Nadu'], ['Hyderabad', 'Telangana'],
  ['Kolkata', 'West Bengal'], ['Ahmedabad', 'Gujarat'], ['Jaipur', 'Rajasthan'],
  ['Lucknow', 'Uttar Pradesh'], ['Kochi', 'Kerala'], ['Chandigarh', 'Punjab'],
];

// ---------------------------------------------------------------------------
// Step 1: wipe everything
// ---------------------------------------------------------------------------
async function wipeAll() {
  console.log('Wiping all data...');
  await pool.query(`
    TRUNCATE TABLE refresh_tokens, payslip_lines, payslips, payruns, salary_rules,
      salary_structures, contracts, time_off_requests, time_off_allocations, time_off_types,
      attendance, employee_tags, tags, schedule_lines, working_schedules, employees,
      departments, users
    RESTART IDENTITY CASCADE
  `);
  await pool.query(`ALTER SEQUENCE employee_code_seq RESTART WITH 1`);
  await pool.query(`ALTER SEQUENCE contract_code_seq RESTART WITH 1`);
  console.log('  done.');
}

// ---------------------------------------------------------------------------
// Step 2: departments (~150). Edge case: a couple with zero employees (checked
// naturally later since we simply don't assign every department to someone).
// ---------------------------------------------------------------------------
const FIXED_DEPARTMENTS = ['Finance', 'Engineering', 'Sales', 'Support', 'Human Resources'];

async function seedDepartments() {
  console.log('Seeding departments...');
  const ids = {};
  for (const name of FIXED_DEPARTMENTS) {
    const { rows } = await pool.query('INSERT INTO departments (name) VALUES ($1) RETURNING id', [name]);
    ids[name] = rows[0].id;
  }
  const extraNames = uniqueSeq(145, () => `${faker.commerce.department()} - ${faker.word.noun()}`);
  const allIds = [...Object.values(ids)];
  for (const name of extraNames) {
    const { rows } = await pool.query('INSERT INTO departments (name) VALUES ($1) RETURNING id', [name]);
    allIds.push(rows[0].id);
  }
  console.log(`  ${allIds.length} departments.`);
  return { fixed: ids, all: allIds };
}

// ---------------------------------------------------------------------------
// Step 3a: base time-off types (the 3 that existed before) — created BEFORE
// employees so ensureDefaultAllocations only grants these 3 per employee, not
// the full ~150 catalog (which would explode row counts combinatorially).
// ---------------------------------------------------------------------------
async function seedBaseTimeOffTypes() {
  console.log('Seeding base time off types...');
  const rows = [];
  for (const name of ['Annual Leave', 'Sick Leave', 'Casual Leave']) {
    const { rows: r } = await pool.query(
      `INSERT INTO time_off_types (name, requires_allocation) VALUES ($1, TRUE) RETURNING id, name`,
      [name]
    );
    rows.push(r[0]);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Step 3b: the remaining ~147 catalog time-off types, added AFTER employees so
// they don't trigger ensureDefaultAllocations. Edge cases: varied unit/
// approval/color, some requires_allocation = false.
// ---------------------------------------------------------------------------
async function seedExtraTimeOffTypes() {
  console.log('Seeding extra (catalog-padding) time off types...');
  const names = uniqueSeq(147, () => `${faker.word.adjective()} ${pick(['Leave', 'Time Off', 'Absence'])}`);
  const created = [];
  for (const name of names) {
    const type = await createType({
      name,
      requires_allocation: chance(80),
      unit: chance(80) ? 'day' : 'hour',
      approval: chance(70) ? 'manager' : 'officer',
      color: pick(['blue', 'green', 'gold', 'red', 'purple', 'gray']),
    });
    created.push(type);
  }
  console.log(`  ${created.length} extra types (150 total with the base 3).`);
  return created;
}

// ---------------------------------------------------------------------------
// Step 4: working schedules (~150). Edge case: a couple with zero lines.
// ---------------------------------------------------------------------------
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function schedulePattern(kind) {
  if (kind === 'empty') return [];
  const days = kind === 'six_day' ? DAYS.slice(0, 6) : kind === 'part_time' ? DAYS.slice(0, 4) : DAYS.slice(0, 5);
  return days.map((day) => ({
    day,
    start_time: '09:00',
    end_time: kind === 'part_time' ? '13:00' : '18:00',
    break_minutes: kind === 'part_time' ? 0 : 60,
  }));
}

async function seedWorkingSchedules() {
  console.log('Seeding working schedules...');
  const schedules = [];
  for (let i = 0; i < 150; i++) {
    let kind = 'five_day';
    if (i < 2) kind = 'empty'; // edge case: zero lines -> weekly_hours computes to 0
    else if (chance(15)) kind = 'six_day';
    else if (chance(15)) kind = 'part_time';
    const name = i === 0 ? 'Standard (No Lines Set)' : `${kind.replace('_', ' ')} Schedule ${i + 1}`;
    const schedule = await createSchedule({ name, lines: schedulePattern(kind) });
    schedules.push(schedule);
  }
  console.log(`  ${schedules.length} working schedules.`);
  return schedules;
}

// ---------------------------------------------------------------------------
// Step 5: users + employees. Fixed cast first (unchanged), then ~154 generated.
// ---------------------------------------------------------------------------
const FIXED_CAST = [
  { email: 'sara.khan@paylogic.demo', role: 'hr_manager', name: 'Sara Khan', department: 'Human Resources', job_position: 'HR Officer', manager: null },
  { email: 'aarav.mehta@paylogic.demo', role: 'hr_payroll_user', name: 'Aarav Mehta', department: 'Finance', job_position: 'Payroll Specialist', manager: 'Sara Khan' },
  { email: 'john.dsouza@paylogic.demo', role: 'employee', name: 'John Dsouza', department: 'Engineering', job_position: 'Developer', manager: null },
  { email: 'neha.patel@paylogic.demo', role: 'hr_payroll_manager', name: 'Neha Patel', department: 'Sales', job_position: 'Recruiter', manager: null },
  { email: 'priya.sharma@paylogic.demo', role: 'admin', name: 'Priya Sharma', department: 'Human Resources', job_position: 'System Administrator', manager: null },
  { email: 'meera.joshi@paylogic.demo', role: 'employee', name: 'Meera Joshi', department: 'Support', job_position: 'Support Engineer', manager: 'Sara Khan' },
];

const JOB_TITLES = ['Software Engineer', 'Senior Engineer', 'QA Analyst', 'Sales Executive', 'Account Manager',
  'HR Executive', 'Payroll Analyst', 'Support Engineer', 'Product Manager', 'Business Analyst',
  'DevOps Engineer', 'Finance Analyst', 'Recruiter', 'Office Administrator', 'Marketing Executive'];

async function upsertUser(email, role) {
  const password_hash = await hashPassword(DEMO_PASSWORD);
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3) RETURNING id',
    [email, password_hash, role]
  );
  return rows[0].id;
}

async function insertEmployee(data) {
  const { rows } = await pool.query(
    `INSERT INTO employees (
       user_id, name, department_id, manager_id, job_position, employee_type, status,
       work_email, work_phone, private_email, private_phone,
       home_address, home_city, home_state, home_country,
       date_of_birth, gender, marital_status, working_schedule_id, bank_account
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING id`,
    [
      data.user_id ?? null, data.name, data.department_id ?? null, data.manager_id ?? null,
      data.job_position ?? null, data.employee_type ?? 'full_time', data.status ?? 'active',
      data.work_email ?? null, data.work_phone ?? null, data.private_email ?? null, data.private_phone ?? null,
      data.home_address ?? null, data.home_city ?? null, data.home_state ?? null, data.home_country ?? null,
      data.date_of_birth ?? null, data.gender ?? null, data.marital_status ?? null,
      data.working_schedule_id ?? null, data.bank_account ?? null,
    ]
  );
  return rows[0].id;
}

async function backdateCreatedAt(employeeId, daysAgo) {
  await pool.query(`UPDATE employees SET created_at = now() - ($2 || ' days')::interval WHERE id = $1`, [employeeId, daysAgo]);
}

async function seedEmployees(departments, schedules, tagIds) {
  console.log('Seeding users + employees...');
  const employeeIdsByName = {};
  const allEmployees = []; // { id, name, department_id, job_position, status, created_at_days_ago }

  // Fixed cast first, in order, so self-referential manager_id can resolve.
  for (const emp of FIXED_CAST) {
    const userId = await upsertUser(emp.email, emp.role);
    const managerId = emp.manager ? employeeIdsByName[emp.manager] ?? null : null;
    const [city, state] = pick(INDIAN_PLACES);
    const id = await insertEmployee({
      user_id: userId, name: emp.name, department_id: departments.fixed[emp.department],
      manager_id: managerId, job_position: emp.job_position, employee_type: 'full_time', status: 'active',
      work_email: emp.email.replace('@paylogic.demo', '@company.com'), work_phone: faker.phone.number(),
      private_email: faker.internet.email(), private_phone: faker.phone.number(),
      home_address: faker.location.streetAddress(), home_city: city, home_state: state, home_country: 'India',
      date_of_birth: toDateStr(faker.date.birthdate({ min: 25, max: 55, mode: 'age' })),
      gender: pick(['male', 'female']), marital_status: pick(['single', 'married']),
      working_schedule_id: pick(schedules).id, bank_account: faker.finance.accountNumber(12),
    });
    employeeIdsByName[emp.name] = id;
    await backdateCreatedAt(id, 200);
    allEmployees.push({ id, name: emp.name, department_id: departments.fixed[emp.department], job_position: emp.job_position, status: 'active' });
  }

  // Bulk-generated employees. ~30-60 deliberately get no login (unlinked, for
  // the Users page); managers only ever point at an already-created employee
  // so chains form naturally (and can go 3+ deep).
  const ROLE_WEIGHTS = [
    ['employee', 70], ['hr_manager', 13], ['hr_payroll_user', 9], ['hr_payroll_manager', 6], ['admin', 2],
  ];
  function weightedRole() {
    const roll = faker.number.int({ min: 1, max: 100 });
    let acc = 0;
    for (const [role, pct] of ROLE_WEIGHTS) { acc += pct; if (roll <= acc) return role; }
    return 'employee';
  }

  const TOTAL_GENERATED = 154;
  const NO_LOGIN_COUNT = 45; // leaves plenty of "unlinked employee" candidates on the Users page
  const noLoginIndexes = new Set(faker.helpers.arrayElements(
    Array.from({ length: TOTAL_GENERATED }, (_, i) => i), NO_LOGIN_COUNT
  ));

  for (let i = 0; i < TOTAL_GENERATED; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const emailBase = `${firstName}.${lastName}${i}`.toLowerCase().replace(/[^a-z0-9.]/g, '');

    let userId = null;
    if (!noLoginIndexes.has(i)) {
      userId = await upsertUser(`${emailBase}@paylogic.demo`, weightedRole());
    }

    // Edge cases: ~10% no department, ~30% no manager, rest pick a manager from
    // employees created so far (fixed cast + earlier generated ones) -> chains.
    const departmentId = chance(90) ? pick(departments.all) : null;
    const managerPool = allEmployees;
    const managerId = (managerPool.length > 0 && chance(70)) ? pick(managerPool).id : null;

    const [city, state] = pick(INDIAN_PLACES);
    const isRecentHire = i < 4; // edge case: mid-history hire, absence-cutoff test
    const employeeType = chance(75) ? 'full_time' : chance(60) ? 'part_time' : 'contract';
    const status = chance(92) ? 'active' : 'inactive';
    const hasBankAccount = chance(85); // edge case: ~15% missing -> payroll warning later
    const hasSchedule = chance(85);

    const id = await insertEmployee({
      user_id: userId, name: fullName, department_id: departmentId, manager_id: managerId,
      job_position: pick(JOB_TITLES), employee_type: employeeType, status,
      work_email: `${emailBase}@company.com`, work_phone: faker.phone.number(),
      private_email: faker.internet.email({ firstName, lastName }), private_phone: faker.phone.number(),
      home_address: faker.location.streetAddress(), home_city: city, home_state: state, home_country: 'India',
      date_of_birth: toDateStr(faker.date.birthdate({ min: 20, max: 60, mode: 'age' })),
      gender: pick(['male', 'female', 'other']), marital_status: pick(['single', 'married', 'divorced', 'widowed']),
      working_schedule_id: hasSchedule ? pick(schedules).id : null,
      bank_account: hasBankAccount ? faker.finance.accountNumber(12) : null,
    });

    if (!isRecentHire) await backdateCreatedAt(id, faker.number.int({ min: 40, max: 500 }));
    // else: leave created_at as "now" -> genuine recent hire for the absence-cutoff edge case.

    employeeIdsByName[fullName] = id;
    allEmployees.push({ id, name: fullName, department_id: departmentId, job_position: pick(JOB_TITLES), status });

    const tags = pickSome(tagIds, 0, 4);
    for (const tagId of tags) {
      await pool.query(
        'INSERT INTO employee_tags (employee_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, tagId]
      );
    }
  }

  console.log(`  ${allEmployees.length} employees (${TOTAL_GENERATED - NO_LOGIN_COUNT} generated + 6 fixed with logins, ${NO_LOGIN_COUNT} generated without).`);
  return { employeeIdsByName, allEmployees };
}

// ---------------------------------------------------------------------------
// Step 6: default time-off allocations (3 base types x every employee) via the
// real ensureDefaultAllocations, then a smaller batch of EXTRA allocations
// against the catalog-padding types with deliberate pending/approved/refused
// variety (createAllocation always inserts 'pending' -> we flip some after).
// ---------------------------------------------------------------------------
async function seedDefaultAllocations(allEmployees) {
  console.log('Seeding default time-off allocations (Annual/Sick/Casual)...');
  const client = await pool.connect();
  try {
    for (const emp of allEmployees) {
      await ensureDefaultAllocations(client, emp.id);
    }
  } finally {
    client.release();
  }
  console.log(`  ~${allEmployees.length * 3} default allocations created.`);
}

async function seedExtraAllocations(allEmployees, extraTypes) {
  console.log('Seeding extra allocations (approval-before-availability edge cases)...');
  const targets = faker.helpers.arrayElements(allEmployees, Math.min(150, allEmployees.length));
  let pendingLeftCount = 0;
  const pendingEmployeeIds = [];
  for (const emp of targets) {
    const type = pick(extraTypes);
    try {
      const alloc = await createAllocation({
        employee_id: emp.id, type_id: type.id,
        allocated: faker.number.int({ min: 3, max: 15 }),
        valid_from: chance(50) ? toDateStr(faker.date.past({ years: 1 })) : null,
        valid_to: chance(50) ? toDateStr(faker.date.future({ years: 1 })) : null,
        description: chance(30) ? faker.lorem.sentence() : null,
      });
      const roll = faker.number.int({ min: 1, max: 100 });
      if (roll <= 40) {
        await setAllocationStatus(alloc.id, 'approved', null);
      } else if (roll <= 55) {
        await setAllocationStatus(alloc.id, 'refused', null);
      } else {
        // left pending -> the approval-before-availability demonstration case
        pendingLeftCount++;
        pendingEmployeeIds.push({ employeeId: emp.id, typeId: type.id });
      }
    } catch {
      // UNIQUE(employee_id, type_id) collision - skip, not worth retrying for seed data
    }
  }
  console.log(`  ${targets.length} extra allocations attempted, ${pendingLeftCount} left pending on purpose.`);
  return pendingEmployeeIds;
}

// ---------------------------------------------------------------------------
// Step 7: time off requests, via the real service so overlap + balance rules
// are honestly enforced, not asserted.
// ---------------------------------------------------------------------------
async function seedTimeOffRequests(allEmployees, baseTypes, pendingEmployeeIds) {
  console.log('Seeding time off requests...');
  let created = 0;
  const annualId = baseTypes.find((t) => t.name === 'Annual Leave').id;
  const sickId = baseTypes.find((t) => t.name === 'Sick Leave').id;
  const casualId = baseTypes.find((t) => t.name === 'Casual Leave').id;
  const baseIds = [annualId, sickId, casualId];

  const candidates = faker.helpers.arrayElements(allEmployees, Math.min(190, allEmployees.length));
  for (const emp of candidates) {
    const offsetStart = faker.number.int({ min: -60, max: 60 });
    const span = faker.number.int({ min: 0, max: 4 });
    const start = new Date(); start.setDate(start.getDate() + offsetStart);
    const end = new Date(start); end.setDate(end.getDate() + span);
    try {
      const req = await createRequest(emp.id, {
        type_id: pick(baseIds),
        start_date: toDateStr(start),
        end_date: toDateStr(end),
        reason: faker.lorem.words({ min: 2, max: 6 }),
      });
      created++;
      const outcome = pick(['pending', 'approved', 'refused', 'cancelled']);
      if (outcome === 'approved') await approveRequest(req.id).catch(() => {});
      else if (outcome === 'refused') await refuseRequest(req.id).catch(() => {});
      else if (outcome === 'cancelled') await cancelRequest(req.id, emp.id).catch(() => {});
      // 'pending' -> leave as-is
    } catch {
      // overlap or insufficient balance - expected for some random combos, skip
    }
  }

  // Edge case: an employee whose only allocation for an extra type is pending
  // tries to request against it -> must be correctly rejected (INSUFFICIENT_BALANCE).
  let rejectedAsExpected = 0;
  for (const { employeeId, typeId } of pendingEmployeeIds.slice(0, 10)) {
    const start = new Date(); start.setDate(start.getDate() + 20);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    try {
      await createRequest(employeeId, { type_id: typeId, start_date: toDateStr(start), end_date: toDateStr(end), reason: 'Testing pending allocation' });
    } catch (err) {
      if (err.code === 'INSUFFICIENT_BALANCE') rejectedAsExpected++;
    }
  }

  console.log(`  ${created} requests created across all 4 statuses; ${rejectedAsExpected} pending-allocation requests correctly rejected.`);
}

// ---------------------------------------------------------------------------
// Step 8: salary structures + rules (~150; ~40 marked "active" for real use
// in contracts/payruns, the rest are catalog padding, never referenced).
// ---------------------------------------------------------------------------
const ALLOWANCE_NAMES = ['House Rent Allowance', 'Travel Allowance', 'Medical Allowance', 'Special Allowance'];
const DEDUCTION_NAMES = ['Provident Fund', 'Professional Tax', 'TDS'];

async function createRuleRow({ structure_id, name, code, category, sequence, computation_method, amount, percentage, percentage_of_code, formula }) {
  const { rows } = await pool.query(
    `INSERT INTO salary_rules (structure_id, name, code, category, sequence, computation_method, amount, percentage, percentage_of_code, formula)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [structure_id, name, code, category, sequence, computation_method, amount ?? null, percentage ?? null, percentage_of_code ?? null, formula ?? null]
  );
  return rows[0].id;
}

async function seedSalaryStructures() {
  console.log('Seeding salary structures + rules...');
  const names = uniqueSeq(150, () => `${faker.commerce.department()} ${pick(['Structure', 'Pay Grade', 'Compensation Plan'])} ${faker.number.int({ min: 1, max: 999 })}`);
  const active = [];
  const all = [];

  for (let i = 0; i < names.length; i++) {
    const { rows } = await pool.query('INSERT INTO salary_structures (name) VALUES ($1) RETURNING id, name', [names[i]]);
    const structure = rows[0];
    all.push(structure);

    const kind = i < 105 ? 'full' : i < 128 ? 'basic_only' : 'contract_wage_based'; // ~70/15/15 split
    let seq = 1;
    await createRuleRow({ structure_id: structure.id, name: 'Basic Salary', code: 'BASIC', category: 'basic', sequence: seq++, computation_method: 'fixed', amount: faker.number.int({ min: 15000, max: 60000 }) });

    if (kind === 'basic_only') {
      // Edge case: no GROSS/NET at all -> a payslip computed from this structure
      // has genuinely zero "net" total; the dashboard's aggregation is correct
      // to show 0, not a bug (see paylogic/DECISIONS.md's dashboard verification).
    } else if (kind === 'contract_wage_based') {
      const pct = faker.number.int({ min: 30, max: 50 });
      await createRuleRow({ structure_id: structure.id, name: 'Allowance', code: 'ALLOW', category: 'allowance', sequence: seq++, computation_method: 'percentage', percentage: pct, percentage_of_code: 'CONTRACT_WAGE' });
      await createRuleRow({ structure_id: structure.id, name: 'Gross Salary', code: 'GROSS', category: 'gross', sequence: seq++, computation_method: 'formula', formula: 'BASIC + ALLOW' });
      const dpct = faker.number.int({ min: 5, max: 12 });
      await createRuleRow({ structure_id: structure.id, name: 'Provident Fund', code: 'PF', category: 'deduction', sequence: seq++, computation_method: 'percentage', percentage: dpct, percentage_of_code: 'BASIC' });
      await createRuleRow({ structure_id: structure.id, name: 'Net Salary', code: 'NET', category: 'net', sequence: seq++, computation_method: 'formula', formula: 'GROSS - PF' });
    } else {
      const allowances = pickSome(ALLOWANCE_NAMES, 1, 2);
      const allowCodes = [];
      for (const aName of allowances) {
        const code = aName.replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase() + seq;
        allowCodes.push(code);
        await createRuleRow({ structure_id: structure.id, name: aName, code, category: 'allowance', sequence: seq++, computation_method: 'percentage', percentage: faker.number.int({ min: 10, max: 45 }), percentage_of_code: 'BASIC' });
      }
      await createRuleRow({ structure_id: structure.id, name: 'Gross Salary', code: 'GROSS', category: 'gross', sequence: seq++, computation_method: 'formula', formula: ['BASIC', ...allowCodes].join(' + ') });
      const deductions = pickSome(DEDUCTION_NAMES, 1, 2);
      const dedCodes = [];
      for (const dName of deductions) {
        const code = dName.replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase() + seq;
        dedCodes.push(code);
        await createRuleRow({ structure_id: structure.id, name: dName, code, category: 'deduction', sequence: seq++, computation_method: 'percentage', percentage: faker.number.int({ min: 2, max: 15 }), percentage_of_code: 'BASIC' });
      }
      await createRuleRow({ structure_id: structure.id, name: 'Net Salary', code: 'NET', category: 'net', sequence: seq++, computation_method: 'formula', formula: `GROSS - ${dedCodes.join(' - ')}` });
    }

    if (i < 40) active.push(structure); // only the first 40 get real contracts/payruns
  }

  console.log(`  ${all.length} structures (${active.length} actively used, rest catalog padding).`);
  return { active, all };
}

// ---------------------------------------------------------------------------
// Step 9: contracts, via the real createContract so the overlap guard is
// honestly exercised.
// ---------------------------------------------------------------------------
async function seedContracts(allEmployees, activeStructures, allDepartmentIds) {
  console.log('Seeding contracts...');
  let count = 0;
  let expiringSoonCount = 0;
  const eligibleByEmployee = new Map(); // employeeId -> { activeStructureId }

  for (const emp of allEmployees) {
    const hasHistory = chance(35);
    if (hasHistory) {
      // Historical ended contract, deliberately a different department/job than
      // the employee's current one (role changed over time).
      const otherDepartments = allDepartmentIds.filter((id) => id !== emp.department_id);
      const start = faker.date.past({ years: 3 });
      const end = new Date(start); end.setMonth(end.getMonth() + faker.number.int({ min: 3, max: 18 }));
      try {
        await createContract(emp.id, {
          start_date: toDateStr(start), end_date: toDateStr(end),
          wage: faker.number.int({ min: 15000, max: 50000 }),
          salary_structure_id: null,
          department_id: otherDepartments.length ? pick(otherDepartments) : emp.department_id,
          job_position: pick(JOB_TITLES), status: 'ended',
        });
        count++;
      } catch { /* skip on unexpected conflict */ }
    }

    // Current active contract.
    const givesStructure = chance(75);
    const structureId = givesStructure ? pick(activeStructures).id : null;
    const expiringSoon = givesStructure && chance(8); // small slice -> "expiring within 30 days" warning
    let endDate = null;
    if (expiringSoon) {
      const d = new Date(); d.setDate(d.getDate() + faker.number.int({ min: 5, max: 28 }));
      endDate = toDateStr(d);
      expiringSoonCount++;
    }
    const start = faker.date.past({ years: 1 });
    try {
      await createContract(emp.id, {
        start_date: toDateStr(start), end_date: endDate,
        wage: faker.number.int({ min: 18000, max: 90000 }),
        salary_structure_id: structureId, department_id: emp.department_id,
        job_position: emp.job_position, status: 'active',
      });
      count++;
      if (structureId) eligibleByEmployee.set(emp.id, structureId);
    } catch { /* overlap - extremely unlikely given one active per employee, skip if it happens */ }
  }

  console.log(`  ${count} contracts (${eligibleByEmployee.size} employees payroll-eligible, ${expiringSoonCount} expiring within 30 days).`);
  return eligibleByEmployee;
}

// ---------------------------------------------------------------------------
// Step 10: attendance (~150 employees x ~20 workdays). Gaps become "absent" at
// read time automatically - no need to insert absence rows.
// ---------------------------------------------------------------------------
async function insertAttendanceRow({ employee_id, check_in, check_out, worked_hours, is_late, is_overtime }) {
  await pool.query(
    `INSERT INTO attendance (employee_id, check_in, check_out, worked_hours, is_late, is_overtime)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [employee_id, check_in, check_out ?? null, worked_hours ?? null, is_late ?? false, is_overtime ?? false]
  );
}

function pastWeekdays(count, before) {
  const days = [];
  const cursor = new Date(before);
  cursor.setDate(cursor.getDate() - 1);
  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
}

async function seedAttendance(allEmployees) {
  console.log('Seeding attendance history (this is the largest table, please wait)...');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pool_ = faker.helpers.arrayElements(allEmployees, Math.min(150, allEmployees.length));

  // Two dedicated edge-case employees: one with a genuine PAST open record
  // (missing_checkout) and a different one currently checked in as of "today"
  // (checked_in) - the one-open-record-per-employee index means these must be
  // different people.
  const missingCheckoutEmp = pool_[0];
  const checkedInTodayEmp = pool_[1];

  let rows = 0;
  for (const emp of pool_) {
    const days = pastWeekdays(20, today);
    const lateIdx = faker.number.int({ min: 0, max: days.length - 1 });
    const otIdx = faker.number.int({ min: 0, max: days.length - 1 });
    for (let i = 0; i < days.length; i++) {
      if (chance(12) && emp.id !== missingCheckoutEmp.id) continue; // random absence gap
      const day = days[i];
      const isLast = i === days.length - 1;
      if (emp.id === missingCheckoutEmp.id && isLast) {
        // Genuine past open record: check_in with no check_out.
        await insertAttendanceRow({ employee_id: emp.id, check_in: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 5) });
        rows++;
        continue;
      }
      const checkInMinute = i === lateIdx ? 25 : faker.number.int({ min: 0, max: 8 });
      const checkOutHour = i === otIdx ? 20 : 18;
      const checkIn = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, checkInMinute);
      const checkOut = new Date(day.getFullYear(), day.getMonth(), day.getDate(), checkOutHour, faker.number.int({ min: 0, max: 20 }));
      await insertAttendanceRow({
        employee_id: emp.id, check_in: checkIn, check_out: checkOut,
        worked_hours: Math.round(((checkOut - checkIn) / 3600000) * 100) / 100,
        is_late: i === lateIdx, is_overtime: i === otIdx,
      });
      rows++;
    }
  }

  // Currently checked in "today" (no check_out yet).
  await insertAttendanceRow({ employee_id: checkedInTodayEmp.id, check_in: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 10) });
  rows++;

  console.log(`  ${rows} attendance rows across ${pool_.length} employees.`);
}

// ---------------------------------------------------------------------------
// Step 11: payruns -> payslips -> payslip_lines, via the real state-machine
// services so amounts/warnings are internally consistent.
// ---------------------------------------------------------------------------
function monthRange(monthsAgo) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
  return { periodStart: toDateStr(start), periodEnd: toDateStr(end) };
}

async function seedPayruns(eligibleByEmployee, allEmployees) {
  console.log('Seeding payruns (this calls the real compute/validate/pay pipeline, please wait)...');
  const eligibleEntries = [...eligibleByEmployee.entries()]; // [employeeId, structureId]
  const byStructure = new Map();
  for (const [employeeId, structureId] of eligibleEntries) {
    if (!byStructure.has(structureId)) byStructure.set(structureId, []);
    byStructure.get(structureId).push(employeeId);
  }
  const structureIds = [...byStructure.keys()];
  if (structureIds.length === 0) {
    console.log('  no eligible employees generated - skipping payruns.');
    return;
  }

  let created = 0, computed = 0, validated = 0, paid = 0, blocked = 0;
  const MONTHS_BACK = 7; // spans 8 distinct months including the current one
  const noContractPool = allEmployees.filter((e) => !eligibleByEmployee.has(e.id));

  for (let m = MONTHS_BACK; m >= 0; m--) {
    const { periodStart, periodEnd } = monthRange(m);
    // A handful of payruns per month, cycling through structures that have eligible employees.
    const runsThisMonth = faker.number.int({ min: 8, max: 16 });
    for (let r = 0; r < runsThisMonth; r++) {
      const structureId = pick(structureIds);
      const pool_ = byStructure.get(structureId);
      if (!pool_ || pool_.length === 0) continue;
      const employeeIds = faker.helpers.arrayElements(pool_, Math.min(faker.number.int({ min: 1, max: 5 }), pool_.length));

      // Edge case: occasionally inject an employee with NO applicable contract
      // at all, to force the "no applicable contract" warning + validation block.
      const injectMissingContract = chance(6) && noContractPool.length > 0;
      if (injectMissingContract) employeeIds.push(pick(noContractPool).id);

      let payrun;
      try {
        payrun = await createPayrun({
          name: `${periodStart.slice(0, 7)} Payrun ${r + 1}`,
          structureId, periodStart, periodEnd, employeeIds,
        });
        created++;
      } catch {
        continue;
      }

      // Target state distribution: mostly paid (real historical trend data),
      // some validated, some computed, a few left at draft entirely.
      const targetRoll = faker.number.int({ min: 1, max: 100 });
      if (targetRoll <= 10) continue; // stays draft

      try {
        await computePayrun(payrun.id);
        computed++;
      } catch {
        continue;
      }
      if (targetRoll <= 25) continue; // stays computed

      try {
        await validatePayrun(payrun.id);
        validated++;
      } catch (err) {
        if (err.code === 'BLOCKING_WARNINGS') { blocked++; continue; } // expected for injected-missing-contract runs
        continue;
      }
      if (targetRoll <= 40) continue; // stays validated

      try {
        await markPaid(payrun.id);
        paid++;
      } catch { /* ignore */ }
    }
  }

  console.log(`  ${created} payruns created (${computed} computed, ${validated} validated, ${paid} paid, ${blocked} correctly blocked at validation).`);

  // Edge case: duplicate-payslip warning - create one more payrun for the same
  // structure/employee/overlapping period as an already-paid one.
  const anyStructureId = structureIds[0];
  const anyEmployeeId = byStructure.get(anyStructureId)[0];
  const { periodStart, periodEnd } = monthRange(1);
  try {
    const dupePayrun = await createPayrun({
      name: 'Duplicate Coverage Check', structureId: anyStructureId, periodStart, periodEnd, employeeIds: [anyEmployeeId],
    });
    await computePayrun(dupePayrun.id); // will attach the duplicate-payslip warning if an overlapping paid payrun exists
    console.log('  seeded one deliberate duplicate-coverage payrun for the warning demo.');
  } catch { /* fine if it happens not to overlap */ }
}

// ---------------------------------------------------------------------------
// Tags (~150)
// ---------------------------------------------------------------------------
async function seedTags() {
  console.log('Seeding tags...');
  const fixed = ['Remote', 'Team Lead', 'New Hire'];
  const ids = [];
  for (const name of fixed) {
    const { rows } = await pool.query('INSERT INTO tags (name) VALUES ($1) RETURNING id', [name]);
    ids.push(rows[0].id);
  }
  const extra = uniqueSeq(147, () => faker.word.adjective() + '-' + faker.word.noun());
  for (const name of extra) {
    const { rows } = await pool.query('INSERT INTO tags (name) VALUES ($1) RETURNING id', [name]);
    ids.push(rows[0].id);
  }
  console.log(`  ${ids.length} tags.`);
  return ids;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
async function printSummary() {
  const tables = ['departments', 'tags', 'time_off_types', 'working_schedules', 'schedule_lines',
    'users', 'employees', 'employee_tags', 'time_off_allocations', 'time_off_requests',
    'salary_structures', 'salary_rules', 'contracts', 'attendance', 'payruns', 'payslips', 'payslip_lines'];
  console.log('\n--- Final row counts ---');
  for (const t of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
    console.log(`  ${t}: ${rows[0].c}`);
  }
}

async function main() {
  await wipeAll();
  const departments = await seedDepartments();
  const tagIds = await seedTags();
  const baseTypes = await seedBaseTimeOffTypes();
  const schedules = await seedWorkingSchedules();
  const { allEmployees } = await seedEmployees(departments, schedules, tagIds);
  await seedDefaultAllocations(allEmployees);
  const extraTypes = await seedExtraTimeOffTypes();
  const pendingEmployeeIds = await seedExtraAllocations(allEmployees, extraTypes);
  await seedTimeOffRequests(allEmployees, baseTypes, pendingEmployeeIds);
  const { active: activeStructures } = await seedSalaryStructures();
  const eligibleByEmployee = await seedContracts(allEmployees, activeStructures, departments.all);
  await seedAttendance(allEmployees);
  await seedPayruns(eligibleByEmployee, allEmployees);

  console.log('\nFixed demo logins (unchanged, all share one password):');
  console.log(`  Password: ${DEMO_PASSWORD}`);
  for (const emp of FIXED_CAST) console.log(`  ${emp.email}  (${emp.role})`);

  await printSummary();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
