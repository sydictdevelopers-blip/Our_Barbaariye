-- ============================================================================
-- vw_student — simple 3-arg SP (cl_id, b_id, a_y_id) returning all matching
-- students for a class. Column keys use the snake_case names the frontend
-- StudentsTab.jsx renderer expects (std_id, id_card, student_name, phone, …).
-- Pagination/search are applied by dynamicController.runSelectQueryPaginated
-- (this SP does not paginate internally).
-- ============================================================================
DROP FUNCTION IF EXISTS public.vw_student(integer, integer, integer);
DROP FUNCTION IF EXISTS public.vw_student(integer, integer, integer, character varying);
DROP FUNCTION IF EXISTS public.vw_student(integer, integer, integer, bigint, integer);
DROP FUNCTION IF EXISTS public.vw_student(integer, integer, integer, character varying, text, integer, integer);

CREATE OR REPLACE FUNCTION public.vw_student(
    p_cl_id   integer,
    p_b_id    integer,
    p_a_y_id  integer
)
RETURNS TABLE (
    std_id            integer,
    id_card           text,
    student_name      text,
    phone             text,
    sex               text,
    res_id            integer,
    district          text,
    responsible_name  text,
    type              text,
    mother_name       text,
    mother_phone      text,
    relation          text,
    discount          numeric,
    reg_date          timestamp,
    username          text
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
    SELECT
        s.std_id,
        s.id_card::text         AS id_card,
        p.p_name::text          AS student_name,
        p.tel::text             AS phone,
        p.sex::text             AS sex,
        r.res_id,
        ad.district::text       AS district,
        pr.p_name::text         AS responsible_name,
        stf.type_fee::text      AS type,
        s.mothername::text      AS mother_name,
        s.mother_phone::text    AS mother_phone,
        rr.relationtype::text   AS relation,
        sc.discount::numeric    AS discount,
        s.reg_date::timestamp   AS reg_date,
        u.username::text        AS username
    FROM public.student_class sc
    JOIN public.student              s   ON s.std_id   = sc.std_id
    JOIN public.people               p   ON p.p_id     = s.p_id
    JOIN public.responsible          r   ON r.res_id   = s.res_id
    JOIN public.people               pr  ON pr.p_id    = r.p_id
    JOIN public.address              ad  ON ad.add_id  = p.ad_id
    JOIN public.student_type_fee     stf ON stf.st_ty_id = sc.st_ty_id
    JOIN public.responsible_relation rr  ON rr.r_r_id  = s.r_r_id
    JOIN public.user_branch          ub  ON ub.u_br_id = s.u_br_id
    JOIN public.users                u   ON u.usr_id   = ub.usr_id
    WHERE sc.cl_id  = p_cl_id
      AND sc.b_id   = p_b_id
      AND sc.a_y_id = p_a_y_id
      AND sc.state  = 'Continue'
      AND s.state   = 'Active'
    ORDER BY s.std_id ASC
$$;
