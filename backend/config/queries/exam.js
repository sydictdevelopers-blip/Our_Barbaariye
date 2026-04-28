/**
 * Exam Management queries — exam setting/registration/schedule, result, question bank.
 */
const { sqlText } = require('./_utils');

module.exports = {
  // Datatable lists
  ExamSetting: (p) => `SELECT * FROM exam_siting_show(${Number(p?.br_id) || 0})`,
  Exam: (p) => `SELECT * FROM exam_show(${Number(p?.br_id) || 0})`,
  ExamRegister: (p) => `SELECT s.*, er.a_y_id, er.ex_id FROM exam_reg_show(${Number(p?.br_id)}, ${Number(p?.academicYearId)}) s LEFT JOIN exam_reg er ON er.ex_reg_id = s.ex_reg_id`,
  AssignClassExam: (p) => `SELECT s.*, ass.er_id, ass.cl_id, ass.b_id FROM assign_class_exam_show_single(${Number(p?.cl_id) || 0}, ${Number(p?.b_id) || 0}, ${Number(p?.academicYearId) || 0}, ${Number(p?.br_id) || 0}) s LEFT JOIN assign_class_exam ass ON ass.a_c_ex = s."ID"`,
  ExamSchedule: (p) => `SELECT s.*, sch.d_id, sch.pr_id, sch.sub_cl_id, sch.sh_id, sch.cl_id, sch.ex_r_id FROM exam_schedule_show(${Number(p?.br_id) || 0}) s JOIN exam_schedule sch ON sch.ex_s_id = s.ex_s_id`,

  // Exam dropdowns
  exam_reg_options: (p) => `SELECT er.ex_reg_id, CONCAT(e.exam, ' - ', er.exam_type) AS exam_reg_name FROM exam_reg er JOIN exam e ON e.ex_id = er.ex_id JOIN user_branch ub ON ub.u_br_id = er.u_br_id WHERE (SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id) || 0}) ILIKE 'all' OR ub.br_id = ${Number(p?.br_id) || 0} ORDER BY er.start_date DESC`,
  exam_options: (p) => `SELECT e.ex_id, e.exam FROM exam e JOIN user_branch ub ON ub.u_br_id = e.u_br_id WHERE (SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id) || 0}) ILIKE 'all' OR ub.br_id = ${Number(p?.br_id) || 0} ORDER BY e.ordering, e.exam`,

  // Manage Result → Result tab (chained dropdowns: class → batch → academic → subject → exam)
  result_academic_options: (p) => `SELECT * FROM result_academic_options(${Number(p?.cl_id) || 0})`,
  result_subject_options: (p) => `SELECT * FROM result_subject_options(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  result_exam_options: (p) => `SELECT * FROM vw_exam_res_all(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0}, ${Number(p?.br_id) || 0})`,
  // Result → ADD NEW: ardayda diyaarka u ah marks-galin (operation='std')
  ResultAddNew: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id) || 0}, ${Number(p?.academicYearId) || 0}, ${Number(p?.ex_id) || 0}, ${Number(p?.sub_id) || 0}, ${Number(p?.b_id) || 0}, 'std')`,
  // Result → SHOW/EDIT EXAM: liiska ardayda marks-ku haray (operation='update')
  Result: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id) || 0}, ${Number(p?.academicYearId) || 0}, ${Number(p?.ex_id) || 0}, ${Number(p?.sub_id) || 0}, ${Number(p?.b_id) || 0}, 'update')`,
  ResultMaximum: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id) || 0}, ${Number(p?.academicYearId) || 0}, ${Number(p?.ex_id) || 0}, ${Number(p?.sub_id) || 0}, ${Number(p?.b_id) || 0}, 'maximum')`,

  // Question bank — SHOW DATA listing for QuestionsTableTab (joins lookup tables for readable labels).
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
