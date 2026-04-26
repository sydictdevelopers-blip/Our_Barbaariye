-- ============================================================================
-- Migration: show-functions-all-check.sql
-- Date: 2026-04-25
-- Purpose: Apply consistent "branch name = 'All' means no branch filter"
--          pattern to 25 stored procedures.
--
-- Group A (22 functions): converted from obsolete `IF p_branch_id = 0`
--   convention to `var_branch_name = 'All'` lookup against branch.br_name.
-- Group B (3 functions): wrapped previously unconditional branch-filtered
--   SELECTs with the same IF/ELSE structure so 'All' returns all branches.
--
-- Pattern (model: class_show):
--   DECLARE var_branch_name TEXT;
--   SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = <arg>;
--   IF var_branch_name = 'All' THEN <SELECT without branch filter>
--   ELSE <SELECT with branch filter> END IF;
--
-- All SELECT logic, columns, JOINs, ORDER BY, and CASTs are preserved exactly
-- as in the originals. Only the IF/ELSE structure and branch lookup are added.
-- ============================================================================

-- =============================================================================
-- Group A: convert IF p_branch_id = 0 -> IF var_branch_name = 'All'
-- =============================================================================

-- ----- assign_student_room_show -----
CREATE OR REPLACE FUNCTION public.assign_student_room_show(p_branch_id integer)
 RETURNS TABLE(ass_std_ro_id integer, p_name character varying, class character varying, room_name character varying, exam character varying, serial_num integer, shift character varying, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            asr.ass_std_ro_id,
            p.p_name Student,
            cl.class,
            r.room_name,
            e.exam,
            asr.serial_num,
            sh.shift,
            u.username,
            asr.reg_date
        FROM assign_student_room asr
        JOIN student_class sc ON asr.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
		join people p on s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN rooms r ON r.r_id = asr.ro_id
        JOIN exam_reg er ON asr.e_r_id = er.ex_reg_id
        JOIN exam e ON er.ex_id = e.ex_id
        JOIN shift sh ON asr.sh_id = sh.sh_id
        JOIN user_branch ub ON asr.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY asr.ass_std_ro_id;
    ELSE
        RETURN QUERY
        SELECT
            asr.ass_std_ro_id,
            p.p_name Student,
            cl.class,
            r.room_name,
            e.exam,
            asr.serial_num,
            sh.shift,
            u.username,
            asr.reg_date
        FROM assign_student_room asr
        JOIN student_class sc ON asr.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
		join people p on s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN rooms r ON r.r_id = asr.ro_id
        JOIN exam_reg er ON asr.e_r_id = er.ex_reg_id
        JOIN exam e ON er.ex_id = e.ex_id
        JOIN shift sh ON asr.sh_id = sh.sh_id
        JOIN user_branch ub ON asr.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id and ub.br_id=p_branch_id
        ORDER BY asr.ass_std_ro_id;
    END IF;
END;
$function$;

-- ----- assign_teacher_room_show -----
CREATE OR REPLACE FUNCTION public.assign_teacher_room_show(p_branch_id integer)
 RETURNS TABLE(ass_t_ro_id integer, teacher_name character varying, room_name character varying, day character varying, period character varying, exam character varying, shift character varying, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            atr.ass_t_ro_id,
            p.p_name,
            r.room_name,
            d.day,
            pr.period,
            e.exam,
            sh.shift,
            u.username,
            atr.reg_date
        FROM assign_teacher_room atr
        JOIN rooms r ON r.r_id = atr.ro_id
        JOIN employee emp ON atr.emp_id = emp.emp_id
        JOIN people p ON emp.p_id = p.p_id
        JOIN day d ON atr.d_id = d.d_id
        JOIN period pr ON atr.pe_id = pr.pr_id
        JOIN exam_reg er ON atr.e_r_id = er.ex_reg_id
        JOIN exam e ON er.ex_id = e.ex_id
        JOIN shift sh ON atr.sh_id = sh.sh_id
        JOIN user_branch ub ON atr.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY atr.ass_t_ro_id;
    ELSE
        RETURN QUERY
        SELECT
            atr.ass_t_ro_id,
            p.p_name,
            r.room_name,
            d.day,
            pr.period,
            e.exam,
            sh.shift,
            u.username,
            atr.reg_date
        FROM assign_teacher_room atr
        JOIN rooms r ON r.r_id = atr.ro_id
        JOIN employee emp ON atr.emp_id = emp.emp_id
        JOIN people p ON emp.p_id = p.p_id
        JOIN day d ON atr.d_id = d.d_id
        JOIN period pr ON atr.pe_id = pr.pr_id
        JOIN exam_reg er ON atr.e_r_id = er.ex_reg_id
        JOIN exam e ON er.ex_id = e.ex_id
        JOIN shift sh ON atr.sh_id = sh.sh_id
        JOIN user_branch ub ON atr.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id and ub.br_id=p_branch_id
        ORDER BY atr.ass_t_ro_id;
    END IF;
END;
$function$;

-- ----- certificate_show -----
CREATE OR REPLACE FUNCTION public.certificate_show(p_branch_id integer)
 RETURNS TABLE(crt_id integer, serial_number character varying, person_name character varying, description text, issue_date date, username character varying, reg_date date)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            c.crt_id,
            c.serial_number,
            p.p_name,
            c.description,
            c.ishue_date,
            u.username,
            c.reg_date
        FROM certificate c
        JOIN people p ON c.p_id = p.p_id
        JOIN user_branch ub ON c.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY c.crt_id;
    ELSE
        RETURN QUERY
        SELECT
            c.crt_id,
            c.serial_number,
            p.p_name,
            c.description,
            c.ishue_date,
            u.username,
            c.reg_date
        FROM certificate c
        JOIN people p ON c.p_id = p.p_id
        JOIN user_branch ub ON c.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY c.crt_id;
    END IF;
END;
$function$;

-- ----- complain_show -----
CREATE OR REPLACE FUNCTION public.complain_show(p_branch_id integer)
 RETURNS TABLE(com_id integer, complainant_name character varying, phone character varying, complaint text, state character varying, handled_by character varying, username character varying, reg_date date)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            c.com_id,
            c.name,
            c.phone,
            c.cabasho,
            c.state,
            c.comp_username,
            u.username,
            c.reg_date
        FROM complain c
        JOIN user_branch ub ON c.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY c.com_id;
    ELSE
        RETURN QUERY
        SELECT
            c.com_id,
            c.name,
            c.phone,
            c.cabasho,
            c.state,
            c.comp_username,
            u.username,
            c.reg_date
        FROM complain c
        JOIN user_branch ub ON c.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY c.com_id;
    END IF;
END;
$function$;

-- ----- employee_attendance_show -----
CREATE OR REPLACE FUNCTION public.employee_attendance_show(p_branch_id integer)
 RETURNS TABLE(emp_att_id integer, employee_name character varying, scheduled_time_in time without time zone, scheduled_time_out time without time zone, actual_time_in time without time zone, actual_time_out time without time zone, status character varying, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            ea.emp_att_id,
            p.p_name,
            es.time_in,
            es.time_out,
            ea.checktime_in,
            ea.checktime_out,
            ea.state,
            u.username,
            ea.reg_date
        FROM employee_attendance ea
        JOIN employee_scheduale es ON ea.emp_sch_id = es.emp_sch_id
        JOIN employee emp ON es.emp_id = emp.emp_id
        JOIN people p ON emp.p_id = p.p_id
        JOIN user_branch ub ON ea.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY ea.emp_att_id;
    ELSE
        RETURN QUERY
        SELECT
            ea.emp_att_id,
            p.p_name,
            es.time_in,
            es.time_out,
            ea.checktime_in,
            ea.checktime_out,
            ea.state,
            u.username,
            ea.reg_date
        FROM employee_attendance ea
        JOIN employee_scheduale es ON ea.emp_sch_id = es.emp_sch_id
        JOIN employee emp ON es.emp_id = emp.emp_id
        JOIN people p ON emp.p_id = p.p_id
        JOIN user_branch ub ON ea.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY ea.emp_att_id;
    END IF;
END;
$function$;

-- ----- employee_schedule_show -----
CREATE OR REPLACE FUNCTION public.employee_schedule_show(p_branch_id integer)
 RETURNS TABLE(emp_sch_id integer, employee_name character varying, time_in time without time zone, time_out time without time zone, day_name character varying, shift_name character varying, state character varying, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            es.emp_sch_id,
            p.p_name,
            es.time_in,
            es.time_out,
            d.day,
            sh.shift,
            es.state,
            u.username,
            es.reg_date
        FROM employee_scheduale es
        JOIN employee emp ON es.emp_id = emp.emp_id
        JOIN people p ON emp.p_id = p.p_id
        JOIN day d ON es.day_id = d.d_id
        JOIN shift sh ON es.sh_id = sh.sh_id
        JOIN user_branch ub ON es.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY es.emp_sch_id;
    ELSE
        RETURN QUERY
        SELECT
            es.emp_sch_id,
            p.p_name,
            es.time_in,
            es.time_out,
            d.day,
            sh.shift,
            es.state,
            u.username,
            es.reg_date
        FROM employee_scheduale es
        JOIN employee emp ON es.emp_id = emp.emp_id
        JOIN people p ON emp.p_id = p.p_id
        JOIN day d ON es.day_id = d.d_id
        JOIN shift sh ON es.sh_id = sh.sh_id
        JOIN user_branch ub ON es.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY es.emp_sch_id;
    END IF;
END;
$function$;

-- ----- employee_vocation_show -----
CREATE OR REPLACE FUNCTION public.employee_vocation_show(p_branch_id integer)
 RETURNS TABLE(emp_voc_id integer, employee_name character varying, vocation_date date, vocation_type character varying, description character varying, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            ev.emp_voc_id,
            p.p_name,
            ev.voc_date,
            ev.type,
            ev.description,
            u.username,
            ev.reg_date
        FROM employee_vocation ev
        JOIN employee emp ON ev.emp_id = emp.emp_id
        JOIN people p ON emp.p_id = p.p_id
        JOIN user_branch ub ON ev.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY ev.emp_voc_id;
    ELSE
        RETURN QUERY
        SELECT
            ev.emp_voc_id,
            p.p_name,
            ev.voc_date,
            ev.type,
            ev.description,
            u.username,
            ev.reg_date
        FROM employee_vocation ev
        JOIN employee emp ON ev.emp_id = emp.emp_id
        JOIN people p ON emp.p_id = p.p_id
        JOIN user_branch ub ON ev.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY ev.emp_voc_id;
    END IF;
END;
$function$;

-- ----- exam_attendance_show -----
CREATE OR REPLACE FUNCTION public.exam_attendance_show(p_branch_id integer)
 RETURNS TABLE(ex_t_id integer, student_name character varying, class character varying, exam character varying, attendance_status character varying, room_name character varying, subject character varying, reason text, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
       SELECT
            ea.ex_t_id,
            p.p_name,
            cl.class,
            e.exam,
            sta.state,
            r.room_name,
            sub.name,
            ea.reason,
            u.username,
            ea.reg_date
        FROM exam_attendance ea
        JOIN student_class sc ON ea.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
        JOIN people p ON s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN exam_reg er ON ea.e_r_id = er.ex_reg_id
        JOIN exam e ON er.ex_id = e.ex_id
        JOIN state_attendance sta ON ea.st_att_id = sta.st_att_id
        JOIN rooms r ON  r.r_id = ea.ro_id
        JOIN subjects sub ON  sub.sub_id = ea.su_id
        JOIN user_branch ub ON ea.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY ea.ex_t_id;
    ELSE
        RETURN QUERY
        SELECT
            ea.ex_t_id,
            p.p_name,
            cl.class,
            e.exam,
            sta.state,
            r.room_name,
            sub.name,
            ea.reason,
            u.username,
            ea.reg_date
        FROM exam_attendance ea
        JOIN student_class sc ON ea.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
        JOIN people p ON s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN exam_reg er ON ea.e_r_id = er.ex_reg_id
        JOIN exam e ON er.ex_id = e.ex_id
        JOIN state_attendance sta ON ea.st_att_id = sta.st_att_id
        JOIN rooms r ON  r.r_id = ea.ro_id
        JOIN subjects sub ON  sub.sub_id = ea.su_id
        JOIN user_branch ub ON ea.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id and ub.br_id=p_branch_id
        ORDER BY ea.ex_t_id;
    END IF;
END;
$function$;

-- ----- exam_time_show -----
CREATE OR REPLACE FUNCTION public.exam_time_show(p_branch_id integer)
 RETURNS TABLE(ex_t_id integer, question_id integer, start_time time without time zone, end_time time without time zone, state character varying, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            et.ex_t_id,
            qt.q_no,
            et.start_time,
            et.end_time,
            et.state,
            u.username,
            et.reg_date
        FROM exam_time et
        JOIN question_type qt ON et.q_no = qt.q_no
        JOIN user_branch ub ON et.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY et.ex_t_id;
    ELSE
        RETURN QUERY
        SELECT
            et.ex_t_id,
            qt.q_no,
            et.start_time,
            et.end_time,
            et.state,
            u.username,
            et.reg_date
        FROM exam_time et
        JOIN question_type qt ON et.q_no = qt.q_no
        JOIN user_branch ub ON et.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY et.ex_t_id;
    END IF;
END;
$function$;

-- ----- expense_budget_show -----
CREATE OR REPLACE FUNCTION public.expense_budget_show(p_branch_id integer)
 RETURNS TABLE(exp_pud_id integer, expense_name character varying, description character varying, amount numeric, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            eb.exp_pud_id,
            e.name Expense,
            eb.description,
            eb.amount,
            u.username,
            eb.reg_date
        FROM expense_budget eb
        JOIN expense e ON eb.ex_id = e.ex_id
        JOIN user_branch ub ON eb.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY eb.exp_pud_id;
    ELSE
        RETURN QUERY
        SELECT
            eb.exp_pud_id,
            e.name Expense,
            eb.description,
            eb.amount,
            u.username,
            eb.reg_date
        FROM expense_budget eb
        JOIN expense e ON eb.ex_id = e.ex_id
        JOIN user_branch ub ON eb.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id and ub.br_id=p_branch_id
        ORDER BY eb.exp_pud_id;
    END IF;
END;
$function$;

-- ----- finance_appointment_show -----
CREATE OR REPLACE FUNCTION public.finance_appointment_show(p_branch_id integer)
 RETURNS TABLE(f_o_id integer, responsible_person character varying, comment character varying, state character varying, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            fa.f_ap_id,
            p.p_name Resopneiple,
            fa.comment,
            fa.state,
            u.username,
            fa.reg_date
        FROM finance_apoint fa
        JOIN responsible r ON fa.res_id = r.res_id
		join people p on p.p_id = r.p_id
        JOIN user_branch ub ON fa.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY fa.f_ap_id;
    ELSE
        RETURN QUERY
         SELECT
            fa.f_ap_id,
            p.p_name Resopneiple,
            fa.comment,
            fa.state,
            u.username,
            fa.reg_date
        FROM finance_apoint fa
        JOIN responsible r ON fa.res_id = r.res_id
		join people p on p.p_id = r.p_id
        JOIN user_branch ub ON fa.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id and ub.br_id=p_branch_id
        ORDER BY fa.f_ap_id;
    END IF;
END;
$function$;

-- ----- lesson_activity_show -----
CREATE OR REPLACE FUNCTION public.lesson_activity_show(p_branch_id integer)
 RETURNS TABLE("ID" integer, "Activity_Type" character varying, "Class" character varying, "Subject" character varying, "Marks" character varying, "Description" text, "Exam" character varying, "Created_By" character varying, "Date" character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            l.ac_t_id,
            ac.type,
            cl.class,
            sub.name,
            l.marks::VARCHAR,  -- Explicit cast to VARCHAR
            l.description,
            e.exam,
            u.username,
            TO_CHAR(l.reg_date, 'DD/MM/YYYY')::VARCHAR
        FROM lesson_activity l
        JOIN activity_type ac ON ac.ac_id = l.ac_id
        JOIN class cl ON l.cl_id = cl.cl_id
        JOIN subject_class subcl ON subcl.sub_cl_id = l.sub_cl_id
        JOIN subjects sub ON sub.sub_id = subcl.sub_id
        JOIN exam_reg er ON er.ex_reg_id = l.e_r_id
        JOIN exam e ON e.ex_id = er.ex_id
        JOIN user_branch ub ON ub.u_br_id = l.u_br_id
        JOIN users u ON u.usr_id = ub.usr_id
        ORDER BY l.ac_t_id;
    ELSE
        RETURN QUERY
        SELECT
            l.ac_t_id,
            ac.type,
            cl.class,
            sub.name,
            l.marks::VARCHAR,  -- Explicit cast to VARCHAR
            l.description,
            e.exam,
            u.username,
            TO_CHAR(l.reg_date, 'DD/MM/YYYY')::VARCHAR
        FROM lesson_activity l
        JOIN activity_type ac ON ac.ac_id = l.ac_id
        JOIN class cl ON l.cl_id = cl.cl_id
        JOIN subject_class subcl ON subcl.sub_cl_id = l.sub_cl_id
        JOIN subjects sub ON sub.sub_id = subcl.sub_id
        JOIN exam_reg er ON er.ex_reg_id = l.e_r_id
        JOIN exam e ON e.ex_id = er.ex_id
        JOIN user_branch ub ON ub.u_br_id = l.u_br_id
        JOIN users u ON u.usr_id = ub.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY l.ac_t_id;
    END IF;
END;
$function$;

-- ----- meeting_agenda_show -----
CREATE OR REPLACE FUNCTION public.meeting_agenda_show(p_branch_id integer)
 RETURNS TABLE(m_ag_id integer, agenda text, participance text, comments text, decisions text, meet_date date, username character varying, reg_date date)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            ma.m_ag_id,
            ma.agenda,
            ma.participance,
            ma.comments,
            ma.decisions,
            ma.meet_date,
            u.username,
            ma.reg_date
        FROM meeting_agenda ma
        JOIN user_branch ub ON ma.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY ma.m_ag_id;
    ELSE
        RETURN QUERY
        SELECT
            ma.m_ag_id,
            ma.agenda,
            ma.participance,
            ma.comments,
            ma.decisions,
            ma.meet_date,
            u.username,
            ma.reg_date
        FROM meeting_agenda ma
        JOIN user_branch ub ON ma.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY ma.m_ag_id;
    END IF;
END;
$function$;

-- ----- note_payable_show -----
CREATE OR REPLACE FUNCTION public.note_payable_show(p_branch_id integer)
 RETURNS TABLE(cust_dep_id integer, person_name character varying, account_name character varying, amount numeric, interest_rate numeric, note_type character varying, description character varying, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            np.note_pay_id,
            p.p_name,
            a.acc_name,
            np.amount,
            np.rate,
            np.type,
            np.description,
            u.username,
            np.reg_date
        FROM note_payable np
        JOIN people p ON np.p_id = p.p_id
        JOIN accounts a ON np.acc_id = a.acc_id
        JOIN user_branch ub ON np.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY np.note_pay_id;
    ELSE
        RETURN QUERY
        SELECT
            np.note_pay_id,
            p.p_name,
            a.acc_name,
            np.amount,
            np.rate,
            np.type,
            np.description,
            u.username,
            np.reg_date
        FROM note_payable np
        JOIN people p ON np.p_id = p.p_id
        JOIN accounts a ON np.acc_id = a.acc_id
        JOIN user_branch ub ON np.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id and ub.br_id=p_branch_id
        ORDER BY np.note_pay_id;
    END IF;
END;
$function$;

-- ----- profit_sharing_show -----
CREATE OR REPLACE FUNCTION public.profit_sharing_show(p_branch_id integer)
 RETURNS TABLE(pr_sh_id integer, person_name character varying, close_date timestamp without time zone, start_date timestamp without time zone, amount numeric, new_investment numeric, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            ps.pr_sh_id,
            p.p_name,
            c.close_date,
			c.start_date,
            ps.amount,
            ps.new_investment,
            u.username,
            ps.reg_date
        FROM profit_sharing ps
        JOIN people p ON ps.p_id = p.p_id
        JOIN closing c ON c.cl_id = ps.cl_id
        JOIN user_branch ub ON ps.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY ps.pr_sh_id;
    ELSE
        RETURN QUERY
        SELECT
            ps.pr_sh_id,
            p.p_name,
            c.close_date,
			c.start_date,
            ps.amount,
            ps.new_investment,
            u.username,
            ps.reg_date
        FROM profit_sharing ps
        JOIN people p ON ps.p_id = p.p_id
        JOIN closing c ON c.cl_id = ps.cl_id
        JOIN user_branch ub ON ps.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id and ub.br_id=p_branch_id
        ORDER BY ps.pr_sh_id;
    END IF;
END;
$function$;

-- ----- question_type_show -----
CREATE OR REPLACE FUNCTION public.question_type_show(p_branch_id integer)
 RETURNS TABLE(q_no integer, subject_name character varying, class_name character varying, chapters character varying, total_questions integer, total_marks numeric, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            qt.q_no,
            sub.name,
            cl.class,
            qt.chapters,
            qt.total,
            qt.total_mark,
            u.username,
            qt.reg_date
        FROM question_type qt
        JOIN subject_class sc ON qt.su_cl_id = sc.sub_cl_id
        JOIN subjects sub ON sc.sub_id = sub.sub_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN user_branch ub ON qt.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY qt.q_no;
    ELSE
        RETURN QUERY
        SELECT
            qt.q_no,
            sub.name,
            cl.class,
            qt.chapters,
            qt.total,
            qt.total_mark,
            u.username,
            qt.reg_date
        FROM question_type qt
        JOIN subject_class sc ON qt.su_cl_id = sc.sub_cl_id
        JOIN subjects sub ON sc.sub_id = sub.sub_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN user_branch ub ON qt.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY qt.q_no;
    END IF;
END;
$function$;

-- ----- questions_show -----
CREATE OR REPLACE FUNCTION public.questions_show(p_branch_id integer)
 RETURNS TABLE(q_id integer, grade_name character varying, subject_name character varying, chapter_name character varying, chapter_page character varying, question_category character varying, question_name text, marks numeric, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            q.q_id,
            gr.grade_name,
            sub.name,
            c.chapter,
            q.chapter_page,
            qc.category,
            q.q_name,
            q.marks,
            u.username,
            q.reg_date
        FROM questions q
        JOIN grade gr ON q.gr_id = gr.gr_id
        JOIN subjects sub ON q.su_id = sub.sub_id
        JOIN chapters c ON q.chap_id = c.chap_id
        JOIN question_category qc ON q.q_cat_id = qc.q_cat_id
        JOIN user_branch ub ON q.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY q.q_id;
    ELSE
        RETURN QUERY
        SELECT
            q.q_id,
            gr.grade_name,
            sub.name,
            c.chapter,
            q.chapter_page,
            qc.category,
            q.q_name,
            q.marks,
            u.username,
            q.reg_date
        FROM questions q
        JOIN grade gr ON q.gr_id = gr.gr_id
        JOIN subjects sub ON q.su_id = sub.sub_id
        JOIN chapters c ON q.chap_id = c.chap_id
        JOIN question_category qc ON q.q_cat_id = qc.q_cat_id
        JOIN user_branch ub ON q.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id and ub.br_id=p_branch_id
        ORDER BY q.q_id;
    END IF;
END;
$function$;

-- ----- result_show -----
CREATE OR REPLACE FUNCTION public.result_show(p_branch_id integer)
 RETURNS TABLE(r_id integer, student_name character varying, class character varying, exam character varying, subject character varying, marks numeric, activity numeric, approve_status character varying, lock_status character varying, recorded_by character varying, approved_by character varying, edited_by character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            r.r_id,
            p.p_name,
            cl.class,
            e.exam,
            sub.name,
            r.marks,
            r.activity,
            r.approve,
            r.lock,
            u1.username,
            u2.username,
            u3.username,
            r.reg_date
        FROM result r
        JOIN student_class sc ON r.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
        JOIN people p ON s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN exam_reg er ON r.e_r_id = er.ex_reg_id
        JOIN exam e ON er.ex_id = e.ex_id
        JOIN subjects sub ON r.su_id = sub.sub_id
        JOIN user_branch ub ON r.u_br_id = ub.u_br_id
        JOIN users u1 ON ub.usr_id = u1.usr_id
        LEFT JOIN users u2 ON r.approved_user = u2.usr_id
        LEFT JOIN users u3 ON r.editted_user = u3.usr_id
        ORDER BY r.r_id;
    ELSE
        RETURN QUERY
        SELECT
            r.r_id,
            p.p_name,
            cl.class,
            e.exam,
            sub.name,
            r.marks,
            r.activity,
            r.approve,
            r.lock,
            u1.username,
            u2.username,
            u3.username,
            r.reg_date
        FROM result r
        JOIN student_class sc ON r.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
        JOIN people p ON s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN exam_reg er ON r.e_r_id = er.ex_reg_id
        JOIN exam e ON er.ex_id = e.ex_id
        JOIN subjects sub ON r.su_id = sub.sub_id
        JOIN user_branch ub ON r.u_br_id = ub.u_br_id
        JOIN users u1 ON ub.usr_id = u1.usr_id
        LEFT JOIN users u2 ON r.approved_user = u2.usr_id
        LEFT JOIN users u3 ON r.editted_user = u3.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY r.r_id;
    END IF;
END;
$function$;

-- ----- send_notices_show -----
CREATE OR REPLACE FUNCTION public.send_notices_show(p_branch_id integer)
 RETURNS TABLE(not_id integer, notice_title character varying, notice_body character varying, start_date date, end_date date, state character varying, schedule_notice character varying, is_change boolean, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            sn.not_id,
            sn.notice_title,
            sn.notice_body,
            sn.start_date,
            sn.end_date,
            sn.state,
            sn.schedule_notice,
            sn.ischange,
            u.username,
            sn.reg_date
        FROM send_notices sn
        JOIN user_branch ub ON sn.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY sn.not_id;
    ELSE
        RETURN QUERY
        SELECT
            sn.not_id,
            sn.notice_title,
            sn.notice_body,
            sn.start_date,
            sn.end_date,
            sn.state,
            sn.schedule_notice,
            sn.ischange,
            u.username,
            sn.reg_date
        FROM send_notices sn
        JOIN user_branch ub ON sn.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY sn.not_id;
    END IF;
END;
$function$;

-- ----- student_attendance_show -----
CREATE OR REPLACE FUNCTION public.student_attendance_show(p_branch_id integer)
 RETURNS TABLE(std_att_id integer, student_name character varying, class_name character varying, period_name character varying, reason text, attendance_status character varying, username character varying, reg_date date)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            sa.std_att_id,
            p.p_name,
            cl.class,
            pr.period,
            sa.reason,
            sta.state,
            u.username,
            sa.reg_date
        FROM student_attendance sa
        JOIN student_class sc ON sa.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
        JOIN people p ON s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN period pr ON sa.pr_id = pr.pr_id
        JOIN state_attendance sta ON sa.st_att_id = sta.st_att_id
        JOIN user_branch ub ON sa.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY sa.std_att_id;
    ELSE
        RETURN QUERY
        SELECT
            sa.std_att_id,
            p.p_name,
            cl.class,
            pr.period,
            sa.reason,
            sta.state,
            u.username,
            sa.reg_date
        FROM student_attendance sa
        JOIN student_class sc ON sa.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
        JOIN people p ON s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN period pr ON sa.pr_id = pr.pr_id
        JOIN state_attendance sta ON sa.st_att_id = sta.st_att_id
        JOIN user_branch ub ON sa.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id and ub.br_id=p_branch_id
        ORDER BY sa.std_att_id;
    END IF;
END;
$function$;

-- ----- sub_questions_show -----
CREATE OR REPLACE FUNCTION public.sub_questions_show(p_branch_id integer)
 RETURNS TABLE(sub_q_id integer, question_name text, sub_question_title text, state character varying, username character varying, reg_date timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            sq.sub_q_id,
            q.q_name,
            sq.sub_question_title,
            sq.state,
            u.username,
            sq.reg_date
        FROM sub_questions sq
        JOIN questions q ON sq.q_id = q.q_id
        JOIN user_branch ub ON sq.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY sq.sub_q_id;
    ELSE
        RETURN QUERY
        SELECT
            sq.sub_q_id,
            q.q_name,
            sq.sub_question_title,
            sq.state,
            u.username,
            sq.reg_date
        FROM sub_questions sq
        JOIN questions q ON sq.q_id = q.q_id
        JOIN user_branch ub ON sq.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY sq.sub_q_id;
    END IF;
END;
$function$;

-- ----- transcript_show -----
CREATE OR REPLACE FUNCTION public.transcript_show(p_branch_id integer)
 RETURNS TABLE(tr_id integer, serial_number character varying, student_name character varying, class_name character varying, description text, issue_date date, username character varying, reg_date date)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            t.tr_id,
            t.serial_number,
            p.p_name,
            cl.class,
            t.description,
            t.ishue_date,
            u.username,
            t.reg_date
        FROM transcript t
        JOIN student_class sc ON t.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
        JOIN people p ON s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN user_branch ub ON t.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        ORDER BY t.tr_id;
    ELSE
        RETURN QUERY
        SELECT
            t.tr_id,
            t.serial_number,
            p.p_name,
            cl.class,
            t.description,
            t.ishue_date,
            u.username,
            t.reg_date
        FROM transcript t
        JOIN student_class sc ON t.std_cl_id = sc.std_cl_id
        JOIN student s ON sc.std_id = s.std_id
        JOIN people p ON s.p_id = p.p_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN user_branch ub ON t.u_br_id = ub.u_br_id
        JOIN users u ON ub.usr_id = u.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY t.tr_id;
    END IF;
END;
$function$;

-- =============================================================================
-- Group B: add IF/ELSE wrapping (these had no All-check before)
-- =============================================================================

-- ----- class_formaster_show -----
-- a_y_id filter applies in BOTH branches; only ub.br_id filter is dropped for 'All'.
CREATE OR REPLACE FUNCTION public.class_formaster_show(p_branch_id integer, p_academic_year integer)
 RETURNS TABLE(c_f_id integer, person_name character varying, student_name character varying, reg_date date, username character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            cf.c_f_id,
            p1.p_name AS person_name,  -- Employee name from people table
            p2.p_name AS student_name, -- Student name from people table
            cf.reg_date,
            u.username
        FROM
            class_formaster cf
        JOIN
            class c ON cf.cl_id = c.cl_id
        JOIN
            employee em ON em.emp_id = cf.emp_id
        JOIN
            people p1 ON p1.p_id = em.p_id  -- Employee's personal information
        JOIN
            student s ON cf.std_id = s.std_id
        JOIN
            people p2 ON p2.p_id = s.p_id  -- Student's personal information
        JOIN
            user_branch ub ON ub.u_br_id = cf.u_br_id
        JOIN
            users u ON u.usr_id = ub.usr_id
        WHERE
            cf.a_y_id = p_academic_year  -- Filter by academic year
        ORDER BY
            cf.c_f_id;
    ELSE
        RETURN QUERY
        SELECT
            cf.c_f_id,
            p1.p_name AS person_name,  -- Employee name from people table
            p2.p_name AS student_name, -- Student name from people table
            cf.reg_date,
            u.username
        FROM
            class_formaster cf
        JOIN
            class c ON cf.cl_id = c.cl_id
        JOIN
            employee em ON em.emp_id = cf.emp_id
        JOIN
            people p1 ON p1.p_id = em.p_id  -- Employee's personal information
        JOIN
            student s ON cf.std_id = s.std_id
        JOIN
            people p2 ON p2.p_id = s.p_id  -- Student's personal information
        JOIN
            user_branch ub ON ub.u_br_id = cf.u_br_id
        JOIN
            users u ON u.usr_id = ub.usr_id
        WHERE
            ub.br_id = p_branch_id  -- Filter by branch ID
            AND cf.a_y_id = p_academic_year  -- Filter by academic year
        ORDER BY
            cf.c_f_id;
    END IF;
END;
$function$;

-- ----- employee_show -----
CREATE OR REPLACE FUNCTION public.employee_show(p_branch_id integer)
 RETURNS TABLE(tt_id integer, person_name character varying, phone_number character varying, salary numeric, location character varying, person_type character varying, username character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            em.tt_id,
            p.p_name AS person_name,
            p.tel AS phone_number,
            em.salary,
            CONCAT(ad.district, ' - ', ad.village) AS location,  -- Concatenate district and village
            p.p_type AS person_type,
            u.username
        FROM
            people p
        JOIN
            employee em ON em.p_id = p.p_id
        JOIN
            address ad ON ad.add_id = p.ad_id
        JOIN
            user_branch ub ON ub.u_br_id = p.u_br_id
        JOIN
            users u ON u.usr_id = ub.usr_id
        ORDER BY
            p.p_name;
    ELSE
        RETURN QUERY
        SELECT
            em.tt_id,
            p.p_name AS person_name,
            p.tel AS phone_number,
            em.salary,
            CONCAT(ad.district, ' - ', ad.village) AS location,  -- Concatenate district and village
            p.p_type AS person_type,
            u.username
        FROM
            people p
        JOIN
            employee em ON em.p_id = p.p_id
        JOIN
            address ad ON ad.add_id = p.ad_id
        JOIN
            user_branch ub ON ub.u_br_id = p.u_br_id
        JOIN
            users u ON u.usr_id = ub.usr_id
        WHERE
            em.br_id = p_branch_id  -- Filter by branch ID
        ORDER BY
            p.p_name;
    END IF;
END;
$function$;

-- ----- subject_class_show -----
-- cl_id and a_y_id filters apply in BOTH branches; only cl.br_id is dropped for 'All'.
CREATE OR REPLACE FUNCTION public.subject_class_show(br_id_sp integer, cl_id_sp integer, a_y_id_sp integer)
 RETURNS TABLE(sub_cl_id integer, cl_id integer, academic_name character varying, class_name character varying, sub_id integer, subject_name character varying, emp_id integer, employee_name character varying, no_of_period integer, state character varying, u_br_id integer, reg_date date, a_y_id integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = br_id_sp;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            sc.sub_cl_id::integer,
            sc.cl_id::integer,
		ac.academic_name::varchar,
            cl.class::varchar,
            sc.sub_id::integer,
            s.name::varchar,
            sc.emp_id::integer,
            p.p_name::varchar AS employee_name,
            sc.no_of_period::integer,
            sc.state::varchar,
            sc.u_br_id::integer,
            sc.reg_date::date,
            sc.a_y_id::integer
        FROM subjects s
        JOIN subject_class sc ON s.sub_id = sc.sub_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN employee em ON em.emp_id = sc.emp_id
        JOIN people p ON p.p_id = em.p_id
	join academic_year ac on ac.a_y_id = sc.a_y_id
        WHERE sc.cl_id = cl_id_sp
          AND sc.a_y_id = a_y_id_sp

        ORDER BY sc.sub_cl_id DESC;
    ELSE
        RETURN QUERY
        SELECT
            sc.sub_cl_id::integer,
            sc.cl_id::integer,
		ac.academic_name::varchar,
            cl.class::varchar,
            sc.sub_id::integer,
            s.name::varchar,
            sc.emp_id::integer,
            p.p_name::varchar AS employee_name,
            sc.no_of_period::integer,
            sc.state::varchar,
            sc.u_br_id::integer,
            sc.reg_date::date,
            sc.a_y_id::integer
        FROM subjects s
        JOIN subject_class sc ON s.sub_id = sc.sub_id
        JOIN class cl ON sc.cl_id = cl.cl_id
        JOIN employee em ON em.emp_id = sc.emp_id
        JOIN people p ON p.p_id = em.p_id
	join academic_year ac on ac.a_y_id = sc.a_y_id
        WHERE cl.br_id = br_id_sp
          AND sc.cl_id = cl_id_sp
          AND sc.a_y_id = a_y_id_sp

        ORDER BY sc.sub_cl_id DESC;
    END IF;
END;
$function$;

-- ============================================================================
-- End of migration. 25 functions rewritten.
-- ============================================================================
