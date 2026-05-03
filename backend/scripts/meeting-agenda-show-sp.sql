-- =============================================================================
-- meeting_agenda_show(p_branch_id integer)
--   Soo celiya dhammaan agenda-yada kulanka ee branch-ka la doortay.
--   Haddii branch_name = 'All' (ama p_branch_id = 0) → soo celi dhammaan rows.
--   Haddii kale → kala saar kuwa registering-user uu ka tirsanyahay branch-kaas.
--
-- Username waxa la helaa labadan dariiqo:
--   1) meeting_agenda.u_br_id → user_branch.u_br_id → users.usr_id
--   2) Hadii ay 1 ka faallid (u_br_id si toos ah loo kaydiyay sida usr_id),
--      meeting_agenda.u_br_id → users.usr_id si toos ah.
-- =============================================================================

CREATE OR REPLACE FUNCTION meeting_agenda_show(p_branch_id integer)
RETURNS TABLE(
  id            integer,
  agenda        varchar,
  participance  varchar,
  comments      varchar,
  decisions     varchar,
  meet_date     date,
  reg_date      timestamp,
  user_name     varchar
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_br_name varchar;
BEGIN
  SELECT br_name INTO v_br_name FROM branch WHERE br_id = p_branch_id;

  RETURN QUERY
  SELECT
    ma.m_ag_id::integer                                AS id,
    ma.agenda::varchar                                 AS agenda,
    ma.participance::varchar                           AS participance,
    ma.comments::varchar                               AS comments,
    ma.decisions::varchar                              AS decisions,
    ma.meet_date                                       AS meet_date,
    ma.reg_date                                        AS reg_date,
    COALESCE(u_via_ub.username, u_direct.username, '')::varchar AS user_name
  FROM meeting_agenda ma
  LEFT JOIN user_branch ub        ON ub.u_br_id = ma.u_br_id
  LEFT JOIN users       u_via_ub  ON u_via_ub.usr_id = ub.usr_id
  LEFT JOIN users       u_direct  ON u_direct.usr_id = ma.u_br_id
  WHERE
       p_branch_id = 0
    OR COALESCE(v_br_name, '') = 'All'
    OR ub.br_id = p_branch_id
  ORDER BY ma.meet_date DESC, ma.m_ag_id DESC;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 0, ''::varchar, ''::varchar, ''::varchar, ''::varchar,
           NULL::date, NULL::timestamp, ''::varchar;
  END IF;
END;
$$;
