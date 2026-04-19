import Swal from 'sweetalert2';

/**
 * Component guud – Sweet Alert la wada isticmaali karo.
 * Design-ka app-ka (primary, rounded-xl) waa la adeegsadaa.
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

/** Success – marka insert/update la sameeyay */
export function swalSuccess(title = 'Wa la guulaystey', text = 'Xogtada waa la kaydiyay.') {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Ok',
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
  const isAlreadyExists = /already exists/i.test(fullMsg);
  const finalTitle = titleMsg
    ? titleMsg
    : isAlreadyExists
      ? 'Waa horey u jira'
      : 'Khalad ayaa dhacay';
  return Swal.fire({
    icon: isAlreadyExists ? 'warning' : 'error',
    title: finalTitle,
    text: textMsg,
    confirmButtonText: 'Ok',
    customClass: swalClass,
  });
}

/** Confirm – marka delete la rabo (e.g. "Ma hubtaa?") */
export function swalConfirm(options = {}) {
  const {
    title = 'Ma hubtaa inaad tirtid?',
    text = '',
    confirmText = 'Haa, tirtir',
    cancelText = 'Maya',
    confirmColor = '#dc2626',
  } = options;
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: confirmColor,
    cancelButtonText: cancelText,
    confirmButtonText: confirmText,
    customClass: swalClass,
  }).then((result) => result.isConfirmed);
}

/**
 * Confirm + action – sida $.confirm: muuji confirm, haddii la ansaxo qabato action, ka dib muuji fariin (swal), optional redirect.
 * onConfirm waa async function – return { message } ama { message, redirect: '/' }.
 */
export async function swalConfirmAction(options = {}) {
  const {
    title = 'Ma hubtaa?',
    text = '',
    confirmText = 'Haa',
    cancelText = 'Maya',
    confirmColor = '#0f3d5e',
    onConfirm,
  } = options;
  const confirmed = await Swal.fire({
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: confirmColor,
    cancelButtonText: cancelText,
    confirmButtonText: confirmText,
    customClass: swalClass,
  }).then((r) => r.isConfirmed);
  if (!confirmed || !onConfirm) return;
  try {
    const result = await onConfirm();
    const msg = result?.message ?? result?.data ?? (typeof result === 'string' ? result : '');
    if (msg) await Swal.fire({ title: '', text: String(msg), confirmButtonText: 'Ok', customClass: swalClass });
    if (result?.redirect) window.location.href = result.redirect;
  } catch (err) {
    await Swal.fire({
      icon: 'error',
      title: 'Khalad ayaa dhacay',
      text: err?.message || '',
      confirmButtonText: 'Ok',
      customClass: swalClass,
    });
  }
}
