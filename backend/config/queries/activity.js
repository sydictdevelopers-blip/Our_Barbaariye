/**
 * Activity Management queries — performance lists, student activity edit.
 *
 * subject_activity.subject_id is a FK to subjects.sub_id (not subjects.subject_id —
 * subjects has no such column). The label `subject_name` is `subjects.name`.
 */

// Escape single quotes for safe SQL string-literal interpolation.
const sqlText = (s) => `'${String(s ?? '').replace(/'/g, "''")}'`;

module.exports = {
  Performance: 'SELECT * FROM performance_show()',
  // Student dropdown — fast for both first-open and search:
  //   * No search → student_performance_select(branch) + ORDER BY std_cl_id DESC
  //     LIMIT, planner stops after the first 100 rows.
  //   * With search → bypass the SP and run the inlined JOIN with ILIKE on
  //     p.p_name directly so the trigram index (idx_people_p_name_trgm) is
  //     used. Multi-word search is split: "ahmed saadaq" becomes
  //     p_name ILIKE '%ahmed%' AND p_name ILIKE '%saadaq%' — order-independent.
  // prePaginated=true → api.js skips its outer COUNT/LIMIT (one DB pass).
  student_performance_option: (p) => {
    const br     = Number(p?.br_id);
    const limit  = Math.min(500, Math.max(1, Number(p?.limit) || 100));
    const search = String(p?.search ?? '').trim();
    if (!search) {
      return {
        sql: `SELECT std_cl_id, student AS student_name
                FROM student_performance_select(${br})
               ORDER BY std_cl_id DESC
               LIMIT ${limit}`,
        prePaginated: true,
      };
    }
    const words = search.split(/\s+/).filter(Boolean).slice(0, 5);
    const ilikes = words.map((w) => `p.p_name ILIKE ${sqlText('%' + w + '%')}`).join(' AND ');
    return {
      sql: `SELECT sc.std_cl_id,
                   concat(s.std_id, '  -   ', p.p_name) AS student_name
              FROM public.people p
              JOIN public.student       s  ON p.p_id    = s.p_id    AND s.state  = 'Active'
              JOIN public.student_class sc ON sc.std_id = s.std_id  AND sc.state = 'Continue'
              JOIN public.class         cl ON sc.cl_id  = cl.cl_id
             WHERE cl.br_id = ${br}
               AND ${ilikes}
             ORDER BY sc.std_cl_id DESC
             LIMIT ${limit}`,
      prePaginated: true,
    };
  },
  // `|| 0` guards against undefined params: Number(undefined) = NaN which
  // serializes to the literal text "NaN" and Postgres reads that as a column
  // name → "column 'nan' does not exist".
  StudentPerformance: (p) => `SELECT * FROM student_performance_show(${Number(p?.br_id) || 0}, ${Number(p?.std_cl_id) || 0})`,
  StudentPerformance_body_query: (p) => `SELECT *  FROM vw_std_student_performance_all(${Number(p?.br_id) || 0})`,
  StudentPerformanceEdit: 'SELECT sae.sta_id, sae.student_id, st.student_name, sae.sub_act_id, CONCAT(a.activity_name, \' - \', s.name) AS subject_activity, sae.marks_obtained, sae.state FROM student_activity_edit sae JOIN students st ON st.student_id = sae.student_id JOIN subject_activity sa ON sa.sub_act_id = sae.sub_act_id JOIN activity a ON a.act_id = sa.act_id JOIN subjects s ON s.sub_id = sa.subject_id ORDER BY sae.sta_id',
};
