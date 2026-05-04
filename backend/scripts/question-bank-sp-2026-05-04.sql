-- FUNCTION: public.question_bank_sp(integer, integer, integer, integer, integer, text, integer, integer, character varying)

DROP FUNCTION IF EXISTS public.question_bank_sp(integer, integer, integer, integer, integer, text, integer, integer, character varying);

CREATE OR REPLACE FUNCTION public.question_bank_sp(
	q_b_id_sp integer,
	ex_c_id_sp integer,
	chap_id_sp integer,
	su_id_sp integer,
	gr_id_sp integer,
	question_sp text,
	u_br_id_sp integer,
	language_sp integer,
	oper character varying)
    RETURNS character varying
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
    msg VARCHAR;
BEGIN

    /* ======================
       INSERT
    ====================== */
    IF oper = 'insert' THEN

        IF EXISTS (
            SELECT *
            FROM question_bank
            WHERE ex_c_id = ex_c_id_sp
              AND chap_id = chap_id_sp
              AND su_id   = su_id_sp
              AND question = question_sp
        ) THEN
            SELECT body
            INTO msg
            FROM alerts
            WHERE title = 'AlreadyInsert'
              AND lang_id = language_sp;
        ELSE
            INSERT INTO question_bank (
                ex_c_id,
                chap_id,
                su_id,
                gr_id,
                question,
                reg_date,
                u_br_id
            )
            VALUES (
                ex_c_id_sp,
                chap_id_sp,
                su_id_sp,
                gr_id_sp,
                question_sp,
                now(),
                u_br_id_sp
            );

            SELECT body
            INTO msg
            FROM alerts
            WHERE title = 'Insert'
              AND lang_id = language_sp;
        END IF;

    /* ======================
       UPDATE
    ====================== */
    ELSIF oper = 'update' THEN

        IF EXISTS (
            SELECT 1
            FROM question_bank
            WHERE q_b_id = q_b_id_sp
        ) THEN
            UPDATE question_bank
            SET
                ex_c_id  = ex_c_id_sp,
                chap_id  = chap_id_sp,
                su_id    = su_id_sp,
                gr_id    = gr_id_sp,
                question = question_sp,
                u_br_id  = u_br_id_sp
            WHERE q_b_id = q_b_id_sp;

            SELECT body
            INTO msg
            FROM alerts
            WHERE title = 'Update'
              AND lang_id = language_sp;
        ELSE
            SELECT body
            INTO msg
            FROM alerts
            WHERE title = 'NotRegUpdate'
              AND lang_id = language_sp;
        END IF;

    /* ======================
       DELETE
    ====================== */
    ELSIF oper = 'delete' THEN

        IF EXISTS (
            SELECT 1
            FROM question_bank
            WHERE q_b_id = q_b_id_sp
        ) THEN
            DELETE FROM question_bank
            WHERE q_b_id = q_b_id_sp;

            SELECT body
            INTO msg
            FROM alerts
            WHERE title = 'Delete'
              AND lang_id = language_sp;
        ELSE
            SELECT body
            INTO msg
            FROM alerts
            WHERE title = 'NotRegUpdate'
              AND lang_id = language_sp;
        END IF;

    ELSE
        msg := 'Invalid Operation';
    END IF;

    RETURN msg;

END;
$BODY$;

ALTER FUNCTION public.question_bank_sp(integer, integer, integer, integer, integer, text, integer, integer, character varying)
    OWNER TO postgres;
