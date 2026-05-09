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
  // Single-row fetch for the StudentRegister edit form. Column names match the
  // field.rowKey / field.nameKey of CRUD_CONFIG.StudentRegister so generic
  // fromRow() can populate the modal with no custom mapping.
  StudentEdit: (p) => ({
    sql: `SELECT * FROM student_edit_show(${Number(p?.std_id) || 0}, ${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0})`,
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
  // Single-row fetch for the Responsible edit modal. vw_responsible only exposes
  // {id, responsible, phone1, phone2} — not enough to populate the full edit form
  // (sex, ad_id, p_id). This query joins people + address to return everything
  // the modal needs, keyed off res_id.
  ResponsibleEdit: (p) => ({
    sql: `SELECT r.res_id, r.p_id, p.p_name AS responsible_name, p.tel, r.phone, p.sex,
                 p.ad_id, p.ad_id AS add_id,
                 (SELECT concat(a.district, ' - ', a.village) FROM address a WHERE a.add_id = p.ad_id) AS address_name,
                 r.state
            FROM responsible r
            JOIN people p ON p.p_id = r.p_id
           WHERE r.res_id = ${Number(p?.res_id) || 0}`,
    prePaginated: true,
  }),
  StudentResponsible: (p) => ({
    sql: `SELECT * FROM student_responsible(0, ${Number(p?.res_id) || 0}, 'show', ${Number(p?.u_br_id) || 0})`,
    prePaginated: true,
  }),
  showprentwithnostudents: 'SELECT * FROM responsible_with_no_student_show()',
  studentstate: (p) => `SELECT * FROM vw_student_state(${Number(p?.br_id) || 0})`,
  bus: (p) => `SELECT * FROM vw_bus(${Number(p?.br_id) || 0})`,
  // Single-row fetch for the Bus edit modal. vw_bus exposes display labels
  // (driver_name, plot_no) but not the FK columns the form needs (emp_id,
  // targo). This query returns the raw bus row + a joined employee_name so
  // the dropdown can show the driver's name as the selected label.
  BusEdit: (p) => ({
    sql: `SELECT b.bus_id, b.bus_name, b.emp_id, b.targo, b.u_br_id,
                 (SELECT pe.p_name FROM employee e JOIN people pe ON pe.p_id = e.p_id WHERE e.emp_id = b.emp_id) AS employee_name
            FROM bus b
           WHERE b.bus_id = ${Number(p?.bus_id) || 0}`,
    prePaginated: true,
  }),
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
