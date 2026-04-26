-- Patched student_state_sp – same logic, fixed INSERTs
-- - Uses named columns (no positional misalignment)
-- - Copies fee/food/academic_fee/discount/bus_id/bus_fee + 5 other NOT NULL
--   columns from the last student_class WHERE state='Continue' for the same student
-- - charge / receipt INSERTs use named columns
-- - Trailing fall-through block preserved verbatim (unreachable in normal flow)

CREATE OR REPLACE FUNCTION public.student_state_sp(
    ids integer,
    clas integer,
    academic integer,
    reason character varying,
    oper_fee character varying,
    fee_amount numeric,
    account_pr character varying,
    to_class character varying,
    description_sp text,
    date_sp date,
    user_id integer)
    RETURNS TABLE(result text)
    LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_a_y_id_active INT;
    v_std_cl_id INT;
    v_a_y_id INT;
    v_std_id INT;
    v_sc_id INT;
    v_academic INT;
    v_charge_last INT;
    v_amounts DECIMAL(65,3);
    v_to_class_int INT;
    v_fee NUMERIC;
    v_food NUMERIC;
    v_academic_fee NUMERIC;
    v_discount NUMERIC;
    v_bus_id INT;
    v_bus_fee NUMERIC;
    v_st_ty_id INT;
    v_free_description TEXT;
    v_resident_type VARCHAR;
    v_bar_bilaw VARCHAR;
    v_into_xidisanyahay VARCHAR;
