/**
 * API Queries Config - Whitelist of allowed queries
 * Keys must match: crudConfig optionsKey (dropdowns) and menuConfig queryName (datatables).
 *
 * Entry shapes:
 *   - string                                       → simple SQL
 *   - (params) => string                           → dynamic SQL
 *   - (params) => { sql, prePaginated: true }      → SP already handles
 *       search/limit/offset/branch internally; api.js skips the wrap.
 *       For these, the SP MUST also expose a `total_count` window column
 *       (or callers accept that pagination total may be -1).
 */

/** Escape a single-quoted SQL literal. Use only for params interpolated into SP calls. */
function sqlText(s) {
  return String(s ?? '').replace(/'/g, "''");
}
/** Compute (page-1)*limit, clamped to >= 0. */
function offsetOf(p, defaultLimit) {
  const limit = Number(p?.limit) || defaultLimit;
  const page = Math.max(1, Number(p?.page) || 1);
  return (page - 1) * limit;
}

const QUERIES = {
  // ---- Dropdowns (optionsKey in crudConfig) – must return value + label columns for selects ----
  responsible_options: (p) => ({
    sql: `SELECT * FROM responsible_options_show('${sqlText(p?.search)}', ${Number(p?.limit) || 25}, ${offsetOf(p, 25)}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  all_student_options: (p) => ({
    sql: `SELECT * FROM all_student_options_show('${sqlText(p?.search)}', ${Number(p?.limit) || 25}, ${offsetOf(p, 25)}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  std_admin_all_options: (p) => `SELECT * FROM vw_std_admin_all(${Number(p?.br_id) || 0})`,
  address_options: "SELECT add_id, concat(district, ' - ', village) AS address_name FROM address ORDER BY district, village",
  account_options: 'SELECT acc_id, acc_name FROM accounts ORDER BY acc_id',
  student_class_info: (p) => `SELECT name, cl_id, a_y_id, academic_name FROM (
    SELECT DISTINCT ON (cl.cl_id, sc.a_y_id)
      cl.class AS name, cl.cl_id, sc.a_y_id, ac.academic_name, cl.gr_id
    FROM student_class sc
    JOIN class cl ON cl.cl_id = sc.cl_id
    JOIN academic_year ac ON ac.a_y_id = sc.a_y_id
    WHERE sc.state = 'Continue' AND sc.std_id = ${Number(p?.std_id) || 0}
    ORDER BY cl.cl_id, sc.a_y_id, cl.gr_id
  ) q ORDER BY q.gr_id, q.cl_id`,
  studentClass_info: (p) => `SELECT * FROM vw_studentclass_info(${Number(p?.std_id) || 0})`,
  level_type: 'SELECT l.l_ty_id, l.name AS level_name FROM level_type l ORDER BY l.name',
  levels: (p) => `SELECT lev_id, level FROM levels_show(${Number(p?.br_id) || 0}) ORDER BY level`,
  grades: 'SELECT gr_id, grade_name FROM grade ORDER BY gr_id',
  class_options: (p) => ({
    sql: `SELECT * FROM vw_all_classes('${sqlText(p?.search)}', ${Number(p?.limit) || 25}, ${offsetOf(p, 25)}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  employee_options: (p) => ({
    sql: `SELECT * FROM employee_options_show('${sqlText(p?.search)}', ${Number(p?.limit) || 25}, ${offsetOf(p, 25)}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  subject_options: 'SELECT sub_id, name FROM subjects ORDER BY name',
  subject_class_options: (p) => `SELECT sub_cl_id, subject_name FROM subject_class_show(${Number(p?.br_id) || 0}, ${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0}) ORDER BY subject_name`,
  shift_options: 'SELECT * FROM shift',
  student_options: (p) => `SELECT * FROM student_options_show(${Number(p?.a_y_id) || 0}, ${Number(p?.cl_id) || 0})`,
  academic_options: 'SELECT a_y_id, academic_name, state FROM academic_year ORDER BY a_y_id',
  accounts: (p) => `SELECT * FROM accounts_show(${Number(p?.br_id) || 0})`,
  gendersections: (p) => `SELECT * FROM accounts_show(${Number(p?.br_id) || 0})`,

  // ---- Datatable / entity queries (queryName in menuConfig) ----
  LevelSetup: (p) => `SELECT * FROM levels_show(${Number(p?.br_id) || 0})`,
  ClassSetup: (p) => `SELECT * FROM class_show(${Number(p?.br_id) || 0})`,
  ClassFormaster: (p) => `SELECT * FROM class_formaster_show(${Number(p?.br_id) || 0}, ${Number(p?.academicYearId) || 0})`,
  SubjectsSetup: 'SELECT * FROM subjects_show()',
  SubjectClassSetup: (p) => `SELECT * FROM subject_class_show(${Number(p?.br_id) || 0}, ${Number(p?.cl_id) || 0}, ${Number(p?.academicYearId) || 0})`,
  academicYeartab: 'SELECT * FROM academic_year_show() ORDER BY id',
  BranchTransfer: 'SELECT * FROM branch_transfer ORDER BY 1',
  AcademicTransfer: 'SELECT * FROM academic_transfer ORDER BY 1',
  ClassTransfer: 'SELECT * FROM class_transfer ORDER BY 1',
  TeacherSyllabus: (p) => `SELECT * FROM show_teacher_daily_sp(${Number(p?.cl_id) || 0}, ${Number(p?.sub_cl_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  LessonPlanRow: (p) => `SELECT * FROM lesson_plan_row_show(${Number(p?.l_p_id) || 0})`,
  LessonActivity: (p) => `SELECT * FROM lesson_activity_show(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  LessonActivityRow: (p) => `SELECT * FROM lesson_activity_row_show(${Number(p?.ac_t_id) || 0})`,
  LessonActivityMark: 'SELECT * FROM lesson_activity_mark ORDER BY 1',
  LessonActivityResults: (p) => `SELECT * FROM show_lesson_activity_results_sp(${Number(p?.a_y_id)||0}, ${Number(p?.cl_id)||0}, ${Number(p?.b_id)||0}, ${Number(p?.sub_cl_id)||0}, ${Number(p?.ac_id)||0}, ${Number(p?.ex_reg_id)||0})`,
  LessonActivityResultRow: (p) => `SELECT lar.lar_id, lar.ac_t_id, lar.std_cl_id, lar.marks_obtained, lar.state FROM lesson_activity_result lar WHERE lar.lar_id = ${Number(p?.lar_id)||0}`,
  Students: (p) => `SELECT * FROM vw_student(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0}, ${Number(p?.b_id) || 0}, 'show')`,
  Responsible: (p) => `SELECT * FROM responsible_show(${Number(p?.br_id) || 0})`,
  StudentResponsible: (p) => `SELECT id, student, responsible, phone1, phone2 FROM student_responsible(0, ${Number(p?.res_id) || 0}, 'show', ${Number(p?.u_br_id) || 0}) WHERE student IS NOT NULL`,
  showprentwithnostudents: 'SELECT * FROM responsible_with_no_student_show()',
  studentstate: (p) => `SELECT * FROM fn_student_state(${Number(p?.br_id) || 0})`,
  bus: (p) => `SELECT * FROM bus_show(${Number(p?.br_id) || 0})`,
  Studentinfo: (p) => ({
    sql: `SELECT * FROM studentinfo_show(${Number(p?.std_id) || 0}, '${sqlText(p?.search)}', ${Number(p?.limit) || 10}, ${offsetOf(p, 10)}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  StudentinfoDuplicates: 'SELECT * FROM studentinfo_duplicates_show()',
  'update school': 'SELECT id, school_name, school_reg_no FROM view_schools() WHERE id IS NOT NULL',

  // ---- Activity Management ----
  // subject_activity.subject_id is a FK to subjects.sub_id (not subjects.subject_id —
  // subjects has no such column). The label `subject_name` is `subjects.name`.
  Activity: (p) => `SELECT * FROM activity_show(${Number(p?.br_id) || 0})`,
  SubjectActivity: 'SELECT sa.sub_act_id, sa.act_id, a.activity_name, sa.subject_id, s.name AS subject_name, sa.max_marks, sa.state FROM subject_activity sa JOIN activity a ON a.act_id = sa.act_id JOIN subjects s ON s.sub_id = sa.subject_id ORDER BY sa.sub_act_id',
  StudentActivityEdit: 'SELECT sae.sta_id, sae.student_id, st.student_name, sae.sub_act_id, CONCAT(a.activity_name, \' - \', s.name) AS subject_activity, sae.marks_obtained, sae.state FROM student_activity_edit sae JOIN students st ON st.student_id = sae.student_id JOIN subject_activity sa ON sa.sub_act_id = sae.sub_act_id JOIN activity a ON a.act_id = sa.act_id JOIN subjects s ON s.sub_id = sa.subject_id ORDER BY sae.sta_id',

  // ---- User management ----
  // Function-style entry — runtime params ayaa lagu soo gudbiyaa (br_id)
  Users: (p) => `SELECT * FROM users_show(${Number(p?.br_id) || 0})`,
  branch_options: 'SELECT br_id, br_name FROM branch ORDER BY br_name',
  batch_options: (p) => (Number(p?.cl_id) > 0
    ? `SELECT * FROM vw_batch_by_class(${Number(p?.cl_id)})`
    : 'SELECT b_id, batch_name FROM batch ORDER BY batch_name'),
  student_class_options: (p) => `SELECT * FROM student_class_options_show(${Number(p?.a_y_id) || 0}, ${Number(p?.cl_id) || 0}, ${Number(p?.b_id) || 0})`,
  lesson_activity_options: (p) => `SELECT * FROM lesson_activity_options_show(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  exam_reg_options: 'SELECT * FROM exam_reg_options_show()',
  people_options: (p) => ({
    sql: `SELECT * FROM people_options_show('${sqlText(p?.search)}', ${Number(p?.limit) || 25}, ${offsetOf(p, 25)}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  all_students_options: (p) => ({
    sql: `SELECT * FROM all_students_options_show('${sqlText(p?.search)}', ${Number(p?.limit) || 25}, ${offsetOf(p, 25)}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),

  // ---- Dropdown option queries ----
  activity_type_options: 'SELECT ac_id, type AS activity_type FROM activity_type ORDER BY type',
  activity_options: 'SELECT act_id, activity_name FROM activity ORDER BY activity_name',
  subject_activity_options: 'SELECT sa.sub_act_id, CONCAT(a.activity_name, \' - \', s.name) AS sub_act_name FROM subject_activity sa JOIN activity a ON a.act_id = sa.act_id JOIN subjects s ON s.sub_id = sa.subject_id ORDER BY 2',

  // Subject dropdown for the SubjectActivity form. `subjects.sub_id` is aliased
  // to `subject_id` because the form's rowKey is `subject_id`.
  subjects: 'SELECT sub_id AS subject_id, name AS subject_name FROM subjects ORDER BY name',
};

/**
 * Returns the resolved entry for `name`, or null if not whitelisted.
 * Always returns the object shape: { sql, prePaginated }.
 *   - prePaginated=true  → SP handles search/limit/offset internally;
 *                          api.js skips the wrap-pagination layer.
 *   - prePaginated=false → api.js wraps with COUNT/LIMIT/OFFSET.
 */
function getQuery(name, params = {}) {
  const key = (name || '').trim().toLowerCase();
  if (!key) return null;
  const found = Object.keys(QUERIES).find((k) => k.toLowerCase() === key);
  if (!found) return null;
  const raw = QUERIES[found];
  const value = typeof raw === 'function' ? raw(params) : raw;
  if (value && typeof value === 'object' && typeof value.sql === 'string') {
    return { sql: value.sql, prePaginated: value.prePaginated === true };
  }
  return { sql: String(value), prePaginated: false };
}

module.exports = { getQuery };
