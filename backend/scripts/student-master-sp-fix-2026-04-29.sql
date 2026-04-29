/**
 * student-master-sp-fix-2026-04-29.sql
 *
 * Wax ka beddel student_master_sp (full student registration: people + student
 * + student_class + charge):
 *
 *   1) Magaca tiir-ka qaldan ee student_class.std_ty_f_id waa la beddelay
 *      magaca saxda ah `st_ty_id` (student_class column = st_ty_id, fk →
 *      student_type_fee.st_ty_id).
 *   2) INSERT path: hubinta duplicate student waxay imanaysaa KA HOR insert
 *      people, si `people` row aan loo banbaaray (orphan) marka student
 *      duplicate noqdo oo SP-gu hore u soo celiyay 'AlreadyInsert'.
 *   3) UPDATE path: student_class hadda waxaa la cusboonaysiiyaa shartiga
 *      `std_cl_id = (latest std_cl_id of std_id)` ee ku saleysan std_id keligii
 *      — sidaas darteed isbeddelka cl_id (fasal-beddel) wuu shaqayn doonaa.
 *   4) Insert dheeraad ah: marka register_fee_sp > 0, waxaa la sameynayaa
 *      hal row `charge` ah (Reason='Registration fee', state='Pending').
 *   5) DELETE path: hadda waxaa hor leh hubin NotRegDelete; haddii student-ku
 *      ma jiro, alert NotRegDelete ayaa la soo celin doonaa halkii khalad ah.
 */

DROP FUNCTION IF EXISTS public.student_master_sp(
    integer, character varying, character varying, character varying,
    character varying, integer, character varying, character varying,
    character varying, character varying, integer, integer,
    character varying, character varying, character varying, date,
    integer, character varying, character varying, character varying,
    character varying, character varying, character varying, numeric,
    integer, integer, integer, integer, numeric, numeric, numeric,
    numeric, integer, numeric, integer, character varying, character varying,
    character varying, character varying, character varying, character varying);

