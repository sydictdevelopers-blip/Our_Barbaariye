/**
 * API Queries Config - Whitelist of allowed queries
 * Keys must match: crudConfig optionsKey (dropdowns) and menuConfig queryName (datatables).
 * DB: level_type table must exist and have rows so Level Setup "Level Type" dropdown has options.
 */
const QUERIES = {
  // ---- Dropdowns (optionsKey in crudConfig) – must return value + label columns for selects ----
  responsible_options: 'SELECT r.res_id, p.p_name FROM responsible r JOIN people p ON p.p_id = r.p_id ORDER BY p.p_name',
  all_student_options: `SELECT DISTINCT s.std_id, p.p_name FROM student s JOIN people p ON p.p_id = s.p_id JOIN student_class sc ON sc.std_id = s.std_id WHERE s.state = 'Active' AND sc.state = 'Continue' ORDER BY p.p_name`,
  level_type: 'SELECT l.l_ty_id, l.name AS level_name FROM level_type l ORDER BY l.name',
  levels: (p) => `SELECT lev_id, level FROM levels_show(${Number(p?.br_id) || 0}) ORDER BY level`,
  grades: 'SELECT gr_id, grade_name FROM grade ORDER BY gr_id',
  class_options: (p) => `SELECT cl_id, class FROM class WHERE br_id = ${Number(p?.br_id) || 0} ORDER BY class`,
  employee_options: 'SELECT e.emp_id, p.p_name FROM employee e JOIN people p ON p.p_id = e.p_id ORDER BY p.p_name',
  subject_options: 'SELECT sub_id, name FROM subjects ORDER BY name',
  subject_class_options: (p) => `SELECT sub_cl_id, subject_name FROM subject_class_show(${Number(p?.br_id) || 0}, ${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0}) ORDER BY subject_name`,
  shift_options: 'SELECT * FROM shift',
  student_options: (p) => `SELECT s.std_id, p.p_name FROM student s JOIN people p ON p.p_id = s.p_id JOIN student_class sc ON sc.std_id = s.std_id WHERE p.state = 'Active' AND sc.a_y_id = ${Number(p?.a_y_id) || 0} AND sc.cl_id = ${Number(p?.cl_id) || 0} ORDER BY p.p_name`,
  academic_options: 'SELECT a_y_id, academic_name FROM academic_year ac  ORDER BY a_y_id',
  accounts: 'SELECT * FROM accounts ORDER BY acc_id',
  gendersections: 'SELECT * FROM accounts ORDER BY acc_id',

  // ---- Datatable / entity queries (queryName in menuConfig) ----
  LevelSetup: (p) => `SELECT * FROM levels_show(${Number(p?.br_id) || 0})`,
  ClassSetup: (p) => {
    const brId = Number(p?.br_id) || 0;
    return `SELECT c.cl_id, c.class AS class_name, c.lev_id, lv.level AS level_name, c.gr_id, g.grade_name, c.sh_id, sh.shift AS shift_name, c.state, c.br_id, c.u_br_id, c.reg_date FROM class c LEFT JOIN (SELECT lev_id, level FROM levels_show(${brId})) lv ON lv.lev_id = c.lev_id LEFT JOIN grade g ON g.gr_id = c.gr_id LEFT JOIN shift sh ON sh.sh_id = c.sh_id WHERE c.br_id = ${brId} ORDER BY c.cl_id`;
  },
  ClassFormaster: (p) => {
    const brId = Number(p?.br_id) || 0;
    const ayId = Number(p?.academicYearId) || 0;
    return `SELECT cf.c_f_id, cf.cl_id, c.class AS class_name, cf.emp_id, p1.p_name AS person_name, cf.std_id, p2.p_name AS student_name, cf.a_y_id, ay.academic_name, cf.state, cf.reg_date, u.username FROM class_formaster cf JOIN class c ON c.cl_id = cf.cl_id JOIN employee em ON em.emp_id = cf.emp_id JOIN people p1 ON p1.p_id = em.p_id JOIN student s ON cf.std_id = s.std_id JOIN people p2 ON p2.p_id = s.p_id JOIN user_branch ub ON ub.u_br_id = cf.u_br_id JOIN users u ON u.usr_id = ub.usr_id LEFT JOIN academic_year ay ON ay.a_y_id = cf.a_y_id WHERE ub.br_id = ${brId} AND cf.a_y_id = ${ayId} ORDER BY cf.c_f_id`;
  },
  SubjectsSetup: 'SELECT * FROM subjects_show()',
  SubjectClassSetup: (p) => `SELECT * FROM subject_class_show(${Number(p?.br_id) || 0}, ${Number(p?.cl_id) || 0}, ${Number(p?.academicYearId) || 0})`,
  academicYeartab: 'SELECT * FROM academic_year_show() ORDER BY id',
  BranchTransfer: 'SELECT * FROM branch_transfer ORDER BY 1',
  AcademicTransfer: 'SELECT * FROM academic_transfer ORDER BY 1',
  ClassTransfer: 'SELECT * FROM class_transfer ORDER BY 1',
  TeacherSyllabus: (p) => `SELECT * FROM show_teacher_daily_sp(${Number(p?.cl_id) || 0}, ${Number(p?.sub_cl_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  LessonPlanRow: (p) => `SELECT lp.l_p_id, lp.emp_id, lp.sub_cl_id, lp.chap_id, lp.topic, lp.page, lp.description, lp.u_br_id, lp.reg_date, sc.cl_id, sc.a_y_id FROM lesson_plan lp JOIN subject_class sc ON sc.sub_cl_id = lp.sub_cl_id WHERE lp.l_p_id = ${Number(p?.l_p_id) || 0}`,
  LessonActivity: (p) => `SELECT lat.ac_t_id , lat.ac_id, act.type AS activity_name, lat.cl_id, c.class AS class_name, lat.sub_cl_id, su.name AS subject_name, lat.marks, lat.description, lat.deadline, lat.e_r_id, lat.reg_date FROM lesson_activity lat LEFT JOIN activity_type act ON act.ac_id = lat.ac_id LEFT JOIN class c ON c.cl_id = lat.cl_id LEFT JOIN subject_class sc ON sc.sub_cl_id = lat.sub_cl_id LEFT JOIN subjects su ON su.sub_id = sc.sub_id WHERE lat.cl_id = ${Number(p?.cl_id) || 0} AND sc.a_y_id = ${Number(p?.a_y_id) || 0} ORDER BY lat.ac_t_id`,
  LessonActivityRow: (p) => `SELECT lat.ac_t_id as ID, lat.ac_id, lat.cl_id, lat.sub_cl_id, lat.marks, lat.description, TO_CHAR(lat.deadline, 'YYYY-MM-DD') AS deadline, lat.e_r_id, sc.a_y_id FROM lesson_activity lat JOIN subject_class sc ON sc.sub_cl_id = lat.sub_cl_id WHERE lat.ac_t_id = ${Number(p?.ac_t_id) || 0}`,
  LessonActivityMark: 'SELECT * FROM lesson_activity_mark ORDER BY 1',
  LessonActivityResults: (p) => `SELECT * FROM show_lesson_activity_results_sp(${Number(p?.a_y_id)||0}, ${Number(p?.cl_id)||0}, ${Number(p?.b_id)||0}, ${Number(p?.sub_cl_id)||0}, ${Number(p?.ac_id)||0}, ${Number(p?.ex_reg_id)||0})`,
  LessonActivityResultRow: (p) => `SELECT lar.lar_id, lar.ac_t_id, lar.std_cl_id, lar.marks_obtained, lar.state FROM lesson_activity_result lar WHERE lar.lar_id = ${Number(p?.lar_id)||0}`,
  Students: 'SELECT * FROM students ORDER BY student_id',
  Responsible: 'SELECT * FROM responsible',
  StudentResponsible: (p) => `SELECT id, student, responsible, phone1, phone2 FROM student_responsible(0, ${Number(p?.res_id) || 0}, 'show', ${Number(p?.u_br_id) || 0}) WHERE student IS NOT NULL`,
  showprentwithnostudents: `SELECT r.res_id, p.p_name AS responsible_name, p.tel AS phone1, r.phone AS phone2 FROM responsible r JOIN people p ON p.p_id = r.p_id WHERE r.res_id NOT IN (SELECT DISTINCT s.res_id FROM student s JOIN student_class sc ON s.std_id = sc.std_id WHERE s.state = 'Active' AND sc.state = 'Continue') ORDER BY p.p_name`,
  studentstate: 'SELECT * FROM student_state ORDER BY 1',
  bus: 'SELECT * FROM bus ORDER BY 1',
  Studentinfo: 'SELECT * FROM students ORDER BY student_id',
  'update school': 'SELECT * FROM school ORDER BY 1',

  // ---- Activity Management ----
  Activity: 'SELECT * FROM activity ORDER BY act_id',
  SubjectActivity: 'SELECT sa.sub_act_id, sa.act_id, a.activity_name, sa.subject_id, s.subject_name, sa.max_marks, sa.state FROM subject_activity sa LEFT JOIN activity a ON a.act_id = sa.act_id LEFT JOIN subjects s ON s.subject_id = sa.subject_id ORDER BY sa.sub_act_id',
  StudentActivityEdit: 'SELECT sae.sta_id, sae.student_id, st.student_name, sae.sub_act_id, CONCAT(a.activity_name, \' - \', s.subject_name) AS subject_activity, sae.marks_obtained, sae.state FROM student_activity_edit sae LEFT JOIN students st ON st.student_id = sae.student_id LEFT JOIN subject_activity sa ON sa.sub_act_id = sae.sub_act_id LEFT JOIN activity a ON a.act_id = sa.act_id LEFT JOIN subjects s ON s.subject_id = sa.subject_id ORDER BY sae.sta_id',

  // ---- User management ----
  // Function-style entry — runtime params ayaa lagu soo gudbiyaa (br_id)
  Users: (p) => `SELECT * FROM users_show(${Number(p?.br_id) || 0})`,
  branch_options: 'SELECT br_id, br_name FROM branch ORDER BY br_name',
  batch_options: 'SELECT b_id, batch_name FROM batch ORDER BY batch_name',
  exam_options: 'SELECT ex_id, exam FROM exam ORDER BY ordering',
  student_class_options: (p) => `SELECT sc.std_cl_id, p.p_name FROM student_class sc JOIN student st ON st.std_id = sc.std_id JOIN people p ON p.p_id = st.p_id WHERE sc.a_y_id = ${Number(p?.a_y_id)||0} AND sc.cl_id = ${Number(p?.cl_id)||0} AND (${Number(p?.b_id)||0} = 0 OR sc.b_id = ${Number(p?.b_id)||0}) ORDER BY p.p_name`,
  lesson_activity_options: (p) => `SELECT la.ac_t_id, CONCAT(at.type, ' - ', su.name) AS activity_label FROM lesson_activity la JOIN activity_type at ON at.ac_id = la.ac_id JOIN subject_class sc ON sc.sub_cl_id = la.sub_cl_id JOIN subjects su ON su.sub_id = sc.sub_id WHERE la.cl_id = ${Number(p?.cl_id)||0} AND sc.a_y_id = ${Number(p?.a_y_id)||0} ORDER BY activity_label`,
  exam_reg_options: 'SELECT ex.ex_reg_id,e.exam FROM exam_reg ex, exam e where e.ex_id=ex.ex_id',
  people_options: 'SELECT p_id, p_name FROM people ORDER BY p_name',

  // ---- Dropdown option queries ----
  activity_type_options: 'SELECT ac_id, type AS activity_type FROM activity_type ORDER BY type',
  activity_options: 'SELECT act_id, activity_name FROM activity ORDER BY activity_name',
  subject_activity_options: 'SELECT sa.sub_act_id, CONCAT(a.activity_name, \' - \', s.subject_name) AS sub_act_name FROM subject_activity sa LEFT JOIN activity a ON a.act_id = sa.act_id LEFT JOIN subjects s ON s.subject_id = sa.subject_id ORDER BY 2',

  // Legacy / aliases
  students: 'SELECT * FROM students ORDER BY student_id',
  studentacademicyears: 'SELECT * FROM studentacademicyears ORDER BY studentacademicyear_id',
  student_classes: 'SELECT * FROM student_classes ORDER BY student_class_id',
  subjects: 'SELECT * FROM subjects ORDER BY subject_id',
  studentsubjects: 'SELECT * FROM studentsubjects ORDER BY studentsubject_id',
};

const DEFAULT_QUERY = 'accounts';

/** Returns SQL for name, or null if not whitelisted. Case-insensitive lookup. Function entries receive runtime params. */
function getQuery(name, params = {}) {
  const key = (name || '').trim().toLowerCase();
  if (!key) return null;
  const found = Object.keys(QUERIES).find((k) => k.toLowerCase() === key);
  if (!found) return null;
  const entry = QUERIES[found];
  return typeof entry === 'function' ? entry(params) : entry;
}

function getAvailableQueries() {
  return Object.entries(QUERIES).map(([id]) => ({
    id,
    label: id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  }));
}

module.exports = { getQuery, getAvailableQueries, QUERIES };
