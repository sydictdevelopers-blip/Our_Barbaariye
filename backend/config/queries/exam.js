/**
 * Exam Management queries — exam setting/registration/schedule, result, question bank.
 */
const { sqlText } = require('./_utils');

module.exports = {
  // Datatable lists
  ExamSetting: (p) => `SELECT * FROM exam_siting_show(${Number(p?.br_id) || 0})`,
  Exam: (p) => `SELECT * FROM exam_show(${Number(p?.br_id) || 0})`,
  ExamRegister: (p) => `SELECT s.*, er.a_y_id, er.ex_id FROM exam_reg_show(${Number(p?.br_id) || 0}, ${Number(p?.academicYearId) || 0}) s LEFT JOIN exam_reg er ON er.ex_reg_id = s.ex_reg_id`,
  AssignClassExam: (p) => `SELECT s.*, ass.er_id, ass.cl_id, ass.b_id FROM assign_class_exam_show_single(${Number(p?.cl_id) || 0}, ${Number(p?.b_id) || 0}, ${Number(p?.academicYearId) || 0}, ${Number(p?.br_id) || 0}) s LEFT JOIN assign_class_exam ass ON ass.a_c_ex = s."ID"`,
  // Show All button-ka tab-ka Assign Class Exam — academic + branch oo kaliya.
  AssignClassExamShowAll: (p) => ({
    sql: `SELECT s.*, ass.er_id, ass.cl_id, ass.b_id FROM assign_class_exam_show_all(${Number(p?.academicYearId) || 0}, ${Number(p?.br_id) || 0}) s LEFT JOIN assign_class_exam ass ON ass.a_c_ex = s."ID"`,
    prePaginated: true,
  }),
  // Add-new bulk form ee Assign Class Exam: liiska (class - batch) ee academic-ka
  // la doortay. prePaginated:true => api.js ma duubo COUNT/LIMIT/OFFSET, sidaas
  // darteed dhammaan rows-ka hal mar ayaa la soo celiyaa (degdeg badan).
  add_assing_class_exam_show: (p) => ({
    sql: `SELECT * FROM add_assing_class_exam_show(${Number(p?.academicYearId) || 0}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  ExamSchedule: (p) => `SELECT s.*, sch.d_id, sch.pr_id, sch.sub_cl_id, sch.sh_id, sch.cl_id, sch.ex_r_id FROM exam_schedule_show(${Number(p?.br_id) || 0}) s JOIN exam_schedule sch ON sch.ex_s_id = s.ex_s_id`,
  // Show Data button-ka tab-ka Exam Schedule — academic+exam+level filter ah.
  ExamSceduleShow: (p) => ({
    sql: `SELECT * FROM exam_sceduale_show(${Number(p?.academicYearId) || 0}, ${Number(p?.ex_id) || 0}, ${Number(p?.lev_id) || 0}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  // Subject-class options ee bulk form-ka Add New — soo celiya sub_cl_id +
  // label "Class - Subject" + cl_id + sh_id (loo isticmaalo exam_schedule_sp
  // insert). Filter ku xidh level + academic + branch.
  subject_class_by_level_options: (p) => `SELECT sc.sub_cl_id,
                                                 CONCAT(c.class, ' - ', s.name) AS label,
                                                 c.cl_id,
                                                 c.sh_id
                                            FROM subject_class sc
                                            JOIN class    c ON c.cl_id  = sc.cl_id
                                            JOIN subjects s ON s.sub_id = sc.sub_id
                                           WHERE c.lev_id = ${Number(p?.lev_id) || 0}
                                             AND sc.a_y_id = ${Number(p?.academicYearId) || 0}
                                             AND ((SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id) || 0}) ILIKE 'all'
                                                  OR c.br_id = ${Number(p?.br_id) || 0})
                                           ORDER BY c.class, s.name`,
  // Lookup ex_reg_id-ka u dhigma (academic, exam, branch) — bulk form-ka ayaa
  // ku xidha exam_schedule.ex_r_id. Haddii multiple exam_regs, hal ayaa la
  // dooraa (waa la kakala saaraa start_date desc).
  exam_reg_lookup: (p) => `SELECT er.ex_reg_id, er.ex_id, er.a_y_id, er.br_id, er.exam_type
                             FROM exam_reg er
                            WHERE er.a_y_id = ${Number(p?.academicYearId) || 0}
                              AND er.ex_id  = ${Number(p?.ex_id) || 0}
                              AND ((SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id) || 0}) ILIKE 'all'
                                   OR er.br_id = ${Number(p?.br_id) || 0})
                            ORDER BY er.start_date DESC NULLS LAST
                            LIMIT 1`,

  // Exams DISTINCT ee la xidhay class+batch+academic la doortay — loo isticmaalo
  // dropdown-ka "Remove By Class". Soo celiyaa ex_id (oo lala socdaa SP-ga
  // remove_assign_class_byclass_sp) iyo magaca exam-ka.
  exam_by_class_options: (p) => `SELECT DISTINCT e.ex_id, e.exam
                                   FROM assign_class_exam ace
                                   JOIN exam_reg er ON er.ex_reg_id = ace.er_id
                                   JOIN exam     e  ON e.ex_id     = er.ex_id
                                  WHERE ace.cl_id  = ${Number(p?.cl_id) || 0}
                                    AND ace.b_id   = ${Number(p?.b_id) || 0}
                                    AND er.a_y_id  = ${Number(p?.academicYearId) || 0}
                                    AND er.br_id   = ${Number(p?.br_id) || 0}
                                  ORDER BY e.exam`,
  // Exams DISTINCT ee leh exam_reg academic-kaas + branch-kaas — loo
  // isticmaalo dropdown-ka "Remove By Exam". Soo celiyaa ex_id (oo lala
  // socdaa SP-ga remove_assign_class_byexam_sp).
  exam_by_academic_options: (p) => `SELECT DISTINCT e.ex_id, e.exam
                                      FROM exam_reg er
                                      JOIN exam     e ON e.ex_id = er.ex_id
                                     WHERE er.a_y_id = ${Number(p?.academicYearId) || 0}
                                       AND er.br_id  = ${Number(p?.br_id) || 0}
                                     ORDER BY e.exam`,

  // Exam dropdowns. Marka academicYearId la gudbiyo, kaliya exam_reg-yada ku
  // jira academic-kaas ayaa la soo celiyaa — taas oo kala xidhid yeesha
  // dropdown-ka exam-ka iyo academic-ka la doortay (tab-ka Assign Class Exam).
  exam_reg_options: (p) => {
    const brId = Number(p?.br_id) || 0;
    const ayId = Number(p?.academicYearId) || 0;
    const ayFilter = ayId > 0 ? `AND er.a_y_id = ${ayId}` : '';
    return `SELECT er.ex_reg_id, CONCAT(e.exam, ' - ', er.exam_type) AS exam_reg_name
            FROM exam_reg er
            JOIN exam e ON e.ex_id = er.ex_id
            JOIN user_branch ub ON ub.u_br_id = er.u_br_id
            WHERE ((SELECT TRIM(br_name) FROM branch WHERE br_id = ${brId}) ILIKE 'all'
                   OR ub.br_id = ${brId})
              ${ayFilter}
            ORDER BY er.start_date DESC`;
  },
  exam_options: (p) => `SELECT e.ex_id, e.exam FROM exam e JOIN user_branch ub ON ub.u_br_id = e.u_br_id WHERE (SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id) || 0}) ILIKE 'all' OR ub.br_id = ${Number(p?.br_id) || 0} ORDER BY e.ordering, e.exam`,

  // Manage Result → Result tab (chained dropdowns: class → batch → academic → subject → exam)
  result_academic_options: (p) => `SELECT * FROM result_academic_options(${Number(p?.cl_id) || 0})`,
  result_subject_options: (p) => `SELECT * FROM result_subject_options(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0})`,
  result_exam_options: (p) => `SELECT * FROM vw_exam_res_all(${Number(p?.cl_id) || 0}, ${Number(p?.a_y_id) || 0}, ${Number(p?.br_id) || 0})`,
  // Result → ADD NEW: ardayda diyaarka u ah marks-galin (operation='std')
  ResultAddNew: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id) || 0}, ${Number(p?.academicYearId) || 0}, ${Number(p?.ex_id) || 0}, ${Number(p?.sub_id) || 0}, ${Number(p?.b_id) || 0}, 'std')`,
  // Result → SHOW/EDIT EXAM: liiska ardayda marks-ku haray (operation='update')
  Result: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id) || 0}, ${Number(p?.academicYearId) || 0}, ${Number(p?.ex_id) || 0}, ${Number(p?.sub_id) || 0}, ${Number(p?.b_id) || 0}, 'update')`,
  // Result → EDIT EXAM: same dataset as Result, but a separate entityKey so the UI
  // renders inline marks editing + GENERATE without sharing state with Show Exam.
  EditExam: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id) || 0}, ${Number(p?.academicYearId) || 0}, ${Number(p?.ex_id) || 0}, ${Number(p?.sub_id) || 0}, ${Number(p?.b_id) || 0}, 'update')`,

  // Approve Exam: rows where someone proposed a corrected mark (result.approve filled).
  // Filters: cl_id is optional — empty means all classes ("Show Data All").
  ApproveExam: (p) => {
    const filters = [`r.approve IS NOT NULL AND TRIM(r.approve) <> ''`];
    if (Number(p?.cl_id)) filters.push(`sc.cl_id = ${Number(p.cl_id)}`);
    return `
      SELECT r.r_id                      AS id,
             p.p_name                    AS student,
             cl.class                    AS class_name,
             su.name                     AS course,
             e.exam                      AS exam,
             r.marks::text               AS ex_result,
             r.approve                   AS new_result,
             COALESCE(u.username, '-')   AS username,
             sc.cl_id
      FROM result r
      JOIN student_class sc ON sc.std_cl_id = r.std_cl_id
      JOIN student       s  ON s.std_id     = sc.std_id
      JOIN people        p  ON p.p_id       = s.p_id
      JOIN class         cl ON cl.cl_id     = sc.cl_id
      JOIN subjects      su ON su.sub_id    = r.su_id
      JOIN exam_reg      er ON er.ex_reg_id = r.e_r_id
      JOIN exam          e  ON e.ex_id      = er.ex_id
      LEFT JOIN user_branch ub ON ub.u_br_id = r.editted_user
      LEFT JOIN users       u  ON u.usr_id   = ub.usr_id
      WHERE ${filters.join(' AND ')}
      ORDER BY p.p_name
    `;
  },
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
