-- =============================================================================
-- student_profile_show — Returns full profile for a single student.
--
-- Used by the Student Profile modal (eye-click on the Students table row).
-- Joins student + people + responsible + responsible_relation +
-- enrollment_type + student_class + class + academic_year + batch +
-- student_type_fee + address.
--
-- Returns the most-recent ACTIVE student_class row (by std_cl_id desc) so the
-- profile reflects the student's current class assignment.
-- =============================================================================

DROP FUNCTION IF EXISTS public.student_profile_show(integer);

CREATE OR REPLACE FUNCTION public.student_profile_show(p_std_id integer)
RETURNS TABLE(
    std_id integer,
    student_name character varying,
    phone character varying,
    sex character varying,
    pob character varying,
    dob date,
    age integer,
    id_card character varying,
    emis_id character varying,
    image character varying,
    mother_name character varying,
    mother_phone character varying,
    gurdian_name character varying,
    gurdian_phone character varying,
    gurdian_relation character varying,
    enroll_type character varying,
    transfer_school character varying,
    finance_detail character varying,
    free_description character varying,
    discount numeric,
    register_fee numeric,
    academic_fee numeric,
    bus_name character varying,
    bus_fee numeric,
    orphan_status character varying,
    disability_status character varying,
    refugee character varying,
    district character varying,
    class_name character varying,
    batch_name character varying,
    academic_name character varying,
    reg_date timestamp without time zone,
    username character varying
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.std_id,
        p.p_name::character varying        AS student_name,
        p.tel::character varying           AS phone,
        p.sex::character varying           AS sex,
        p.pob::character varying           AS pob,
        p.dob,
        CASE WHEN p.dob IS NOT NULL
             THEN EXTRACT(YEAR FROM age(p.dob))::INTEGER
             ELSE NULL END                 AS age,
        s.id_card::character varying,
        s.emis_id::character varying,
        s.image::character varying,
        p.mothername::character varying    AS mother_name,
        p.mother_phone::character varying  AS mother_phone,
        pr.p_name::character varying       AS gurdian_name,
        pr.tel::character varying          AS gurdian_phone,
        rr.relationtype::character varying AS gurdian_relation,
        et.enroll_type::character varying  AS enroll_type,
        s.transfer_school::character varying,
        sf.type_fee::character varying     AS finance_detail,
        sc.free_description::character varying,
        sc.discount,
        s.register_fee,
        s.academic_fee,
        b.bus_name::character varying      AS bus_name,
        sc.bus_fee,
        s.orphan_status::character varying,
        s.disability_status::character varying,
        s.refugee::character varying,
        ad.district::character varying     AS district,
        cl.class::character varying        AS class_name,
        bt.batch_name::character varying   AS batch_name,
        ac.academic_name::character varying AS academic_name,
        s.reg_date,
        u.username::character varying      AS username
    FROM student s
    JOIN people                p   ON p.p_id      = s.p_id
    LEFT JOIN address          ad  ON ad.add_id   = p.ad_id
    LEFT JOIN responsible      r   ON r.res_id    = s.res_id
    LEFT JOIN people           pr  ON pr.p_id     = r.p_id
    LEFT JOIN responsible_relation rr ON rr.r_r_id = s.r_r_id
    LEFT JOIN enrollment_type  et  ON et.en_ty_id = s.en_ty_id
    LEFT JOIN user_branch      ub  ON ub.u_br_id  = s.u_br_id
    LEFT JOIN users            u   ON u.usr_id    = ub.usr_id
    LEFT JOIN LATERAL (
        SELECT sc1.*
          FROM student_class sc1
         WHERE sc1.std_id = s.std_id
           AND sc1.state IN ('Continue', 'Graduated')
         ORDER BY sc1.std_cl_id DESC
         LIMIT 1
    ) sc ON TRUE
    LEFT JOIN class            cl  ON cl.cl_id    = sc.cl_id
    LEFT JOIN academic_year    ac  ON ac.a_y_id   = sc.a_y_id
    LEFT JOIN batch            bt  ON bt.b_id     = sc.b_id
    LEFT JOIN student_type_fee sf  ON sf.st_ty_id = sc.st_ty_id
    LEFT JOIN bus              b   ON b.bus_id    = sc.bus_id
    WHERE s.std_id = p_std_id
    LIMIT 1;
END;
$function$;
