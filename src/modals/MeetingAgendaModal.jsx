import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { crud, getSessionUBrIdNum } from '../services/api';
import { swalError } from '../utils/swal';

const todayIso = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const EMPTY_FORM = {
  m_ag_id: 0,
  agenda: '',
  participance: '',
  comments: '',
  decisions: '',
  meet_date: todayIso(),
};

const INPUT_CLS =
  'w-full px-4 py-2 rounded-xl border text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e] focus:border-transparent';
const LABEL_CLS = 'block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1';

const SWAL_CLS = {
  container: 'swal-on-top',
  popup: 'swal-app-popup',
  title: 'swal-app-title',
  htmlContainer: 'swal-app-html',
  confirmButton: 'swal-app-confirm',
  actions: 'swal-app-actions',
};

/** Show the raw DB message (no i18n translation). */
function alertDbMessage(message) {
  return Swal.fire({
    icon: 'success',
    title: String(message ?? '').trim() || 'OK',
    confirmButtonText: 'OK',
    timer: 2200,
    timerProgressBar: true,
    customClass: SWAL_CLS,
  });
}

function FieldWrap({ label, error, htmlFor, children }) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={htmlFor} className={LABEL_CLS}>
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/** Pick the row id whether it's named id or m_ag_id. */
function rowId(row) {
  if (!row) return 0;
  return Number(row.id ?? row.m_ag_id ?? 0) || 0;
}

export default function MeetingAgendaModal({ isOpen, onClose, editRow, onSuccess }) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const editId = rowId(editRow);
  const isEdit = editId > 0;

  useEffect(() => {
    if (!isOpen) return;
    if (editId > 0) {
      setForm({
        m_ag_id: editId,
        agenda: editRow.agenda ?? '',
        participance: editRow.participance ?? '',
        comments: editRow.comments ?? '',
        decisions: editRow.decisions ?? '',
        meet_date: editRow.meet_date
          ? String(editRow.meet_date).slice(0, 10)
          : todayIso(),
      });
    } else {
      setForm({ ...EMPTY_FORM, meet_date: todayIso() });
    }
    setErrors({});
  }, [isOpen, editId, editRow]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!String(form.agenda || '').trim()) {
      e.agenda = t('meetingAgenda.errAgenda', 'Agenda is required');
    }
    if (!String(form.participance || '').trim()) {
      e.participance = t('meetingAgenda.errParticipance', 'Participance is required');
    }
    if (!form.meet_date) {
      e.meet_date = t('meetingAgenda.errDate', 'Meeting date is required');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (operation) => {
    if (!validate()) return;
    const u_br_id = getSessionUBrIdNum();
    if (!u_br_id) {
      swalError(t('meetingAgenda.errNoUser', 'No active user session'));
      return;
    }
    const language = (i18n.language || 'so').startsWith('en') ? 2 : 1;
    setLoading(true);
    try {
      const params = {
        m_ag_id_sp: operation === 'insert' ? 0 : Number(form.m_ag_id) || 0,
        agenda_sp: String(form.agenda ?? '').trim(),
        participance_sp: String(form.participance ?? '').trim(),
        comments_sp: String(form.comments ?? '').trim(),
        decisions_sp: String(form.decisions ?? '').trim(),
        meet_date_sp: form.meet_date || todayIso(),
        u_br_id_sp: u_br_id,
        reg_date_sp: new Date().toISOString(),
        language_sp: language,
      };
      const res = await crud({
        operation,
        fn: 'meeting_agenda_sp',
        params,
      });
      onClose();
      onSuccess?.();
      await alertDbMessage(res?.message);
    } catch (err) {
      swalError(err?.message || t('meetingAgenda.errSave', 'Operation failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header={
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100 tracking-tight truncate">
          {isEdit
            ? t('meetingAgenda.editTitle', 'Edit Meeting Agenda')
            : t('meetingAgenda.addTitle', 'Add Meeting Agenda')}
        </h2>
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-2 w-full flex-wrap">
          {!isEdit && (
            <Button
              type="button"
              onClick={() => submit('insert')}
              disabled={loading}
            >
              {loading ? '...' : t('common.save', 'Save')}
            </Button>
          )}
          {isEdit && (
            <Button
              type="button"
              onClick={() => submit('update')}
              disabled={loading}
            >
              {loading ? '...' : t('common.update', 'Update')}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('common.close', 'Close')}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(isEdit ? 'update' : 'insert');
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <FieldWrap
          label={t('meetingAgenda.agenda', 'Agenda')}
          error={errors.agenda}
          htmlFor="ma-agenda"
        >
          <Input
            id="ma-agenda"
            name="agenda"
            value={form.agenda}
            onChange={handleChange}
            placeholder={t('meetingAgenda.phAgenda', 'Enter agenda title')}
            error={errors.agenda}
          />
        </FieldWrap>

        <FieldWrap
          label={t('meetingAgenda.meetDate', 'Meeting Date')}
          error={errors.meet_date}
          htmlFor="ma-meet-date"
        >
          <input
            id="ma-meet-date"
            type="date"
            name="meet_date"
            value={form.meet_date}
            onChange={handleChange}
            className={`${INPUT_CLS} ${errors.meet_date ? 'border-red-500' : ''}`}
          />
        </FieldWrap>

        <FieldWrap
          label={t('meetingAgenda.participance', 'Participance')}
          error={errors.participance}
          htmlFor="ma-participance"
        >
          <textarea
            id="ma-participance"
            name="participance"
            rows={3}
            value={form.participance}
            onChange={handleChange}
            placeholder={t('meetingAgenda.phParticipance', 'List participants')}
            className={`${INPUT_CLS} ${errors.participance ? 'border-red-500' : ''}`}
          />
        </FieldWrap>

        <FieldWrap
          label={t('meetingAgenda.comments', 'Comments')}
          error={errors.comments}
          htmlFor="ma-comments"
        >
          <textarea
            id="ma-comments"
            name="comments"
            rows={3}
            value={form.comments}
            onChange={handleChange}
            placeholder={t('meetingAgenda.phComments', 'Discussion / notes')}
            className={INPUT_CLS}
          />
        </FieldWrap>

        <FieldWrap
          label={t('meetingAgenda.decisions', 'Decisions')}
          error={errors.decisions}
          htmlFor="ma-decisions"
        >
          <textarea
            id="ma-decisions"
            name="decisions"
            rows={3}
            value={form.decisions}
            onChange={handleChange}
            placeholder={t('meetingAgenda.phDecisions', 'Final decisions taken')}
            className={`${INPUT_CLS} md:col-span-2`}
          />
        </FieldWrap>
      </form>
    </Modal>
  );
}
