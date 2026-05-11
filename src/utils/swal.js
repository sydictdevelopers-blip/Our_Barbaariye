import Swal from 'sweetalert2';
import i18n from '../i18n/i18n';

/**
 * Component guud – Sweet Alert la wada isticmaali karo.
 * Design-ka app-ka (primary, rounded-xl) waa la adeegsadaa.
 *
 * Luuqadaha: titles/buttons/texts waxay si toos ah ugu rogmadaan i18n.
 * Fariimaha Database-ka ka yimaada (e.g. 'inserted', 'updated', 'N records added',
 * 'already exists') waxaa la kala saari karaa pattern-no caadi ah loona tarjumaa
 * luuqada hadda firfircoon. Hadduu qoraalku aan aqoonsana, wuxuu sii dhaafaa sidii hore.
 */
const swalClass = {
  container: 'swal-on-top',
  popup: 'swal-app-popup',
  title: 'swal-app-title',
  htmlContainer: 'swal-app-html',
  confirmButton: 'swal-app-confirm',
  cancelButton: 'swal-app-cancel',
  actions: 'swal-app-actions',
};

const t = (key, opts) => i18n.t(key, opts);

/** Fariimaha guud ee DB-ga / hardcoded Somali-ga loo rogo i18n key. */
const MESSAGE_MAP = [
  // DB return values
  { re: /^\s*inserted\s*$/i, key: 'swal.texts.added' },
  { re: /^\s*updated\s*$/i, key: 'swal.texts.updated' },
  { re: /^\s*deleted\s*$/i, key: 'swal.texts.deleted' },
  { re: /^\s*success\s*$/i, key: 'swal.texts.saved' },
  { re: /^\s*no operation\s*$/i, key: 'swal.texts.noOperation' },
  // "N records added"
  { re: /^\s*(\d+)\s+records?\s+added\s*$/i, key: 'swal.texts.recordsAdded', countGroup: 1 },
  // already-exists variants (English / Somali / Arabic)
  { re: /already\s*exists?|duplicate|horey u jira|hore u jira|موجود\s*مسبق/i, key: 'swal.titles.alreadyExists' },

  // teacher_state_sp guards — return a state-specific sentence in every UI
  // language so the body never reads as the mixed "This Employee is Already
  // Firfircoon" hybrid (English skeleton + a single translated state word).
  { re: /this\s+employee\s+is\s+already\s+active/i,    key: 'swal.texts.employeeAlreadyActive' },
  { re: /this\s+employee\s+is\s+already\s+inactive/i,  key: 'swal.texts.employeeAlreadyInactive' },
  { re: /this\s+employee\s+is\s+already\s+suspended/i, key: 'swal.texts.employeeAlreadySuspended' },
  { re: /this\s+employee\s+is\s+already\s+on\s*leave/i, key: 'swal.texts.employeeAlreadyOnLeave' },

  // English sentences ka yimaada SP-yada DB-ga (delete)
  { re: /this (information|record|data) (has been|is) (correctly )?(deleted|removed)( correctly)?\.?/i, key: 'swal.texts.deleted' },
  { re: /(record|data|row) (deleted|removed)( successfully| correctly)?\.?/i, key: 'swal.texts.deleted' },
  // (update / modify / change / edit)
  { re: /this (information|record|data) (has been|is) (correctly )?(updated|modified|changed|edited)( correctly)?\.?/i, key: 'swal.texts.updated' },
  { re: /(record|data|row) (updated|modified|changed|edited)( successfully| correctly)?\.?/i, key: 'swal.texts.updated' },
  // (insert / register / save / create / add)
  { re: /this (information|record|data) (has been|is) (correctly )?(registered|inserted|saved|added|created)( correctly)?\.?/i, key: 'swal.texts.saved' },
  { re: /(record|data|row) (registered|inserted|saved|created)( successfully| correctly)?\.?/i, key: 'swal.texts.saved' },

  // Alerts table (DB-ga gudaha — body kasta oo SP-yadu soo celiyaan):
  // "This information is not registered" — hits NotRegDelete & NotRegUpdate
  { re: /this\s+(information|record|data|user(?:name)?)\s+is\s+not\s+(?:registered|reg)\b/i, key: 'swal.texts.notRegistered' },
  { re: /(your\s+)?username\s+is\s+not\s+registered/i, key: 'swal.texts.notRegistered' },
  // "This Information Was Not Found!"
  { re: /this\s+(information|record|data)\s+was\s+not\s+found/i, key: 'swal.texts.notFound' },
  // "This information has been already exist" (note: missing 's')
  { re: /this\s+(information|record|data)\s+(has\s+been\s+)?already\s+exists?\b/i, key: 'swal.titles.alreadyExists' },
  // "This information did not make any changes"
  { re: /this\s+(information|record|data)\s+did\s+not\s+make\s+any\s+changes?/i, key: 'swal.texts.noChanges' },
  // "This information can not be deleted" / "cannot be deleted"
  { re: /this\s+(information|record|data)\s+can\s*not\s+be\s+deleted/i, key: 'swal.texts.cantDelete' },
  // "Nothing to delete"
  { re: /^\s*nothing\s+to\s+delete\s*$/i, key: 'swal.texts.nothingToDelete' },
  // "This operation has been already activated" / "already inactivated"
  { re: /this\s+operation\s+(has\s+been\s+)?already\s+activated/i, key: 'swal.texts.alreadyActivated' },
  { re: /this\s+operation\s+(has\s+been\s+)?already\s+inactivated/i, key: 'swal.texts.alreadyInactivated' },
  // "This operation has been activated" / "inactivated"
  { re: /this\s+operation\s+(has\s+been\s+)?activated\s*$/i, key: 'swal.texts.activated' },
  { re: /this\s+operation\s+(has\s+been\s+)?inactivated\s*$/i, key: 'swal.texts.inactivated' },
  // "This Month Already Charged"
  { re: /this\s+month\s+already\s+charged/i, key: 'swal.texts.alreadyCharged' },
  // "Charged Successfully"
  { re: /^\s*charged\s+successfully\s*$/i, key: 'swal.texts.charged' },
  // "Invalid Date"
  { re: /^\s*invalid\s+date\s*$/i, key: 'swal.texts.invalidDate' },
  // "Sorry Charge Date did not Reach"
  { re: /sorry\s+charge\s+date\s+did\s+not\s+reach/i, key: 'swal.texts.chargeDateNotReached' },
  // "Please complete the information correctly" — Fill alert
  { re: /please\s+complete\s+the\s+information\s+correctly/i, key: 'swal.texts.fillCorrectly' },
  // "Your Password Has been Changed"
  { re: /your\s+password\s+(has\s+been\s+)?changed/i, key: 'swal.texts.passwordChanged' },
  // "This user is already locked"
  { re: /this\s+user\s+is\s+already\s+locked/i, key: 'swal.texts.userAlreadyLocked' },
  // "This student can not be changed in this class"
  { re: /this\s+student\s+can\s*not\s+be\s+(?:changed|transferred)\s+in\s+this\s+class/i, key: 'swal.texts.studentCannotTransfer' },
  // "Room Assigned teacher Successfully"
  { re: /room\s+assigned\s+teacher\s+successfully/i, key: 'swal.texts.roomTeacherAssigned' },
  // "this Room Reached Limit Number"
  { re: /(this\s+)?room\s+reached\s+limit\s+number/i, key: 'swal.texts.roomFull' },
  // "Room Collected Students Successfully"
  { re: /room\s+collected\s+students\s+successfully/i, key: 'swal.texts.roomStudentsAssigned' },
  // "There is No Teacher Registered this room"
  { re: /there\s+is\s+no\s+teacher\s+registered\s+this\s+room/i, key: 'swal.texts.roomNoTeacher' },
  // "There is No students Registered this room"
  { re: /there\s+is\s+no\s+students?\s+registered\s+this\s+room/i, key: 'swal.texts.roomNoStudents' },
  // student_marge_sp — "Cannot merge — students are in different Clases"
  { re: /cannot\s+merge.*students?\s+(are\s+)?in\s+different\s+cla[sc]e?s/i, key: 'swal.texts.mergeDifferentClasses' },
  { re: /^\s*merge\s+completed\s+successfully\s*$/i, key: 'swal.texts.mergeSuccess' },
  // employee_sp — "In Use — cannot delete (employee has assignments)"
  { re: /in\s+use[\s\S]*cannot\s+delete[\s\S]*has\s+assignments?/i, key: 'swal.texts.cantDelete' },
  { re: /^\s*in\s+use\b.*$/i, key: 'swal.texts.cantDelete' },

  // hardcoded Somali-ga oo callers isticmaalaan — qori dhammaan qaababka
  // sax-loon ee ay ku qoraan tahay (waa/wa) iyo qoraal-yada `guulaystey`,
  // `guulaysteen`, `guuleystey` si dhammaantood loogu rogo i18n.
  { re: /^\s*(w?aa? la (guulaystey|guulaysteen|guuleystey)|guul)\s*$/i, key: 'swal.titles.success' },
  { re: /^\s*(khalad( ayaa dhacay)?|qalad( nidaamka)?)\s*$/i, key: 'swal.titles.error' },
  { re: /^\s*xogt(a|ada) waa la kaydiyay\.?\s*$/i, key: 'swal.texts.saved' },
  { re: /^\s*xogta waa la cusboonaysiiyay\.?\s*$/i, key: 'swal.texts.updated' },
  { re: /^\s*(record(ka)? )?waa la tirtiray\.?\s*$/i, key: 'swal.texts.deleted' },
  { re: /^\s*added( successfully)?\s*$/i, key: 'swal.texts.added' },
  { re: /^\s*updated( successfully)?\s*$/i, key: 'swal.texts.updated' },
  { re: /^\s*deleted( successfully)?\s*$/i, key: 'swal.texts.deleted' },
  { re: /^\s*records?\s*updated\s*$/i, key: 'swal.texts.updated' },
  { re: /^\s*save failed\.?\s*$/i, key: 'swal.texts.saveFailed' },
  { re: /^\s*delete failed\.?\s*$/i, key: 'swal.texts.deleteFailed' },
  { re: /^\s*update failed\.?\s*$/i, key: 'swal.texts.updateFailed' },
  { re: /^\s*kaydinta way fashilantay\.?\s*$/i, key: 'swal.texts.saveFailed' },
  { re: /^\s*tirtirka way fashilantay\.?\s*$/i, key: 'swal.texts.deleteFailed' },
  { re: /^\s*isku xirka wuu fashilmay\s*$/i, key: 'swal.titles.connectionFailed' },
  { re: /^\s*database-ga lama xiriin karin.*$/i, key: 'swal.texts.connectionFailed' },
  { re: /^\s*ma hubtaa inaad tirtid\??\s*$/i, key: 'swal.titles.confirmDelete' },
  { re: /^\s*ma hubtaa\??\s*$/i, key: 'swal.titles.confirm' },

  // EntityTab + result/approve workflow strings (Somali → entity.* keys)
  { re: /^\s*marks\s+lama\s+gelin\s*$/i, key: 'entity.marksMissingTitle' },
  { re: /^\s*fadlan\s+gali\s+marks\b.*$/i, key: 'entity.marksMissingText' },
  { re: /^\s*(\d+)\s+marks?\s+ayaa\s+la\s+kaydiyay\.?\s*$/i, key: 'entity.marksSavedCount', countGroup: 1 },
  { re: /^\s*filterka\s+lama\s+dhamaystirin\s*$/i, key: 'entity.filterMissingTitle' },
  { re: /^\s*fadlan\s+dooro\s+exam\s+iyo\s+subject\.?\s*$/i, key: 'entity.filterMissingExamSubject' },
  { re: /^\s*function-ka\s+diyaar\s+uma\s+ahan\s*$/i, key: 'entity.inDevTitle' },
  { re: /^\s*(.+?)\s+weli\s+lama\s+dhammaystirin\.?\s*$/i, key: 'entity.inDevText', groups: { 1: 'label' } },
  { re: /^\s*fadlan\s+dooro\s+class\s*$/i, key: 'entity.selectClass' },
  { re: /^\s*fadlan\s+dooro\s+exam\s*$/i, key: 'entity.selectExam' },
  { re: /^\s*fadlan\s+dooro\s+batch\s*$/i, key: 'entity.selectBatch' },
  { re: /^\s*fadlan\s+dooro\s+subject\s*$/i, key: 'entity.selectSubject' },
  { re: /^\s*fadlan\s+dooro\s+level\s*$/i, key: 'entity.selectLevel' },
  { re: /^\s*dooro\s+arday\s*$/i, key: 'entity.selectStudent' },
  // SP responses from result_approve_sp / result_approve_bulk_sp
  { re: /^\s*waa\s+la\s+ansixiyay\.?\s*$/i, key: 'entity.approveSuccess' },
  { re: /^\s*saxnaantii\s+waa\s+la\s+cancel\b.*$/i, key: 'entity.cancelSuccess' },
  { re: /^\s*saxnaan\s+sugnaa\s+kuma\s+jirto\b.*$/i, key: 'entity.noPendingApprovalRow' },
  { re: /^\s*saxnaan\s+sugnaa\s+lama\s+helin\.?\s*$/i, key: 'entity.noPendingApproval' },
  { re: /^\s*natiijada\s+lama\s+helin\.?\s*$/i, key: 'entity.resultNotFound' },
  { re: /^\s*(\d+)\s+natiijo\s+ayaa\s+la\s+ansixiyay\.?\s*$/i, key: 'entity.bulkApprovedCount', countGroup: 1 },
  { re: /^\s*(\d+)\s+saxnaan\s+ayaa\s+la\s+cancel\b.*$/i, key: 'entity.bulkCancelledCount', countGroup: 1 },
  { re: /^\s*hawl\s+aan\s+la\s+aqoonsan\b.*$/i, key: 'entity.operUnknown' },
  // result_sp max-mark guard (interpolated values are dropped — message becomes generic)
  { re: /^\s*dhibcaha\s+la\s+galiyay\b.*ka\s+badan\b.*maximum\b.*$/i, key: 'entity.maxMarkExceeded' },

  // Bulk action confirm dialogs (Result tab Class/Subject Delete + Approve Exam tab)
  { re: /^\s*tani\s+waxay\s+tirtirtaa\s+imtixaanka\s+oo\s+dhan\b.*$/i, key: 'entity.confirmClassExamDelete' },
  { re: /^\s*tani\s+waxay\s+tirtirtaa\s+keliya\s+maaddada\b.*$/i, key: 'entity.confirmSubjectExamDelete' },
  { re: /^\s*tani\s+waxay\s+ansixisaa\s+dhammaan\s+saxnaaynta\s+sugaya\s+ee\s+fasalka\b.*$/i, key: 'entity.confirmApproveByClass' },
  { re: /^\s*tani\s+waxay\s+ansixisaa\s+(?:DHAMMAAN|dhammaan)\s+saxnaaynta\s+sugaya\s+ee\s+fasalada\b.*$/i, key: 'entity.confirmApproveAll' },
  { re: /^\s*tani\s+waxay\s+tirtirtaa\s+(?:DHAMMAAN|dhammaan)\s+saxnaaynta\s+sugaya\b.*$/i, key: 'entity.confirmCancelAll' },

  // ─── PostgreSQL / DB error translations (system-wide) ─────────────────
  // Order matters: more specific patterns first so they win over generic ones.

  // INSERT/UPDATE referencing a non-existent parent row (e.g. user submitted
  // l_ty_id=0 because they didn't pick a Level Type, or chose a value that no
  // longer exists). PG emits: "insert or update on table ... violates foreign
  // key constraint ...". This is a DIFFERENT failure mode from a DELETE that
  // is blocked by children — the message must reflect that.
  {
    re: /insert\s+or\s+update[\s\S]*?violates\s+foreign\s+key/i,
    key: 'dbErrors.fkInvalidReference',
  },
  // DELETE/UPDATE blocked by referencing rows — names the referencing table.
  // The `update or delete` / `still referenced` prefix distinguishes this from
  // the insert/update case above. Some SPs prepend "0Update or 11Delete" — the
  // initial `\d*` allows that.
  {
    re: /(?:\d*\s*update\s+or\s+\d*\s*delete|still\s+referenced)[\s\S]*?violates\s+(?:restrict\s+setting\s+of\s+)?(?:foreign\s*key|no\s+action)[\s\S]*?on\s+table\s+["']([^"']+)["']/i,
    key: 'dbErrors.fkViolationNamed',
    transform: (m) => ({ table: humanizeName(m[1]) }),
  },
  // Postgres v2 phrasing: "still referenced from table \"Y\"" (delete-blocked)
  {
    re: /still\s+referenced\s+from\s+table\s+["']([^"']+)["']/i,
    key: 'dbErrors.fkViolationNamed',
    transform: (m) => ({ table: humanizeName(m[1]) }),
  },
  // Generic FK fallback for delete-blocked cases that don't match the patterns
  // above. Insert/update cases were already caught at the top.
  {
    re: /(?:\d*\s*update\s+or\s+\d*\s*delete)[\s\S]*?violates\s+(?:restrict|foreign\s*key|no\s+action)|still\s+referenced\s+from\s+table/i,
    key: 'dbErrors.fkViolation',
  },
  // Unique constraint
  {
    re: /duplicate\s+key\s+value|violates\s+unique\s+constraint/i,
    key: 'dbErrors.uniqueViolation',
  },
  // NOT NULL
  {
    re: /null\s+value\s+in\s+column\s+["']?([a-zA-Z0-9_]+)["']?\s+(?:of\s+relation\s+["']?[a-zA-Z0-9_]+["']?\s+)?violates\s+not[-\s]?null/i,
    key: 'dbErrors.notNull',
    transform: (m) => ({ column: humanizeName(m[1]) }),
  },
  // CHECK constraint
  {
    re: /violates\s+check\s+constraint/i,
    key: 'dbErrors.checkViolation',
  },
  // Invalid type / syntax — e.g. "invalid input syntax for type integer"
  {
    re: /invalid\s+input\s+(?:syntax|value)\s+for\s+(?:type\s+)?(\w+)/i,
    key: 'dbErrors.invalidInput',
    transform: (m) => ({ type: m[1] }),
  },
  // Value too long for varchar(N)
  {
    re: /value\s+too\s+long\s+for\s+type\s+\w+\s*\(\s*(\d+)\s*\)/i,
    key: 'dbErrors.valueTooLong',
    transform: (m) => ({ max: m[1] }),
  },
  // Permission denied
  {
    re: /permission\s+denied/i,
    key: 'dbErrors.permissionDenied',
  },
  // Connection / network
  {
    re: /(?:connection\s+(?:refused|reset|terminated)|could\s+not\s+connect|econnrefused|enotfound|etimedout|network\s+error|fetch\s+failed)/i,
    key: 'dbErrors.connectionFailed',
  },
  // Deadlock / serialization
  {
    re: /deadlock\s+detected|could\s+not\s+serialize\s+access/i,
    key: 'dbErrors.deadlock',
  },
  // Generic server-side wrap that the backend prepends
  {
    re: /^\s*khalad\s+server\s*[:\-]?\s*(.*)$/i,
    key: 'dbErrors.serverError',
  },
];

/** Convert snake_case / camelCase identifier to a human label.
    "class_formaster" → "Class Formaster". */
function humanizeName(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Replace any known DB value (Active, Inactive, Male, Refugee, etc.) embedded
 * in a free-form message with its translation in the active language. Longer
 * keys are tried first so "No Disability" wins over "No". Used as the fallback
 * pass for swal messages that don't match a regex template.
 */
function tDbInline(text) {
  if (text == null || text === '') return text;
  let result = String(text);
  // Pull dbValues for the active language (with fallback). i18next exposes
  // resource bundles via getResourceBundle.
  const lng = i18n.language || 'so';
  const bundle = i18n.getResourceBundle(lng, 'translation') || {};
  const fallback = i18n.getResourceBundle('so', 'translation') || {};
  const dbValues = { ...(fallback.dbValues || {}), ...(bundle.dbValues || {}) };
  const keys = Object.keys(dbValues).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const translated = dbValues[key];
    if (!translated || translated === key) continue;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // \b only behaves well for ASCII — for keys with spaces or non-ASCII chars
    // (Arabic/Somali) fall back to lookahead/lookbehind on whitespace/punct.
    // The non-ASCII branch captures the boundary char (group 1); the ASCII \b
    // branch has no capture group, so the replacer must distinguish: when the
    // callback's second arg is a number (offset, not a string capture), there
    // was no prefix to preserve.
    const hasPrefixCapture = !(/^[\w]/.test(key) && /[\w]$/.test(key));
    const re = hasPrefixCapture
      ? new RegExp(`(^|[\\s,.;:!?()\\[\\]"'])${escaped}(?=$|[\\s,.;:!?()\\[\\]"'])`, 'g')
      : new RegExp(`\\b${escaped}\\b`, 'g');
    result = result.replace(re, (...args) => {
      if (!hasPrefixCapture) return translated;
      const prefix = args[1];
      return prefix ? `${prefix}${translated}` : translated;
    });
  }
  return result;
}

/** Some PG SPs prepend a numeric counter to the operation word before passing
    it back to a swal title/text (e.g. "25Delete" instead of "Delete"). The
    digits leak through translation and look like garbage to the user. Strip
    them before any pattern matching so the message reads cleanly.
    Avoids lookbehind for older Safari/iOS compat — uses a capture group
    + replacement callback instead. */
function stripOpDigits(str) {
  // Match: optional non-letter boundary char, captured, then digits, then operation word.
  // Replacement keeps the boundary char + operation word, drops the digits.
  return String(str).replace(
    /(^|[^A-Za-z])\d+(Delete|Update|Insert|Activate|Inactivate|Approve|Cancel|Edit|Remove)\b/gi,
    '$1$2'
  );
}

/** U rog fariinta la soo diray i18n haddii ay la mid tahay pattern aan aqoono. */
export function translateMessage(msg) {
  if (msg == null) return '';
  const raw = String(msg);
  if (!raw.trim()) return '';
  const str = stripOpDigits(raw);
  for (const entry of MESSAGE_MAP) {
    const m = str.match(entry.re);
    if (m) {
      if (entry.countGroup) {
        return t(entry.key, { count: Number(m[entry.countGroup]) || 0 });
      }
      if (entry.transform) {
        // transform(match) → object passed straight to i18n interpolation
        return t(entry.key, entry.transform(m));
      }
      if (entry.groups) {
        // groups: { <regex group index>: <i18n placeholder name> }
        const args = {};
        for (const [idx, name] of Object.entries(entry.groups)) {
          args[name] = m[Number(idx)] ?? '';
        }
        return t(entry.key, args);
      }
      return t(entry.key);
    }
  }
  // No template match — best-effort: translate any DB value embedded in the
  // raw message (e.g. SP returns "Status changed to Active" → "...Firfircoon").
  // Strip again on output: tDbInline may turn a lowercased "delete" into "Delete"
  // alongside a leftover numeric prefix from a different code path.
  return stripOpDigits(tDbInline(str));
}

// Recognises rejected-insert messages across the languages used by SP returns:
// English ("already exists" / "duplicate" / "is already <state>"), Somali
// ("horey u jira", "hora ayuu u jiray", "horay ayuu …" — as produced by
// `teacher_state_sp` when it rejects a duplicate state), and Arabic
// ("موجود مسبقاً"). The "is already <word>" variant is what teacher_state_sp
// returns when the employee is already in the requested state (e.g. "This
// Employee is Already Active") — without it the dialog falls through to the
// green check, which is misleading because no row was inserted.
function isAlreadyExists(text) {
  return /already\s*exists?|duplicate|is\s+already\s+\w|hor[ae]y?\s*ayuu|hor[ae]y?\s*ayey|hor[ae]y?\s*u\s*jir(?:ay|a|ta)|hor[ae]yba|موجود\s*مسبق/i.test(text || '');
}

/** Success – marka insert/update la sameeyay. Haddii fariinta "already exist" leedahay → warning. */
export function swalSuccess(title, text) {
  const rawTitle = title ?? t('swal.titles.success');
  const rawText = text ?? t('swal.texts.saved');
  const combined = `${rawTitle || ''} ${rawText || ''}`;
  if (isAlreadyExists(combined)) {
    // Insert was rejected — switch the green check to a warning icon and use
    // the "Not succeeded" title (so-Laguma Guulaysan / en-Could not save /
    // ar-تعذّر الحفظ). The body uses the localized version of the SP message
    // (translateMessage maps "This Employee is Already Active" → the matching
    // employeeAlready* key) so the body never mixes English skeleton with a
    // single translated state word.
    return Swal.fire({
      icon: 'warning',
      title: t('swal.titles.notSucceeded'),
      text: translateMessage(rawText) || t('swal.texts.alreadyExists'),
      confirmButtonText: t('swal.buttons.ok'),
      customClass: swalClass,
    });
  }
  return Swal.fire({
    icon: 'success',
    title: translateMessage(rawTitle),
    text: translateMessage(rawText),
    confirmButtonText: t('swal.buttons.ok'),
    timer: 2000,
    timerProgressBar: true,
    customClass: swalClass,
  });
}

/** Error – marka khalad dhaco. Haddii title loo bixiyo (e.g. fariin database), kaliya title ayaa la tusi. */
export function swalError(title, text) {
  const textMsg = text == null ? '' : String(text);
  let titleMsg = title == null ? '' : String(title);
  if (titleMsg === 'null' || titleMsg.trim() === '') titleMsg = '';
  const fullMsg = titleMsg + (textMsg ? (titleMsg ? ' ' : '') + textMsg : '');
  const alreadyExists = isAlreadyExists(fullMsg);
  const translatedTitle = translateMessage(titleMsg);
  // For already-exists / rejected-insert we override the title with
  // "notSucceeded" (so-Laguma Guulaysan / en-Could not save / ar-تعذّر
  // الحفظ). The body runs through translateMessage so SP-specific phrases
  // like "This Employee is Already Active" become fully localized.
  const finalTitle = alreadyExists
    ? t('swal.titles.notSucceeded')
    : (titleMsg ? translatedTitle : t('swal.titles.error'));
  const finalText = alreadyExists
    ? (translateMessage(textMsg) || t('swal.texts.alreadyExists'))
    : translateMessage(textMsg);
  return Swal.fire({
    icon: alreadyExists ? 'warning' : 'error',
    title: finalTitle,
    text: finalText,
    confirmButtonText: t('swal.buttons.ok'),
    customClass: swalClass,
  });
}

/** Confirm – marka delete la rabo (e.g. "Ma hubtaa?") */
export function swalConfirm(options = {}) {
  const {
    title,
    text = '',
    confirmText,
    cancelText,
    confirmColor = '#dc2626',
  } = options;
  return Swal.fire({
    icon: 'warning',
    title: translateMessage(title ?? t('swal.titles.confirmDelete')),
    text: translateMessage(text),
    showCancelButton: true,
    confirmButtonColor: confirmColor,
    cancelButtonText: cancelText ?? t('swal.buttons.no'),
    confirmButtonText: confirmText ?? t('swal.buttons.yesDelete'),
    customClass: swalClass,
  }).then((result) => result.isConfirmed);
}

/**
 * Confirm + action – sida $.confirm: muuji confirm, haddii la ansaxo qabato action, ka dib muuji fariin (swal), optional redirect.
 * onConfirm waa async function – return { message } ama { message, redirect: '/' }.
 */
export async function swalConfirmAction(options = {}) {
  const {
    title,
    text = '',
    html,
    confirmText,
    cancelText,
    confirmColor = '#0f3d5e',
    onConfirm,
  } = options;
  // `html` overrides `text` when provided so callers can render rich content
  // (colored chips, multi-line layouts). Caller is responsible for escaping.
  const bodyOpt = html ? { html } : { text: translateMessage(text) };
  const confirmed = await Swal.fire({
    icon: 'question',
    title: translateMessage(title ?? t('swal.titles.confirm')),
    ...bodyOpt,
    showCancelButton: true,
    confirmButtonColor: confirmColor,
    cancelButtonText: cancelText ?? t('swal.buttons.no'),
    confirmButtonText: confirmText ?? t('swal.buttons.yes'),
    customClass: swalClass,
  }).then((r) => r.isConfirmed);
  if (!confirmed || !onConfirm) return;
  try {
    const result = await onConfirm();
    const msg = result?.message ?? result?.data ?? (typeof result === 'string' ? result : '');
    if (msg) {
      await Swal.fire({
        title: '',
        text: translateMessage(String(msg)),
        confirmButtonText: t('swal.buttons.ok'),
        customClass: swalClass,
      });
    }
    if (result?.redirect) window.location.href = result.redirect;
  } catch (err) {
    await Swal.fire({
      icon: 'error',
      title: t('swal.titles.error'),
      text: translateMessage(err?.message || ''),
      confirmButtonText: t('swal.buttons.ok'),
      customClass: swalClass,
    });
  }
}