BEGIN
    IF NOT EXISTS (
        SELECT *
        FROM users u
        JOIN user_branch ub ON u.usr_id = ub.usr_id
        WHERE u.lock_user = 'Unlocked'
          AND u.state = 'Active'
          AND ub.u_br_id = user_id
    ) THEN
        RETURN QUERY SELECT body::TEXT FROM alerts WHERE title = 'Userlock';
        RETURN;
    END IF;

    SELECT ac.a_y_id INTO v_a_y_id_active
    FROM academic_year ac
    WHERE ac.state = 'Active'
    ORDER BY ac.a_y_id DESC
    LIMIT 1;

    SELECT s.std_cl_id, s.a_y_id, s.std_id
    INTO v_std_cl_id, v_a_y_id, v_std_id
    FROM student_class s
    WHERE s.std_id = ids
    ORDER BY s.std_cl_id DESC
    LIMIT 1;

    SELECT fee, food, academic_fee, discount, bus_id, bus_fee,
           st_ty_id, free_description, resident_type, bar_bilaw, into_xidisanyahay
    INTO   v_fee, v_food, v_academic_fee, v_discount, v_bus_id, v_bus_fee,
           v_st_ty_id, v_free_description, v_resident_type, v_bar_bilaw, v_into_xidisanyahay
    FROM student_class
    WHERE std_id = ids AND state = 'Continue'
    ORDER BY std_cl_id DESC
    LIMIT 1;

    IF reason = 'Inactive' THEN
        IF EXISTS (
            SELECT 1 FROM student s WHERE s.std_id = v_std_id AND s.state = 'Active'
        ) THEN
            UPDATE student SET state = reason WHERE std_id = ids;

            INSERT INTO student_state (std_cl_id, state, description, u_br_id, reg_date)
            VALUES (v_std_cl_id, reason, description_sp, user_id, date_sp);

            RETURN QUERY SELECT body::TEXT FROM alerts WHERE title = 'Update';
            RETURN;
        ELSE
            RETURN QUERY SELECT 'This student is Already Inactive'::TEXT;
            RETURN;
        END IF;

    ELSIF reason = 'Active' THEN
        IF EXISTS (
            SELECT 1 FROM student s WHERE s.std_id = v_std_id AND s.state = 'Inactive'
        ) THEN
            IF v_std_id = ids AND v_a_y_id = academic THEN
                UPDATE student SET state = reason WHERE std_id = ids;

                INSERT INTO student_state (std_cl_id, state, description, u_br_id, reg_date)
                VALUES (v_std_cl_id, reason, description_sp, user_id, date_sp);

                IF v_a_y_id_active IS NOT NULL AND v_a_y_id_active <> academic THEN
                    IF COALESCE(BTRIM(to_class), '') <> '' AND to_class ~ '^[0-9]+$' THEN
                        v_to_class_int := to_class::INT;

                        UPDATE student_class
                        SET cl_id = clas, a_y_id = academic, state = 'Passed'
                        WHERE std_cl_id = v_std_cl_id;

                        INSERT INTO student_class (
                            std_id, cl_id, a_y_id, b_id,
                            fee, food, academic_fee, discount,
                            bus_id, bus_fee, st_ty_id, free_description,
                            resident_type, bar_bilaw, into_xidisanyahay,
                            state, u_br_id, reg_date
                        ) VALUES (
                            ids, v_to_class_int, v_a_y_id_active, 1,
                            COALESCE(v_fee, 0), COALESCE(v_food, 0),
                            COALESCE(v_academic_fee, 0), COALESCE(v_discount, 0),
                            v_bus_id, COALESCE(v_bus_fee, 0),
                            COALESCE(v_st_ty_id, 0), COALESCE(v_free_description, 'N/A'),
                            COALESCE(v_resident_type, 'Resident'),
                            COALESCE(v_bar_bilaw, CURRENT_DATE::TEXT),
                            COALESCE(v_into_xidisanyahay, 'None'),
                            'Continue', user_id, CURRENT_DATE
                        );
                    ELSE
                        UPDATE student_class
                        SET cl_id = clas, a_y_id = academic, state = 'Failed'
                        WHERE std_cl_id = v_std_cl_id;

                        INSERT INTO student_class (
                            std_id, cl_id, a_y_id, b_id,
                            fee, food, academic_fee, discount,
                            bus_id, bus_fee, st_ty_id, free_description,
                            resident_type, bar_bilaw, into_xidisanyahay,
                            state, u_br_id, reg_date
                        ) VALUES (
                            ids, clas, v_a_y_id_active, 1,
                            COALESCE(v_fee, 0), COALESCE(v_food, 0),
                            COALESCE(v_academic_fee, 0), COALESCE(v_discount, 0),
                            v_bus_id, COALESCE(v_bus_fee, 0),
                            COALESCE(v_st_ty_id, 0), COALESCE(v_free_description, 'N/A'),
                            COALESCE(v_resident_type, 'Resident'),
                            COALESCE(v_bar_bilaw, CURRENT_DATE::TEXT),
                            COALESCE(v_into_xidisanyahay, 'None'),
                            'Continue', user_id, CURRENT_DATE
                        );
                    END IF;
                END IF;

                SELECT sc.std_cl_id, sc.a_y_id
                INTO v_sc_id, v_academic
                FROM student_class sc
                JOIN student s ON s.std_id = sc.std_id
                WHERE s.state = 'Active' AND sc.state = 'Continue' AND sc.std_id = ids
                ORDER BY sc.std_cl_id DESC
                LIMIT 1;

                IF oper_fee = 'Charged' AND fee_amount > 0 THEN
                    INSERT INTO charge (std_cl_id, amount, discount, reason, state, reg_date, u_br_id)
                    VALUES (v_sc_id, fee_amount, 0, 'Inactive fee', 'Active', CURRENT_DATE, user_id);

                ELSIF oper_fee = 'Full Payment' AND fee_amount > 0 THEN
                    INSERT INTO charge (std_cl_id, amount, discount, reason, state, reg_date, u_br_id)
                    VALUES (v_sc_id, fee_amount, 0, 'Inactive fee', 'Active', CURRENT_DATE, user_id);

                    SELECT ch.ch_id, ch.amount
                    INTO v_charge_last, v_amounts
                    FROM charge ch
                    WHERE ch.std_cl_id = v_sc_id AND ch.reason = 'Inactive fee'
                    ORDER BY ch.ch_id DESC
                    LIMIT 1;

                    INSERT INTO receipt (ch_id, amount, acc_id, phone, balance_text, reg_date, u_br_id)
                    VALUES (v_charge_last, v_amounts, NULLIF(account_pr, '')::INT, '', '', CURRENT_DATE, user_id);
                END IF;
            END IF;

            RETURN QUERY SELECT body::TEXT FROM alerts WHERE title = 'Update';
            RETURN;
        ELSE
            RETURN QUERY SELECT 'This student is Already Active'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Fall-through (unreachable for Active/Inactive). Preserved verbatim.
    -- WARNING: 'users.id' and 'user_privelege' do not exist in current schema.
    IF EXISTS (SELECT 1 FROM users u WHERE u.id = ids) THEN
        UPDATE users u
        SET state = reason
        FROM user_branch ub, user_privelege up
        WHERE u.u_id = ub.u_id
          AND ub.u_br_id = up.u_br_id
          AND up.sp_id = 473
          AND u.id <> 0
          AND u.id = ids;
    END IF;

    RETURN QUERY SELECT body::TEXT FROM alerts WHERE title = 'Update';
END;
$BODY$;
