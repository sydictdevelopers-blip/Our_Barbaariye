/**
 * Activity Management queries — performance lists, student activity edit.
 *
 * subject_activity.subject_id is a FK to subjects.sub_id (not subjects.subject_id —
 * subjects has no such column). The label `subject_name` is `subjects.name`.
 */

module.exports = {
  Performance: 'SELECT * FROM performance_show()',
  student_performance_option: (p) => `SELECT std_cl_id, student AS student_name FROM student_performance_select(${Number(p?.br_id) || 0})`,
  StudentPerformance: (p) => `SELECT * FROM student_performance_show(${Number(p?.br_id) || 0}, ${Number(p?.std_cl_id) || 0})`,
  StudentPerformanceEdit: 'SELECT sae.sta_id, sae.student_id, st.student_name, sae.sub_act_id, CONCAT(a.activity_name, \' - \', s.name) AS subject_activity, sae.marks_obtained, sae.state FROM student_activity_edit sae JOIN students st ON st.student_id = sae.student_id JOIN subject_activity sa ON sa.sub_act_id = sae.sub_act_id JOIN activity a ON a.act_id = sa.act_id JOIN subjects s ON s.sub_id = sa.subject_id ORDER BY sae.sta_id',
  student_performance: (p) => `SELECT * FROM vw_std_performance_all(${Number(p?.br_id) || 0})`,
};
