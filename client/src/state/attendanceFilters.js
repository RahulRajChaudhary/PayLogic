function todayStr() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export let hrFilterState = {
  date: todayStr(),
  departmentId: '',
};

export function setHrFilterState(next) {
  hrFilterState = next;
}

export function resetAttendanceFilters() {
  hrFilterState = { date: todayStr(), departmentId: '' };
}
