/**
 * Dropdowns / option queries — used by Select2 lazy loaders.
 * Each entry returns (value, label) columns suitable for a dropdown.
 */
const { sqlText, offsetOf } = require('./_utils');

module.exports = {
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
  branch_options: 'SELECT br_id, br_name FROM branch ORDER BY br_name',
  batch_options: (p) => (Number(p?.cl_id) > 0
    ? `SELECT * FROM vw_batch_by_class(${Number(p?.cl_id)})`
    : 'SELECT b_id, batch_name FROM batch ORDER BY batch_name'),
  // Batches kaliya kuwa leh students-ka academic-ka iyo branch-ka la doortay
  // (Generate Exam Form). DISTINCT JOIN student_class → kaliya batches-ka
  // ka jira xogta dhabta ah ayaa muuqda — sidaas darteed user-ku ma muujiyo
  // batch aanu jirin ardayda academic-kaas.
  batch_by_academic_options: (p) => `SELECT DISTINCT b.b_id, b.batch_name
                                       FROM batch b
                                       JOIN student_class sc ON sc.b_id = b.b_id
                                       JOIN class c          ON c.cl_id = sc.cl_id
                                      WHERE sc.a_y_id = ${Number(p?.academicYearId) || 0}
                                        AND c.br_id   = ${Number(p?.br_id) || 0}
                                      ORDER BY b.batch_name`,
  student_class_options: (p) => `SELECT * FROM student_class_options_show(${Number(p?.a_y_id) || 0}, ${Number(p?.cl_id) || 0}, ${Number(p?.b_id) || 0})`,
  lesson_activity_options: (p) => `SELECT * FROM lesson_activity_options_show(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0})`,
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
  activity_type_options: 'SELECT ac_id, type AS activity_type FROM activity_type ORDER BY type',
  activity_options: 'SELECT act_id, activity_name FROM activity ORDER BY activity_name',
  subject_activity_options: 'SELECT sa.sub_act_id, CONCAT(a.activity_name, \' - \', s.name) AS sub_act_name FROM subject_activity sa JOIN activity a ON a.act_id = sa.act_id JOIN subjects s ON s.sub_id = sa.subject_id ORDER BY 2',
  performance_options: 'SELECT per_id, performance_name FROM performance ORDER BY performance_name',
  rate_options: 'SELECT rate_id, rate FROM rate ORDER BY rate',
  // subjects.sub_id aliased to subject_id for SubjectActivity form rowKey.
  subjects: 'SELECT sub_id AS subject_id, name AS subject_name FROM subjects ORDER BY name',
  chapter_options: 'SELECT ch.chap_id id, ch.chapter name FROM chapters ch',
  category_options: 'SELECT ec.ex_c_id id, ec.exam name FROM exam_category ec',
  grade_options: 'SELECT g.gr_id, g.grade_name FROM grade g',

  // ----- Student registration dropdown sources -----
  enroll_type_options:           'SELECT en_ty_id, type AS enroll_type FROM enroll_type ORDER BY en_ty_id',
  // Faxlid sii fudud — kaliya 8-da magac ee Soomaaliyeed ee laga rabo arday-registration.
  responsible_relation_options: `
    SELECT r_r_id, relationtype AS relation_name
      FROM responsible_relation
     WHERE relationtype IN ('Hooyo','Aabo','Aboowe','Abaayo','Adeer','Abti','Eedo','Habaryar')
     ORDER BY CASE relationtype
              WHEN 'Hooyo' THEN 1 WHEN 'Aabo'  THEN 2
              WHEN 'Aboowe' THEN 3 WHEN 'Abaayo' THEN 4
              WHEN 'Adeer' THEN 5 WHEN 'Abti' THEN 6
              WHEN 'Eedo'  THEN 7 WHEN 'Habaryar' THEN 8
              END`,
  type_fee_options:              'SELECT t_f_id, type AS type_fee_name FROM type_fee ORDER BY t_f_id',
  // Branch-aware bus list. Always prepend the global 'None' sentinel so the form
  // can use it to mean "no bus assigned" — bus_fee then hides on the frontend
  // and the SP forces bus_fee=0 server-side. vw_bus(p_branch) emits one synthetic
  // row with id=NULL when empty — filter that out.
  bus_options: (p) => `
    SELECT id, bus_name FROM (
      (SELECT 0 AS sort_key, b.bus_id AS id, b.bus_name
         FROM bus b
        WHERE lower(b.bus_name) = 'none'
        ORDER BY b.bus_id
        LIMIT 1)
      UNION ALL
      SELECT 1 AS sort_key, v.id, v.bus_name
        FROM vw_bus(${Number(p?.br_id) || 0}) v
       WHERE v.id IS NOT NULL AND lower(v.bus_name) <> 'none'
    ) t
    ORDER BY t.sort_key, t.bus_name
  `,
  student_type_fee_options: 'SELECT st_ty_id, type_fee AS type_fee_name FROM student_type_fee ORDER BY type_fee',
};
