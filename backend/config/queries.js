/**
 * API Queries Config - Whitelist of allowed queries
 * Keys must match: crudConfig optionsKey (dropdowns) and menuConfig queryName (datatables).
 * DB: level_type table must exist and have rows so Level Setup "Level Type" dropdown has options.
 */
const QUERIES = {
  // ---- Dropdowns (optionsKey in crudConfig) – must return value + label columns for selects ----
  level_type: 'SELECT l.l_ty_id, l.name AS level_name FROM level_type l ORDER BY l.name',
  accounts: 'SELECT * FROM accounts ORDER BY acc_id',
  gendersections: 'SELECT * FROM accounts ORDER BY acc_id',

  // ---- Datatable / entity queries (queryName in menuConfig) ----
  LevelSetup: 'SELECT lev.*, lt.name AS level_name FROM level lev LEFT JOIN level_type lt ON lt.l_ty_id = COALESCE(lev.l_ty_id_sp, lev.l_ty_id) ORDER BY lev.lev_id_sp',
  ClassSetup: 'SELECT * FROM class ORDER BY cl_id_sp',
  ClassFormaster: 'SELECT * FROM class_formaster ORDER BY 1',
  SubjectsSetup: 'SELECT * FROM subjects ORDER BY subject_id',
  SubjectClassSetup: 'SELECT * FROM subject_class ORDER BY 1',
  academicYeartab: 'SELECT * FROM studentacademicyears ORDER BY studentacademicyear_id',
  BranchTransfer: 'SELECT * FROM branch_transfer ORDER BY 1',
  AcademicTransfer: 'SELECT * FROM academic_transfer ORDER BY 1',
  ClassTransfer: 'SELECT * FROM class_transfer ORDER BY 1',
  LessonActivityMark: 'SELECT * FROM lesson_activity_mark ORDER BY 1',
  LessonActivityResults: 'SELECT * FROM lesson_activity_results ORDER BY 1',
  Students: 'SELECT * FROM students ORDER BY student_id',
  Responsible: 'SELECT * FROM responsible ORDER BY 1',
  studentstate: 'SELECT * FROM student_state ORDER BY 1',
  bus: 'SELECT * FROM bus ORDER BY 1',
  Studentinfo: 'SELECT * FROM students ORDER BY student_id',
  'update school': 'SELECT * FROM school ORDER BY 1',

  // Legacy / aliases
  students: 'SELECT * FROM students ORDER BY student_id',
  studentacademicyears: 'SELECT * FROM studentacademicyears ORDER BY studentacademicyear_id',
  student_classes: 'SELECT * FROM student_classes ORDER BY student_class_id',
  subjects: 'SELECT * FROM subjects ORDER BY subject_id',
  studentsubjects: 'SELECT * FROM studentsubjects ORDER BY studentsubject_id',
};

const DEFAULT_QUERY = 'accounts';

/** Returns SQL for name, or null if not whitelisted. Case-insensitive lookup. */
function getQuery(name) {
  const key = (name || '').trim().toLowerCase();
  if (!key) return null;
  const found = Object.keys(QUERIES).find((k) => k.toLowerCase() === key);
  return found ? QUERIES[found] : null;
}

function getAvailableQueries() {
  return Object.entries(QUERIES).map(([id]) => ({
    id,
    label: id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  }));
}

module.exports = { getQuery, getAvailableQueries, QUERIES };
