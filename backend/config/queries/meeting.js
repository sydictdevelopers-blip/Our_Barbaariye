/**
 * Meeting Management queries.
 *
 *   • MeetingAgenda → meeting_agenda_show(br_id) — full agenda registry
 *                     (id / agenda / participance / comments / decisions /
 *                      meet_date / reg_date / user_name).
 *
 * Branch handling lives in the SQL function: br_id whose branch.br_name
 * is 'All' returns every row, otherwise filters by the registering user's
 * branch via user_branch.
 */

module.exports = {
  MeetingAgenda: (p) => `SELECT * FROM meeting_agenda_show(${Number(p?.br_id) || 0})`,
};
