-- =============================================================================
-- vw_question_bank(exm_cat, chap, subj, grde, oper, branch)
--   PostgreSQL version of the MySQL "vw_question_bank" stored procedure.
--   Two modes via `oper`:
--     'Direct'   -> simple list (id, question, username, reg_date)
--     'Multiple' -> joined with question_answers (adds answer + state)
--   When the filter set returns zero rows, the function emits a single row
--   with the alert body from alerts.title='notfound' in the `message` column;
--   id will be 0 and other data columns NULL so the frontend can branch
--   on (id = 0 OR message IS NOT NULL).
--
--   Schema notes vs. the original MySQL proc:
--     - users.u_id           -> users.usr_id
--     - user_branch.u_id     -> user_branch.usr_id
--     - qb.gr_id is FK to levels(lev_id), not grade(gr_id); the unused
--       grade/subjects/chapters joins from the MySQL version are dropped
--       since none of those columns are SELECTed.
-- =============================================================================

DROP FUNCTION IF EXISTS public.vw_question_bank(integer, integer, integer, integer, varchar, integer);

CREATE OR REPLACE FUNCTION public.vw_question_bank(
    exm_cat integer,
    chap    integer,
    subj    integer,
    grde    integer,
    oper    varchar,
    branch  integer
)
RETURNS TABLE (
    id        integer,
    question  text,
    answer    text,
    state     varchar,
    username  varchar,
    reg_date  date,
    message   text
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
BEGIN
    /* ============================================================
       DIRECT mode — list bank rows for the branch + filters.
    ============================================================ */
    IF oper = 'Direct' THEN

        SELECT COUNT(qb.q_b_id)
          INTO v_count
          FROM question_bank qb
          JOIN user_branch  ub ON ub.u_br_id = qb.u_br_id
         WHERE qb.ex_c_id = exm_cat
           AND qb.chap_id = chap
           AND qb.su_id   = subj
           AND qb.gr_id   = grde
           AND ub.br_id   = branch;

        IF v_count = 0 THEN
            RETURN QUERY
            SELECT 0,
                   NULL::text,
                   NULL::text,
                   NULL::varchar,
                   NULL::varchar,
                   NULL::date,
                   a.body::text
              FROM alerts a
             WHERE a.title = 'notfound'
             LIMIT 1;
        ELSE
            RETURN QUERY
            SELECT qb.q_b_id::integer        AS id,
                   qb.question::text         AS question,
                   NULL::text                AS answer,
                   NULL::varchar             AS state,
                   u.username::varchar       AS username,
                   qb.reg_date::date         AS reg_date,
                   NULL::text                AS message
              FROM question_bank qb
              JOIN user_branch  ub ON ub.u_br_id = qb.u_br_id
              JOIN users        u  ON u.usr_id   = ub.usr_id
             WHERE qb.ex_c_id = exm_cat
               AND qb.chap_id = chap
               AND qb.su_id   = subj
               AND qb.gr_id   = grde
               AND ub.br_id   = branch
             ORDER BY qb.reg_date DESC, qb.q_b_id DESC;
        END IF;

    /* ============================================================
       MULTIPLE mode — bank rows joined with their answers.
    ============================================================ */
    ELSIF oper = 'Multiple' THEN

        SELECT COUNT(qb.q_b_id)
          INTO v_count
          FROM question_bank    qb
          JOIN question_answers qa ON qa.q_b_id  = qb.q_b_id
          JOIN user_branch      ub ON ub.u_br_id = qb.u_br_id
         WHERE qb.ex_c_id = exm_cat
           AND qb.chap_id = chap
           AND qb.su_id   = subj
           AND qb.gr_id   = grde
           AND ub.br_id   = branch;

        IF v_count = 0 THEN
            RETURN QUERY
            SELECT 0,
                   NULL::text,
                   NULL::text,
                   NULL::varchar,
                   NULL::varchar,
                   NULL::date,
                   a.body::text
              FROM alerts a
             WHERE a.title = 'notfound'
             LIMIT 1;
        ELSE
            RETURN QUERY
            SELECT qb.q_b_id::integer        AS id,
                   qb.question::text         AS question,
                   qa.answer::text           AS answer,
                   qa.state::varchar         AS state,
                   u.username::varchar       AS username,
                   qb.reg_date::date         AS reg_date,
                   NULL::text                AS message
              FROM question_bank    qb
              JOIN question_answers qa ON qa.q_b_id  = qb.q_b_id
              JOIN user_branch      ub ON ub.u_br_id = qb.u_br_id
              JOIN users            u  ON u.usr_id   = ub.usr_id
             WHERE qb.ex_c_id = exm_cat
               AND qb.chap_id = chap
               AND qb.su_id   = subj
               AND qb.gr_id   = grde
               AND ub.br_id   = branch
             ORDER BY qb.reg_date DESC, qb.q_b_id DESC, qa.qu_a_id;
        END IF;
    END IF;

    RETURN;
END;
$$;

ALTER FUNCTION public.vw_question_bank(integer, integer, integer, integer, varchar, integer)
    OWNER TO postgres;
