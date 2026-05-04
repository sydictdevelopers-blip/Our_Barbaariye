/**
 * Meeting Management queries.
 *
 *   • MeetingAgenda     → meeting_agenda_show(br_id) — full agenda registry
 *                          (id / agenda / participance / comments / decisions /
 *                           meet_date / reg_date / user_name).
 *
 *   • MeetingMinutesShow → meeting_minutes_show(p_branch_id, p_date_from, p_date_to)
 *                          — printable report rows for the date range.
 *
 * Branch handling lives in the SQL function: br_id whose branch.br_name
 * is 'All' returns every row, otherwise filters by the registering user's
 * branch via user_branch.
 */

const safeDate = (v) => {
  const s = String(v ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
};

module.exports = {
  MeetingAgenda: (p) => `SELECT * FROM meeting_agenda_show(${Number(p?.br_id) || 0})`,
  MeetingMinutesShow: (p) => {
    const from = safeDate(p?.p_date_from);
    const to = safeDate(p?.p_date_to);
    const fromArg = from ? `'${from}'::date` : 'NULL';
    const toArg = to ? `'${to}'::date` : 'NULL';
    return `SELECT * FROM meeting_minutes_show(${Number(p?.br_id) || 0}, ${fromArg}, ${toArg})`;
  },
};
