/**
 * Exam Management queries — exam setting/registration/schedule, result, question bank.
 */
const { sqlText } = require('./_utils');

module.exports = {
  // Datatable lists
  // Exam Service → Room tab. SP `rooms_show(br_id)` waxay soo celisaa
  // (r_id, room_name, no_of_students, no_of_teachers, username). Haddii rows-ku
  // ay madhan yihiin, SP-ga gudaha ayaa soo celiya alerts.body 'NotFound'.
  Room: (p) => `SELECT * FROM rooms_show(${Number(p?.br_id)})`,
  // Assign Student Room → SHOW button.
  // SP `assign_student_room_show(br_id)` wuxuu soo celiyaa display rows.
  // Wrapper-kani wuxuu JOIN-gareeyaa underlying assign_student_room + exam_reg
  // si loo filterro ro_id (Room) iyo a_y_id (Academic Year) marka user-ka
  // page-ka filter-yada uu doorto. 0 = no filter for that dimension.
  AssignStudentRoom: (p) => `SELECT s.*, asr.ro_id AS r_id, er.a_y_id
                               FROM assign_student_room_show(${Number(p?.br_id) || 0}) s
                               JOIN assign_student_room asr ON asr.ass_std_ro_id = s.ass_std_ro_id
                               LEFT JOIN exam_reg er ON er.ex_reg_id = asr.e_r_id
                              WHERE (${Number(p?.r_id) || 0} = 0 OR asr.ro_id = ${Number(p?.r_id) || 0})
                                AND (${Number(p?.academicYearId) || 0} = 0 OR er.a_y_id = ${Number(p?.academicYearId) || 0})
                              ORDER BY s.ass_std_ro_id`,
  // Exam Attendence → SHOW ATTENDENCE button.
  ExamAttendence: (p) => `SELECT * FROM exam_attendence_show(${Number(p?.academicYearId) || 0}, ${Number(p?.r_id) || 0}, ${Number(p?.ex_id) || 0}, ${Number(p?.sh_id) || 0}, ${Number(p?.sub_id) || 0}, '${(p?.attend_date || '').replace(/'/g, "''")}', ${Number(p?.br_id) || 0})`,
  // Assign Teacher Room → SHOW button.
  AssignTeacherRoom: (p) => `SELECT * FROM assign_teacher_room_show(${Number(p?.emp_id) || 0}, ${Number(p?.ex_id) || 0}, ${Number(p?.br_id) || 0})`,
  ExamSetting: (p) => `SELECT * FROM exam_siting_show(${Number(p?.br_id)})`,
  Exam: (p) => `SELECT * FROM exam_show(${Number(p?.br_id)})`,
  ExamRegister: (p) => `SELECT * FROM exam_reg_show(${Number(p?.br_id)}, ${Number(p?.academicYearId)})`,
  AssignClassExam: (p) => `SELECT s.*, ass.er_id, ass.cl_id, ass.b_id FROM assign_class_exam_show_single(${Number(p?.cl_id)}, ${Number(p?.b_id)}, ${Number(p?.academicYearId)}, ${Number(p?.br_id)}) s LEFT JOIN assign_class_exam ass ON ass.a_c_ex = s."ID"`,
  // Liiska (a_c_ex, cl_id, b_id) ee horeey loo xareeyey exam_reg gaar ah — loo
  // isticmaalo edit-ka modal-ka Exam Registration. Si performance loo ilaaliyo
  // ma joini meynno class/batch labels — frontend-ka ayaa ka heli doona labels-ka
  // option list-ka (add_assing_class_exam_show) oo durba la rarayo.
  assign_class_exam_by_er: (p) => `SELECT a_c_ex, cl_id, b_id
                                     FROM assign_class_exam
                                    WHERE er_id = ${Number(p?.er_id) || 0}`,
  // Show All button-ka tab-ka Assign Class Exam — academic + branch oo kaliya.
  AssignClassExamShowAll: (p) => ({
    sql: `SELECT s.*, ass.er_id, ass.cl_id, ass.b_id FROM assign_class_exam_show_all(${Number(p?.academicYearId)}, ${Number(p?.br_id)}) s LEFT JOIN assign_class_exam ass ON ass.a_c_ex = s."ID"`,
    prePaginated: true,
  }),
  // Add-new bulk form ee Assign Class Exam: liiska (class - batch) ee academic-ka
  // la doortay. prePaginated:true => api.js ma duubo COUNT/LIMIT/OFFSET, sidaas
  // darteed dhammaan rows-ka hal mar ayaa la soo celiyaa (degdeg badan).
  add_assing_class_exam_show: (p) => ({
    sql: `SELECT * FROM add_assing_class_exam_show(${Number(p?.academicYearId)}, ${Number(p?.br_id)})`,
    prePaginated: true,
  }),
  ExamSchedule: (p) => `SELECT s.*, sch.d_id, sch.pr_id, sch.sub_cl_id, sch.sh_id, sch.cl_id, sch.ex_r_id FROM exam_schedule_show(${Number(p?.br_id)}) s JOIN exam_schedule sch ON sch.ex_s_id = s.ex_s_id`,
  // Pivot ee Print Exam Schedule report — one row per (day, exam_date),
  // periods 1..6 noqdaan columns (period_N + duration_N).
  // SP signature: exam_schedule_pivot(p_lev_id, p_ex_r_id, p_br_id).
  ExamSchedulePivot: (p) => ({
    sql: `SELECT * FROM exam_schedule_pivot(${Number(p?.lev_id) || 0}, ${Number(p?.ex_r_id) || 0}, ${Number(p?.br_id) || 0})`,
    prePaginated: true,
  }),
  // Show Data button-ka tab-ka Exam Schedule — academic+exam+level filter ah.
  ExamSceduleShow: (p) => ({
    sql: `SELECT * FROM exam_sceduale_show(${Number(p?.academicYearId)}, ${Number(p?.ex_id)}, ${Number(p?.lev_id)}, ${Number(p?.br_id)})`,
    prePaginated: true,
  }),
  // Subject options ee bulk form-ka "Exam Schedule" Add New.
  // SP subject_by_level_academic_show waxay return-gareysaa (sub_id, label)
  // DISTINCT subjects-ka. Wrapper-kani LATERAL JOIN ah ayuu kaga soo qaadayaa
  // sub_cl_id/cl_id/sh_id ugu horreeya ee form-ku u baahan yahay si schedule
  // loo kaydiyo.
  subject_class_by_level_options: (p) => `
    SELECT s.sub_id,
           s.label,
           link.sub_cl_id,
           link.cl_id,
           link.sh_id
      FROM subject_by_level_academic_show(
              ${Number(p?.lev_id) || 0},
              ${Number(p?.academicYearId) || 0},
              ${Number(p?.br_id) || 0}
           ) s
      JOIN LATERAL (
        SELECT sc.sub_cl_id, c.cl_id, c.sh_id
          FROM subject_class sc
          JOIN class c ON c.cl_id = sc.cl_id
         WHERE sc.sub_id  = s.sub_id
           AND sc.a_y_id  = ${Number(p?.academicYearId) || 0}
           AND c.lev_id   = ${Number(p?.lev_id) || 0}
           AND c.br_id    = ${Number(p?.br_id) || 0}
         ORDER BY sc.sub_cl_id
         LIMIT 1
      ) link ON true
     ORDER BY s.label
  `,
  // Lookup ex_reg_id-ka u dhigma (academic, exam, branch) — bulk form-ka ayaa
  // ku xidha exam_schedule.ex_r_id. Haddii multiple exam_regs, hal ayaa la
  // dooraa (waa la kakala saaraa start_date desc).
  exam_reg_lookup: (p) => `SELECT er.ex_reg_id, er.ex_id, er.a_y_id, er.br_id, er.exam_type
                             FROM exam_reg er
                            WHERE er.a_y_id = ${Number(p?.academicYearId)}
                              AND er.ex_id  = ${Number(p?.ex_id)}
                              AND ((SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id)}) ILIKE 'all'
                                   OR er.br_id = ${Number(p?.br_id)})
                            ORDER BY er.start_date DESC NULLS LAST
                            LIMIT 1`,

  // Exams DISTINCT ee la xidhay class+batch+academic la doortay — loo isticmaalo
  // dropdown-ka "Remove By Class". Soo celiyaa ex_id (oo lala socdaa SP-ga
  // remove_assign_class_byclass_sp) iyo magaca exam-ka.
  // Branch filter: "All" branch (br_name='All') wuxuu match-gareeyaa dhammaan
  // branches. Haddii kale, kaliya exam_reg-yada specific branch-ka ah ayaa muuqda.
  exam_by_class_options: (p) => `SELECT DISTINCT e.ex_id, e.exam
                                   FROM assign_class_exam ace
                                   JOIN exam_reg er ON er.ex_reg_id = ace.er_id
                                   JOIN exam     e  ON e.ex_id     = er.ex_id
                                  WHERE ace.cl_id  = ${Number(p?.cl_id)}
                                    AND ace.b_id   = ${Number(p?.b_id)}
                                    AND er.a_y_id  = ${Number(p?.academicYearId)}
                                    AND ((SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id)}) ILIKE 'all'
                                         OR er.br_id = ${Number(p?.br_id)})
                                  ORDER BY e.exam`,
  // Exams DISTINCT ee leh exam_reg academic-kaas + branch-kaas — loo
  // isticmaalo dropdown-ka "Remove By Exam". Soo celiyaa ex_id (oo lala
  // socdaa SP-ga remove_assign_class_byexam_sp).
  exam_by_academic_options: (p) => `SELECT DISTINCT e.ex_id, e.exam
                                      FROM exam_reg er
                                      JOIN exam     e ON e.ex_id = er.ex_id
                                     WHERE er.a_y_id = ${Number(p?.academicYearId)}
                                       AND ((SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id)}) ILIKE 'all'
                                            OR er.br_id = ${Number(p?.br_id)})
                                     ORDER BY e.exam`,

  // Exam dropdowns. Marka academicYearId la gudbiyo, kaliya exam_reg-yada ku
  // jira academic-kaas ayaa la soo celiyaa — taas oo kala xidhid yeesha
  // dropdown-ka exam-ka iyo academic-ka la doortay (tab-ka Assign Class Exam).
  exam_reg_options: (p) => {
    const brId = Number(p?.br_id);
    const ayId = Number(p?.academicYearId);
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
  exam_options: (p) => `SELECT e.ex_id, e.exam FROM exam e JOIN user_branch ub ON ub.u_br_id = e.u_br_id WHERE (SELECT TRIM(br_name) FROM branch WHERE br_id = ${Number(p?.br_id)}) ILIKE 'all' OR ub.br_id = ${Number(p?.br_id)} ORDER BY e.ordering, e.exam`,

  // Manage Result → Result tab (chained dropdowns: class → batch → academic → subject → exam)
  result_academic_options: (p) => `SELECT * FROM result_academic_options(${Number(p?.cl_id)})`,
  result_subject_options: (p) => `SELECT * FROM result_subject_options(${Number(p?.cl_id)}, ${Number(p?.a_y_id)})`,
  category_options: (p) => `SELECT q_cat_id, category FROM question_category ORDER BY category`,
  result_exam_options: (p) => `SELECT * FROM vw_exam_res_all(${Number(p?.cl_id)}, ${Number(p?.a_y_id)}, ${Number(p?.br_id)})`,
  // Result → ADD NEW: ardayda diyaarka u ah marks-galin (operation='std')
  ResultAddNew: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id)}, ${Number(p?.academicYearId)}, ${Number(p?.ex_id)}, ${Number(p?.sub_id)}, ${Number(p?.b_id)}, 'std')`,
  // Result → SHOW/EDIT EXAM: liiska ardayda marks-ku haray (operation='update')
  Result: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id)}, ${Number(p?.academicYearId)}, ${Number(p?.ex_id)}, ${Number(p?.sub_id)}, ${Number(p?.b_id)}, 'update')`,
  // Result → EDIT EXAM: same dataset as Result, but a separate entityKey so the UI
  // renders inline marks editing + GENERATE without sharing state with Show Exam.
  EditExam: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id)}, ${Number(p?.academicYearId)}, ${Number(p?.ex_id)}, ${Number(p?.sub_id)}, ${Number(p?.b_id)}, 'update')`,

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
  ResultMaximum: (p) => `SELECT * FROM btn_insert_exam(${Number(p?.cl_id)}, ${Number(p?.academicYearId)}, ${Number(p?.ex_id)}, ${Number(p?.sub_id)}, ${Number(p?.b_id)}, 'maximum')`,

  // Question bank — SHOW DATA listing via vw_question_bank() PG function.
  //   oper='Direct'   -> id, question, username, reg_date           (no answers)
  //   oper='Multiple' -> + answer, state                            (one row per answer)
  // When zero rows match, the function emits a single (id=0, message=alert.body) row;
  // the caller renders the message and treats results as empty.
  question_bank_view: (p) => {
    const ec   = Number(p?.ex_c_id) || 0;
    const ch   = Number(p?.chap_id) || 0;
    const su   = Number(p?.su_id)   || 0;
    const gr   = Number(p?.gr_id)   || 0;
    const br   = Number(p?.br_id)   || 0;
    const oper = p?.oper === 'Multiple' ? 'Multiple' : 'Direct';
    return `SELECT * FROM vw_question_bank(${ec}, ${ch}, ${su}, ${gr}, '${oper}', ${br})`;
  },

  // Legacy shape (kept for any caller still relying on the LEFT-JOIN listing).
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
    WHERE ex_c_id = ${Number(p?.ex_c_id)}
      AND chap_id = ${Number(p?.chap_id)}
      AND su_id   = ${Number(p?.su_id)}
      AND question = '${sqlText(p?.question)}'
    ORDER BY reg_date DESC, q_b_id DESC LIMIT 1`,

  // All answers for a question (Circle/TF edit reload + cascade delete).
  question_answers_by_qbid: (p) => `SELECT qu_a_id, q_b_id, answer, state
    FROM question_answers
    WHERE q_b_id = ${Number(p?.q_b_id)}
    ORDER BY qu_a_id`,

  // Exam Instructions list (uses the vw_exam_in PG function — takes br_id).
  exam_in_show: (p) => `SELECT * FROM vw_exam_in(${Number(p?.br_id)})`,
};
