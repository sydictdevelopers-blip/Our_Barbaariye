/**
 * responsible-relation-somali-2026-04-29.sql
 *
 * Hubi inay ku jiraan responsible_relation 8-da magac ee Soomaaliyeed ee laga
 * dalbado student-registration form-ka. Idempotent: hadduu hore u jiro,
 * waxba ma sameeyo (xog sameyseeya FK student.r_r_id ma jabin).
 *
 *   Hooyo, Aabo, Aboowe, Abaayo, Adeer, Abti, Eedo, Habaryar
 */
INSERT INTO responsible_relation (relationtype)
SELECT v.name
  FROM (VALUES
    ('Hooyo'),
    ('Aabo'),
    ('Aboowe'),
    ('Abaayo'),
    ('Adeer'),
    ('Abti'),
    ('Eedo'),
    ('Habaryar')
  ) AS v(name)
 WHERE NOT EXISTS (
        SELECT 1 FROM responsible_relation r
         WHERE r.relationtype = v.name
       );
