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
  // already-exists variants
  { re: /already\s*exists?|duplicate|horey u jira|hore u jira/i, key: 'swal.titles.alreadyExists' },

  // English sentences ka yimaada SP-yada DB-ga (delete)
  { re: /this (information|record|data) (has been|is) (correctly )?deleted( correctly)?\.?/i, key: 'swal.texts.deleted' },
  { re: /(record|data|row) deleted( successfully| correctly)?\.?/i, key: 'swal.texts.deleted' },
  // (update)
  { re: /this (information|record|data) (has been|is) (correctly )?updated( correctly)?\.?/i, key: 'swal.texts.updated' },
  { re: /(record|data|row) updated( successfully| correctly)?\.?/i, key: 'swal.texts.updated' },
  // (insert / register / save)
  { re: /this (information|record|data) (has been|is) (correctly )?(registered|inserted|saved|added)( correctly)?\.?/i, key: 'swal.texts.saved' },
  { re: /(record|data|row) (registered|inserted|saved)( successfully| correctly)?\.?/i, key: 'swal.texts.saved' },

  // hardcoded Somali-ga oo callers isticmaalaan
  { re: /^\s*(wa la guulaystey|guul)\s*$/i, key: 'swal.titles.success' },
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
];

/** U rog fariinta la soo diray i18n haddii ay la mid tahay pattern aan aqoono. */
function translateMessage(msg) {
  if (msg == null) return '';
  const str = String(msg);
  if (!str.trim()) return '';
  for (const entry of MESSAGE_MAP) {
    const m = str.match(entry.re);
    if (m) {
      if (entry.countGroup) {
        return t(entry.key, { count: Number(m[entry.countGroup]) || 0 });
      }
      return t(entry.key);
    }
  }
  return str;
}

function isAlreadyExists(text) {
  return /already\s*exists?|horey u jira|hore u jira|duplicate/i.test(text || '');
}

/** Success – marka insert/update la sameeyay. Haddii fariinta "already exist" leedahay → warning. */
export function swalSuccess(title, text) {
  const rawTitle = title ?? t('swal.titles.success');
  const rawText = text ?? t('swal.texts.saved');
  const combined = `${rawTitle || ''} ${rawText || ''}`;
  if (isAlreadyExists(combined)) {
    return Swal.fire({
      icon: 'warning',
      title: t('swal.titles.alreadyExists'),
      text: translateMessage(rawText) || translateMessage(rawTitle),
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
  const finalTitle = titleMsg
    ? translatedTitle
    : alreadyExists
      ? t('swal.titles.alreadyExists')
      : t('swal.titles.error');
  return Swal.fire({
    icon: alreadyExists ? 'warning' : 'error',
    title: finalTitle,
    text: translateMessage(textMsg),
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
    confirmText,
    cancelText,
    confirmColor = '#0f3d5e',
    onConfirm,
  } = options;
  const confirmed = await Swal.fire({
    icon: 'question',
    title: translateMessage(title ?? t('swal.titles.confirm')),
    text: translateMessage(text),
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
