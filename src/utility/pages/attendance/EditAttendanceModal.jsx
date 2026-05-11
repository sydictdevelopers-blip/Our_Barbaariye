import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Contact, Loader2 } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import DateInput from '../../../components/ui/DateInput';
import { crud, makeOptionLoader } from '../../../services/api';
import { swalError, swalSuccess } from '../../../utils/swal';

// Frontend single-letter code → state_attendance.st_att_id (must mirror the
// mapping in StudentAttendanceTab.jsx). Order assumed P=1…N=6 to match the
// likely seed order of state_attendance.
const STATE_OPTIONS = [
  { id: 1, code: 'P', label: 'Present' },
  { id: 2, code: 'A', label: 'Absent' },
  { id: 3, code: 'S', label: 'Sick' },
  { id: 4, code: 'V', label: 'Vocation' },
  { id: 5, code: 'L', label: 'Late' },
  { id: 6, code: 'N', label: 'None' },
];

const COMMENT_MAX = 250;

/**
 * EditAttendanceModal — UPDATE one attendance row via student_attendance_sp.
 *
 * The SHOW SP returns only the state text label ("Present") and no period
 * info. The parent (StudentAttendanceTab) enriches each row with `pr_id` +
 * `period` label from the selected fan-out period before passing it here, so
 * the Period dropdown can pre-fill on open.
 *   - state pre-fills by matching the first letter of `row.state` to STATE_OPTIONS.code
 *   - period pre-fills from row.pr_id / row.period (label).
 */
export default function EditAttendanceModal({ open, row, onClose, onSaved }) {
  const { t } = useTranslation();
  const periodLoader = useMemo(() => makeOptionLoader('period_options'), []);

  const initialStateId = (() => {
    const ch = String(row?.state || '').charAt(0).toUpperCase();
    const found = STATE_OPTIONS.find((s) => s.code === ch);
    return found ? found.id : STATE_OPTIONS[0].id;
  })();

  const [period, setPeriod] = useState({
    id: row?.pr_id != null && row.pr_id !== '' ? String(row.pr_id) : '',
    label: row?.period || '',
  });
  const [stateId, setStateId] = useState(initialStateId);
  const [comment, setComment] = useState(row?.reason || '');
  const [date, setDate] = useState(row?.reg_date || new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!period.id) {
      swalError(t('common.error', 'Khalad'), t('studentAttendence.selectPeriod', 'Fadlan dooro Goor (Period)'));
      return;
    }
    setSaving(true);
    try {
      const res = await crud({
        operation: 'update',
        fn: 'student_attendance_sp',
        params: {
          p_id: row.id,
          p_student: 0,            // unused on update
          p_period: Number(period.id),
          p_state: Number(stateId) || 0,
          p_reason: comment || '',
          p_reg_date: date || new Date().toISOString().slice(0, 10),
          u_br_id_sp: 0,           // backend overrides from JWT
        },
      });
      swalSuccess(res?.message || t('common.done', 'La sameeyay'), '');
      onSaved?.();
      onClose?.();
    } catch (e) {
      swalError(t('common.error', 'Khalad'), e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5';
  const inputCls = 'w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/20 focus:border-[#0f3d5e]';

  const header = (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-500 text-white">
        <Contact className="w-5 h-5" />
      </div>
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100">
        {t('studentAttendence.editTitle', 'Student Attendance')}
      </h2>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      header={header}
      size="md"
      footer={(
        <>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={saving}
            leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          >
            {saving ? t('common.saving', 'La keydinayaa') : t('common.update', 'Update')}
          </Button>
          <Button variant="primary" onClick={onClose} disabled={saving}>
            {t('common.close', 'Close')}
          </Button>
        </>
      )}
    >
      <div className="space-y-3">
        {/* Student Name — read-only */}
        <div>
          <label className={labelCls}>{t('studentAttendence.cols.student', 'Student Name')}</label>
          <input
            type="text"
            value={row?.student || row?.p_name || ''}
            disabled
            className={`${inputCls} bg-slate-100 dark:bg-slate-700/40 cursor-not-allowed`}
          />
        </div>

        {/* Period */}
        <div>
          <label className={labelCls}>{t('select.period', 'Period')}</label>
          <Select2
            name="period"
            value={period.id}
            selectedLabel={period.label}
            onChange={(e) => setPeriod({ id: e.target.value, label: e.target.label || '' })}
            loadOptions={periodLoader}
            placeholder={t('select.period', 'Select Period')}
            isClearable={false}
          />
        </div>

        {/* State — native dropdown */}
        <div>
          <label className={labelCls}>{t('studentAttendence.cols.state', 'State')}</label>
          <select
            value={stateId}
            onChange={(e) => setStateId(Number(e.target.value))}
            className={inputCls}
          >
            {STATE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(`studentAttendence.state.${s.code}`, s.label)}
              </option>
            ))}
          </select>
        </div>

        {/* Comment / Reason — textarea + char counter */}
        <div>
          <label className={labelCls}>{t('studentAttendence.cols.comment', 'Comment')}:</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
            rows={4}
            className={`${inputCls} h-auto py-2 resize-y`}
          />
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {comment.length}/{COMMENT_MAX}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className={labelCls}>{t('studentAttendence.fields.date', 'Date')}</label>
          <DateInput
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
    </Modal>
  );
}
