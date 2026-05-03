/**
 * Student Office queries — student lists, images, responsibles, EMIS, state, info.
 */
const { sqlText, offsetOf } = require('./_utils');

module.exports = {
  Students: (p) => ({
    sql: `SELECT * FROM vw_student(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0}, ${Number(p?.b_id) || 0})`,
    prePaginated: true,
  }),
  StudentProfile: (p) => ({
    sql: `SELECT * FROM student_profile_show(${Number(p?.std_id) || 0})`,
    prePaginated: true,
  }),
  StudentImages: (p) => ({
    sql: `SELECT * FROM vw_student_image(${Number(p?.cl_id) || 0}, ${Number(p?.b_id) || 0}, ${Number(p?.a_y_id) || 0})`,
    prePaginated: true,
  }),
  ResponsiblesOneClass: (p) => ({
    sql: `SELECT * FROM update_all_responsibles_one_class(${Number(p?.cl_id) || 0}, ${Number(p?.br_id) || 0}, ${Number(p?.a_y_id) || 0})`,
    prePaginated: true,
  }),
  EmisIdCardList: (p) => ({
    sql: `SELECT * FROM update_emis_idcardlist(${Number(p?.cl_id) || 0}, ${Number(p?.br_id) || 0}, ${Number(p?.a_y_id) || 0})`,
    prePaginated: true,
  }),
  allResponsible: (p) => ({
    sql: `SELECT * FROM vw_responsible(${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  StudentResponsible: (p) => ({
    sql: `SELECT * FROM student_responsible(0, ${Number(p?.res_id) || 0}, 'show', ${Number(p?.u_br_id) || 0})`,
    prePaginated: true,
  }),
  showprentwithnostudents: 'SELECT * FROM responsible_with_no_student_show()',
  studentstate: (p) => `SELECT * FROM vw_student_state(${Number(p?.br_id) || 0})`,
  bus: (p) => `SELECT * FROM vw_bus(${Number(p?.br_id) || 0})`,
  Studentinfo: (p) => ({
    sql: `SELECT * FROM studentinfo_show(${Number(p?.std_id) || 0}, '${sqlText(p?.search)}', ${Number(p?.limit) || 10}, ${offsetOf(p, 10)}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  StudentinfoDuplicates: 'SELECT * FROM studentinfo_duplicates_show()',
  'update school': 'SELECT * FROM view_schools()',

  // Student-class info helpers (used in student detail panels).
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
};
