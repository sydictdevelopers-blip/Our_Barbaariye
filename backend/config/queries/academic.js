/**
 * Academic Office queries — class/subject/batch setup, transfers, lesson plan, lesson activity.
 */

module.exports = {
  LevelSetup: (p) => `SELECT * FROM levels_show(${Number(p?.br_id)})`,
  ClassSetup: (p) => `SELECT * FROM class_show(${Number(p?.br_id)})`,
  ClassFormaster: (p) => `SELECT * FROM class_formaster_show(${Number(p?.br_id)}, ${Number(p?.academicYearId)})`,
  SubjectsSetup: 'SELECT * FROM subjects_show()',
  SubjectClassSetup: (p) => `SELECT * FROM subject_class_show(${Number(p?.br_id)}, ${Number(p?.cl_id)}, ${Number(p?.academicYearId)})`,
  academicYeartab: 'SELECT * FROM academic_year_show() ORDER BY id',

  // Transfers
  BranchTransfer: 'SELECT * FROM branch_transfer ORDER BY 1',
  AcademicTransfer: 'SELECT * FROM academic_transfer ORDER BY 1',
  ClassTransfer: 'SELECT * FROM class_transfer ORDER BY 1',

  // Teacher syllabus / Lesson plan / Lesson activity
  TeacherSyllabus: (p) => `SELECT * FROM show_teacher_daily_sp(${Number(p?.cl_id)}, ${Number(p?.sub_cl_id)}, ${Number(p?.a_y_id)})`,
  LessonPlanRow: (p) => `SELECT * FROM lesson_plan_row_show(${Number(p?.l_p_id)})`,
  LessonActivity: (p) => `SELECT * FROM lesson_activity_show(${Number(p?.cl_id)}, ${Number(p?.a_y_id)})`,
  LessonActivityRow: (p) => `SELECT * FROM lesson_activity_row_show(${Number(p?.ac_t_id)})`,
  LessonActivityMark: 'SELECT * FROM lesson_activity_mark ORDER BY 1',
  LessonActivityResults: (p) => `SELECT * FROM show_lesson_activity_results_sp(${Number(p?.a_y_id)}, ${Number(p?.cl_id)}, ${Number(p?.b_id)}, ${Number(p?.sub_cl_id)}, ${Number(p?.ac_id)}, ${Number(p?.ex_reg_id)})`,
  LessonActivityResultRow: (p) => `SELECT lar.lar_id, lar.ac_t_id, lar.std_cl_id, lar.marks_obtained, lar.state FROM lesson_activity_result lar WHERE lar.lar_id = ${Number(p?.lar_id)}`,
};
