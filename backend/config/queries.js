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
  studentClass_info: (p) => `SELECT * FROM vw_studentClass_info(${Number(p?.std_id) || 0})`,
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
  academic_options: 'SELECT a_y_id, academic_name, state FROM academic_year ORDER BY a_y_id DESC',
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
  StudentImages: (p) => `SELECT * FROM vw_student_image(${Number(p?.cl_id) || 0}, ${Number(p?.b_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  ResponsiblesOneClass: (p) => `SELECT * FROM update_all_responsibles_one_class(${Number(p?.cl_id) || 0}, ${Number(p?.br_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  EmisIdCardList: (p) => `SELECT * FROM update_emis_idcardlist(${Number(p?.cl_id) || 0}, ${Number(p?.br_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  allResponsible: (p) => `SELECT * FROM vw_responsible(${Number(p?.br_id) || 0})`,
  StudentResponsible: (p) => `SELECT * FROM student_responsible(0, ${Number(p?.res_id) || 0}, 'show', ${Number(p?.u_br_id) || 0})`,
  showprentwithnostudents: 'SELECT * FROM responsible_with_no_student_show()',
  studentstate: (p) => `SELECT * FROM vw_student_state(${Number(p?.br_id) || 0})`,
  bus: (p) => `SELECT * FROM vw_bus(${Number(p?.br_id) || 0})`,
  Studentinfo: (p) => ({
    sql: `SELECT * FROM studentinfo_show(${Number(p?.std_id) || 0}, '${sqlText(p?.search)}', ${Number(p?.limit) || 10}, ${offsetOf(p, 10)}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  StudentinfoDuplicates: 'SELECT * FROM studentinfo_duplicates_show()',
  'update school': 'SELECT * FROM view_schools()',

  // ---- Activity Management ----
  // subject_activity.subject_id is a FK to subjects.sub_id (not subjects.subject_id —
  // subjects has no such column). The label `subject_name` is `subjects.name`.
  Performance: `SELECT * FROM performance_show()`,
  student_performance_option: (p) => `SELECT std_cl_id, student AS student_name FROM student_performance_select(${Number(p?.br_id) || 0})`,
  StudentPerformance: (p) => `SELECT * FROM student_performance_show(${Number(p?.br_id) || 0}, ${Number(p?.std_cl_id) || 0})`,
  StudentPerformanceEdit: 'SELECT sae.sta_id, sae.student_id, st.student_name, sae.sub_act_id, CONCAT(a.activity_name, \' - \', s.name) AS subject_activity, sae.marks_obtained, sae.state FROM student_activity_edit sae JOIN students st ON st.student_id = sae.student_id JOIN subject_activity sa ON sa.sub_act_id = sae.sub_act_id JOIN activity a ON a.act_id = sa.act_id JOIN subjects s ON s.sub_id = sa.subject_id ORDER BY sae.sta_id',

  // ---- Exam Management ----
  ExamSetting: (p) => `SELECT * FROM exam_siting_show(${Number(p?.br_id) || 0})`,
  Exam: (p) => `SELECT * FROM exam_show(${Number(p?.br_id) || 0})`,
  ExamRegister: (p) => `SELECT s.*, er.a_y_id, er.ex_id FROM exam_reg_show(${Number(p?.br_id)}, ${Number(p?.academicYearId)}) s LEFT JOIN exam_reg er ON er.ex_reg_id = s.ex_reg_id`,
  AssignClassExam: (p) => `SELECT s.*, ass.er_id, ass.cl_id, ass.b_id FROM assign_class_exam_show_single(${Number(p?.cl_id) || 0}, ${Number(p?.b_id) || 0}, ${Number(p?.academicYearId) || 0}, ${Number(p?.br_id) || 0}) s LEFT JOIN assign_class_exam ass ON ass.a_c_ex = s."ID"`,
  ExamSchedule: (p) => `SELECT s.*, sch.d_id, sch.pr_id, sch.sub_cl_id, sch.sh_id, sch.cl_id, sch.ex_r_id FROM exam_schedule_show(${Number(p?.br_id) || 0}) s JOIN exam_schedule sch ON sch.ex_s_id = s.ex_s_id`,

  // ---- User management ----
  // Function-style entry — runtime params ayaa lagu soo gudbiyaa (br_id)
  Users: (p) => `SELECT * FROM users_show(${Number(p?.br_id) || 0})`,
  branch_options: 'SELECT br_id, br_name FROM branch ORDER BY br_name',
  batch_options: (p) => (Number(p?.cl_id) > 0
    ? `SELECT * FROM vw_batch_by_class(${Number(p?.cl_id)})`
    : 'SELECT b_id, batch_name FROM batch ORDER BY batch_name'),
  student_class_options: (p) => `SELECT * FROM student_class_options_show(${Number(p?.a_y_id) || 0}, ${Number(p?.cl_id) || 0}, ${Number(p?.b_id) || 0})`,
  lesson_activity_options: (p) => `SELECT * FROM lesson_activity_options_show(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  exam_reg_options: (p) => `SELECT er.ex_reg_id, CONCAT(e.exam, ' - ', er.exam_type) AS exam_reg_name FROM exam_reg er JOIN exam e ON e.ex_id = er.ex_id JOIN user_branch ub ON ub.u_br_id = er.u_br_id WHERE (SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id) || 0}) ILIKE 'all' OR ub.br_id = ${Number(p?.br_id) || 0} ORDER BY er.start_date DESC`,
  exam_options: (p) => `SELECT e.ex_id, e.exam FROM exam e JOIN user_branch ub ON ub.u_br_id = e.u_br_id WHERE (SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id) || 0}) ILIKE 'all' OR ub.br_id = ${Number(p?.br_id) || 0} ORDER BY e.ordering, e.exam`,
  day_options: 'SELECT d_id, day FROM day ORDER BY d_id',
  period_options: 'SELECT pr_id, period FROM period ORDER BY pr_id',
  class_simple_options: (p) => `SELECT cl_id, class_name FROM class_show(${Number(p?.br_id) || 0}) ORDER BY class_name`,
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
  performance_options: 'SELECT per_id, performance_name FROM performance ORDER BY performance_name',
  rate_options: 'SELECT rate_id, rate FROM rate ORDER BY rate',
  student_performance: (p) => `SELECT * FROM vw_std_performance_all(${Number(p?.br_id) || 0})`,

  // Subject dropdown for the SubjectActivity form. `subjects.sub_id` is aliased
  // to `subject_id` because the form's rowKey is `subject_id`.
  subjects: 'SELECT sub_id AS subject_id, name AS subject_name FROM subjects ORDER BY name',
  chapter_options:'SELECT ch.chap_id id,ch.chapter name FROM chapters ch',
  category_options: 'SELECT ec.ex_c_id id,ec.exam name FROM exam_category ec',
  grade_options:'SELECT g.gr_id,g.grade_name  FROM grade g',

  // SHOW DATA listing for QuestionsTableTab — joins lookup tables for readable labels.
  // All filters are optional; if a filter is 0/missing, that constraint is skipped.
  question_bank_show: (p) => {
    const filters = [];
    if (Number(p?.gr_id))   filters.push(`qb.gr_id   = ${Number(p.gr_id)}`);
    if (Number(p?.su_id))   filters.push(`qb.su_id   = ${Number(p.su_id)}`);
    if (Number(p?.chap_id)) filters.push(`qb.chap_id = ${Number(p.chap_id)}`);
    if (Number(p?.ex_c_id)) filters.push(`qb.ex_c_id = ${Number(p.ex_c_id)}`);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    return `SELECT qb.q_b_id, qb.gr_id, qb.su_id, qb.chap_id, qb.ex_c_id, qb.question,
                   ec.exam      AS category,
                   c.chapter    AS chapter,
                   s.name       AS subject,
                   g.grade_name AS grade,
                   qb.reg_date
            FROM question_bank qb
            LEFT JOIN exam_category ec ON ec.ex_c_id = qb.ex_c_id
            LEFT JOIN chapters c       ON c.chap_id  = qb.chap_id
            LEFT JOIN subjects s       ON s.sub_id   = qb.su_id
            LEFT JOIN grade g          ON g.gr_id    = qb.gr_id
            ${where}
            ORDER BY qb.reg_date DESC, qb.q_b_id DESC`;
  },

  // Lookup the most-recently-inserted question_bank row matching the
  // 4-field uniqueness key (used by /api/bulk Circle insert chain).
  question_bank_last_id: (p) => `SELECT q_b_id FROM question_bank
    WHERE ex_c_id = ${Number(p?.ex_c_id) || 0}
      AND chap_id = ${Number(p?.chap_id) || 0}
      AND su_id   = ${Number(p?.su_id) || 0}
      AND question = '${sqlText(p?.question)}'
    ORDER BY reg_date DESC, q_b_id DESC LIMIT 1`,

  // All answers for a question (Circle/TF edit reload + cascade delete).
  question_answers_by_qbid: (p) => `SELECT qu_a_id, q_b_id, answer, state
    FROM question_answers
    WHERE q_b_id = ${Number(p?.q_b_id) || 0}
    ORDER BY qu_a_id`,

  // Exam Instructions list (uses the vw_exam_in PG function).
  exam_in_show: (p) => `SELECT * FROM vw_exam_in(${Number(p?.u_br_id) || 0})`,
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
