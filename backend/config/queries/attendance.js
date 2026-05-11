/**
 * Attendance queries — Student Attendance / Absents / Edit tabs.
 * Each entry maps a frontend `queryName` → SQL/SP call.
 */

module.exports = {
  // Student Attendance → ADD ATTENDENCE button.
  // SP: btn_student_class(cl_id, pr_id, reg_date)
  // Returns: id (std_cl_id), student, phone, reason, action, message
  // Frontend calls once per selected period; dedup by id is done client-side.
  // prePaginated: skip the api.js LIMIT-100 cap so all class students load.
  StudentAttendenceAdd: (p) => ({
    sql: `SELECT * FROM btn_student_class(${Number(p?.cl_id) || 0}, ${Number(p?.pr_id) || 0}, '${
      p?.attend_date || new Date().toISOString().slice(0, 10)
    }'::date)`,
    prePaginated: true,
  }),

  // Student Attendance → SHOW ATTENDENCE button.
  // SP: vw_student_attendance(p_reg_date, p_period, p_class, p_branch)
  // br_id is auto-injected by api.js handleDataRequest from the JWT.
  // Frontend calls once per selected period and concatenates results.
  StudentAttendence: (p) => ({
    sql: `SELECT * FROM vw_student_attendance('${
      p?.attend_date || new Date().toISOString().slice(0, 10)
    }'::date, ${Number(p?.pr_id) || 0}, ${Number(p?.cl_id) || 0}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),

  // Student Absents tab → SHOW STUDENT ABSENTS button.
  // SP: vw_student_absents(p_class_id)
  // Returns: id, student, phone, class_name, no_of_absent, message
  // Message-row pattern: when no absents exist, SP returns a single row with
  // id=NULL + message='not found' — the frontend filters this and surfaces
  // the message in the empty state.
  StudentAbsents: (p) => ({
    sql: `SELECT * FROM vw_student_absents(${Number(p?.cl_id) || 0})`,
    prePaginated: true,
  }),

  // Student Absent Detail modal → student name lookup.
  // SP: student_absent_table(p_std_id, 'name')
  // Returns one row with student_name; other columns NULL.
  StudentAbsentName: (p) => ({
    sql: `SELECT * FROM student_absent_table(${Number(p?.std_id) || 0}, 'name')`,
    prePaginated: true,
  }),

  // Student Absent Detail modal → list of absent records.
  // SP: student_absent_table(p_std_id, 'all')
  // Returns rows of (abs_date, day_name, state). When no absents exist, SP
  // emits a single message-row (all data fields NULL + message set) — the
  // frontend filters that and shows the message in the empty state.
  StudentAbsentDetails: (p) => ({
    sql: `SELECT * FROM student_absent_table(${Number(p?.std_id) || 0}, 'all')`,
    prePaginated: true,
  }),

  // Attendance Edit tab → EDIT button.
  // SP: vw_student_attendance_edit(p_from_date, p_to_date, p_std_id)
  // Returns: id (std_att_id), reg_date, day_name, pr_id, period_name,
  //          st_att_id, state, reason, message.
  // Message-row pattern: no records → single row with NULLs + message set.
  StudentAttendanceEdit: (p) => ({
    sql: `SELECT * FROM vw_student_attendance_edit('${p?.from_date || ''}'::date, '${p?.to_date || ''}'::date, ${Number(p?.std_id) || 0})`,
    prePaginated: true,
  }),
};