CREATE OR REPLACE FUNCTION public.student_master_sp(
    std_id_sp integer,
    p_name_sp character varying,
    tel_sp character varying,
    sex_sp character varying,
    email_sp character varying,
    ad_id_sp integer,
    p_type_sp character varying,
    state_p_sp character varying,
    emis_id_sp character varying,
    id_card_sp character varying,
    res_id_sp integer,
    r_r_id_sp integer,
    mothername_sp character varying,
    mother_phone_sp character varying,
    pob_sp character varying,
    dob_sp date,
    en_ty_id_sp integer,
    transfer_school_sp character varying,
    std_state_sp character varying,
    image_sp character varying,
    orphan_status_sp character varying,
    disability_status_sp character varying,
    refugee_sp character varying,
    register_fee_sp numeric,
    u_br_id_sp integer,
    cl_id_sp integer,
    a_y_id_sp integer,
    b_id_sp integer,
    fee_sp numeric,
    food_sp numeric,
    academic_fee_sp numeric,
    discount_sp numeric,
    bus_id_sp integer,
    bus_fee_sp numeric,
    std_ty_f_id_sp integer,
    free_description_sp character varying,
    resident_type_sp character varying,
    bar_bilaw_sp character varying,
    into_xidisanyahay_sp character varying,
    sc_state_sp character varying,
    oper character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    msg          VARCHAR;
    new_p_id     INT;
    new_std_id   INT;
    new_std_cl_id INT;
BEGIN

    /* =================== INSERT =================== */
    IF oper = 'insert' THEN

        -- 1) Hubi duplicate student KA HOR (si aan people row banbaaran).
        IF EXISTS (
            SELECT 1 FROM student
            WHERE (NULLIF(emis_id_sp, '') IS NOT NULL AND emis_id = emis_id_sp)
               OR (NULLIF(id_card_sp, '') IS NOT NULL AND id_card = id_card_sp)
        ) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert';
            RETURN COALESCE(msg, 'AlreadyInsert');
        END IF;

        -- 2) PEOPLE: dib u isticmaal haddii la helo magac+tel isku mid; haddii kale insert.
        IF EXISTS (
            SELECT 1 FROM people
            WHERE lower(p_name) = lower(p_name_sp) AND tel = tel_sp
        ) THEN
            SELECT p_id INTO new_p_id FROM people
             WHERE lower(p_name) = lower(p_name_sp) AND tel = tel_sp
             ORDER BY p_id DESC LIMIT 1;
        ELSE
            INSERT INTO people(p_name, tel, sex, email, ad_id, state, p_type, reg_date, u_br_id)
            VALUES (
                p_name_sp,
                tel_sp,
                sex_sp,
                COALESCE(NULLIF(email_sp,''), ''),
                ad_id_sp,
                COALESCE(NULLIF(state_p_sp,''), 'Active'),
                COALESCE(NULLIF(p_type_sp,''),  'Student'),
                now(),
                u_br_id_sp
            )
            RETURNING p_id INTO new_p_id;
        END IF;

        -- 3) STUDENT
        INSERT INTO student(
            emis_id, id_card, p_id, res_id, r_r_id,
            mothername, mother_phone, pob, dob, en_ty_id,
            transfer_school, state, image, orphan_status,
            disability_status, refugee, register_fee,
            u_br_id, reg_date
        ) VALUES (
            emis_id_sp, id_card_sp, new_p_id, res_id_sp, r_r_id_sp,
            mothername_sp, mother_phone_sp, pob_sp, dob_sp, en_ty_id_sp,
            transfer_school_sp,
            COALESCE(NULLIF(std_state_sp,''), 'Active'),
            image_sp, orphan_status_sp,
            disability_status_sp, refugee_sp, register_fee_sp,
            u_br_id_sp, now()
        ) RETURNING std_id INTO new_std_id;

        -- 4) STUDENT_CLASS  (sax magac-saxan: st_ty_id, NOT std_ty_f_id)
        INSERT INTO student_class(
            std_id, cl_id, a_y_id, b_id, fee, food, academic_fee,
            discount, bus_id, bus_fee, st_ty_id, free_description,
            resident_type, bar_bilaw, into_xidisanyahay, state,
            u_br_id, reg_date
        ) VALUES (
            new_std_id, cl_id_sp, a_y_id_sp, b_id_sp,
            COALESCE(fee_sp, 0), COALESCE(food_sp, 0),
            COALESCE(academic_fee_sp, 0), COALESCE(discount_sp, 0),
            bus_id_sp, COALESCE(bus_fee_sp, 0),
            std_ty_f_id_sp,
            COALESCE(free_description_sp, ''),
            COALESCE(NULLIF(resident_type_sp,''), 'Day'),
            COALESCE(NULLIF(bar_bilaw_sp,''), 'No'),
            COALESCE(NULLIF(into_xidisanyahay_sp,''), 'No'),
            COALESCE(NULLIF(sc_state_sp,''), 'Continue'),
            u_br_id_sp, now()
        ) RETURNING std_cl_id INTO new_std_cl_id;

        -- 5) Registration fee → charge (kaliya hadduu register_fee_sp > 0)
        IF COALESCE(register_fee_sp, 0) > 0 THEN
            INSERT INTO charge(std_cl_id, amount, discount, reason, state, reg_date, u_br_id)
            VALUES (new_std_cl_id, register_fee_sp, 0, 'Registration fee', 'Pending', now(), u_br_id_sp);
        END IF;

        SELECT body INTO msg FROM alerts WHERE title = 'Insert';
        RETURN COALESCE(msg, 'Insert');

    /* =================== UPDATE =================== */
    ELSIF oper = 'update' THEN

        SELECT s.p_id INTO new_p_id FROM student s WHERE s.std_id = std_id_sp;
        IF new_p_id IS NULL THEN
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
            RETURN COALESCE(msg, 'NotRegUpdate');
        END IF;

        UPDATE people
           SET p_name = p_name_sp,
               tel    = tel_sp,
               sex    = sex_sp,
               email  = email_sp,
               ad_id  = ad_id_sp,
               p_type = p_type_sp
         WHERE p_id = new_p_id;

        UPDATE student
           SET emis_id = emis_id_sp,
               id_card = id_card_sp,
               res_id = res_id_sp,
               r_r_id = r_r_id_sp,
               mothername = mothername_sp,
               mother_phone = mother_phone_sp,
               pob = pob_sp,
               dob = dob_sp,
               en_ty_id = en_ty_id_sp,
               transfer_school = transfer_school_sp,
               image = image_sp,
               orphan_status = orphan_status_sp,
               disability_status = disability_status_sp,
               refugee = refugee_sp,
               register_fee = register_fee_sp
         WHERE std_id = std_id_sp;

        -- Cusboonaysii student_class-ka ugu dambeeyay ee ardaygan; sidaas darteed
        -- isbeddelka cl_id (fasal-beddel) wuu shaqayn doonaa.
        UPDATE student_class
           SET cl_id = cl_id_sp,
               a_y_id = a_y_id_sp,
               b_id = b_id_sp,
               fee = COALESCE(fee_sp, 0),
               food = COALESCE(food_sp, 0),
               academic_fee = COALESCE(academic_fee_sp, 0),
               discount = COALESCE(discount_sp, 0),
               bus_id = bus_id_sp,
               bus_fee = COALESCE(bus_fee_sp, 0),
               st_ty_id = std_ty_f_id_sp,
               free_description = COALESCE(free_description_sp, ''),
               resident_type = COALESCE(NULLIF(resident_type_sp,''), 'Day'),
               bar_bilaw = COALESCE(NULLIF(bar_bilaw_sp,''), 'No'),
               into_xidisanyahay = COALESCE(NULLIF(into_xidisanyahay_sp,''), 'No'),
               u_br_id = u_br_id_sp
         WHERE std_cl_id = (
            SELECT std_cl_id FROM student_class
             WHERE std_id = std_id_sp
             ORDER BY std_cl_id DESC LIMIT 1
         );

        SELECT body INTO msg FROM alerts WHERE title = 'Update';
        RETURN COALESCE(msg, 'Update');

    /* =================== DELETE =================== */
    ELSIF oper = 'delete' THEN

        SELECT s.p_id INTO new_p_id FROM student s WHERE s.std_id = std_id_sp;
        IF new_p_id IS NULL THEN
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegDelete';
            RETURN COALESCE(msg, 'NotRegDelete');
        END IF;

        DELETE FROM student_class WHERE std_id = std_id_sp;
        DELETE FROM student       WHERE std_id = std_id_sp;
        DELETE FROM people        WHERE p_id   = new_p_id;

        SELECT body INTO msg FROM alerts WHERE title = 'Delete';
        RETURN COALESCE(msg, 'Delete');

    ELSE
        RETURN 'Invalid Operation';
    END IF;

END;
$function$;
