/**
 * HRM (Human Resource Management) queries — Employees, Jobs, Teacher States,
 * Employee Schedules, Employee Vocations + their dropdowns.
 *
 * All entities are scoped to the active branch via JWT (br_id, u_br_id).
 */

const { sqlText, offsetOf } = require('./_utils');

module.exports = {
  // --- Lists (table data) ----------------------------------------------------

  // Returns the full employee_show output untouched — no LIMIT/OFFSET wrap.
  // The frontend paginates + filters client-side so what the user sees in
  // pgAdmin matches what the table renders.
  Employees: (p) => ({
    sql: `SELECT * FROM employee_show(${Number(p?.br_id)})`,
    prePaginated: true,
  }),

  EmployeeEdit: (p) => ({
    sql: `SELECT * FROM employee_edit_show(${Number(p?.emp_id)})`,
    prePaginated: true,
  }),

  // Bulk-image panel: list employees of a branch, narrowed by shift when sh_id>0.
  EmployeesByShift: (p) => ({
    sql: `SELECT * FROM employees_by_shift_show(${Number(p?.sh_id)}, ${Number(p?.br_id)})`,
    prePaginated: true,
  }),

  Jobs: () => ({
    sql: `SELECT j_id, j_name, state, reg_date FROM job ORDER BY j_name`,
    prePaginated: false,
  }),

  TeacherStates: (p) => ({
    sql: `SELECT * FROM teacher_state_show(${Number(p?.br_id)})`,
    prePaginated: true,
  }),

  EmployeeSchedules: (p) => ({
    sql: `SELECT * FROM employee_schedule_show(${Number(p?.emp_id)})`,
    prePaginated: true,
  }),

  EmployeeVocations: (p) => ({
    sql: `SELECT * FROM employee_vocation_show(${Number(p?.emp_id)})`,
    prePaginated: true,
  }),

  // --- Dropdown options (lazy-loaded by Select2) -----------------------------

  job_options: (p) => ({
    sql: `SELECT * FROM job_options_show('${sqlText(p?.search)}', ${Number(p?.limit) || 25}, ${offsetOf(p, 25)})`,
    prePaginated: true,
  }),

  shift_options: (p) => ({
    sql: `SELECT * FROM shift_options_show('${sqlText(p?.search)}', ${Number(p?.limit) || 25}, ${offsetOf(p, 25)})`,
    prePaginated: true,
  }),

  day_options: (p) => ({
    sql: `SELECT * FROM day_options_show('${sqlText(p?.search)}', ${Number(p?.limit) || 25}, ${offsetOf(p, 25)})`,
    prePaginated: true,
  }),
};
