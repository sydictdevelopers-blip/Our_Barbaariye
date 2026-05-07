import { useState, useEffect, useMemo } from 'react';
import { IdCard } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Select2 from '../components/ui/Select2';
import Button from '../components/ui/Button';
import {
  crud,
  makeOptionLoader,
  getSessionUBrIdNum,
  getSessionBrIdNum,
} from '../services/api';
import { swalSuccess, swalError } from '../utils/swal';

/**
 * AutoGenerateRoomModal — two-step "Assign Student Room Form".
 *   Step 1: choose Type (By Class / By Shift / By Level).
 *   Step 2: render the fields required by that type.
 *
 *   By Class: Room, Class, Academic, Exam, Shift, Sex
 *   By Shift: Room, Academic, Exam, Shift, Sex
 *   By Level: Room, Academic, Exam, Shift, Level, Sex
 *
 * Submit: crud({ fn: `auto_generate_by_${type}_sp`, ... }) — backend SPs are
 * expected to be created server-side (one per type). Frontend stays generic.
 */

const ModalShell = ({ isOpen, onClose, footer, size = 'md', children }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="" footer={footer} size={size}
         bodyClassName="space-y-4" showHeader={false}>
    {children}
  </Modal>
);

const FieldLabel = ({ children }) => (
  <label className="block text-[12px] font-semibold uppercase tracking-wide text-slate-600 mb-1">
    {children}
  </label>
);

const SEX_OPTIONS = [
  { value: 'Both',   label: 'Both' },
  { value: 'Male',   label: 'Male' },
  { value: 'Female', label: 'Female' },
];

const TYPE_OPTIONS = [
  { value: 'class', label: 'By Class' },
  { value: 'shift', label: 'By Shift' },
  { value: 'level', label: 'By Level' },
];

const FIELDS_BY_TYPE = {
  class: ['room', 'cls',  'ay', 'exam', 'shift', 'sex'],
  shift: ['room', 'ay',   'exam', 'shift', 'sex'],
  level: ['room', 'ay',   'exam', 'shift', 'level', 'sex'],
};

const FIELD_LABELS = {
  room:  'Select Room',
  cls:   'Select Class',
  ay:    'Select Academic Year',
  exam:  'Select Exam',
  shift: 'Select Shift',
  level: 'Select Level',
  sex:   'Select Sex',
};

const Header = () => (
  <div className="relative overflow-hidden -mx-4 -my-4 mb-5 rounded-t-2xl"
       style={{ background: 'linear-gradient(135deg, #0B3C5D 0%, #1a5f8e 50%, #0ea5e9 100%)' }}>
    <div className="absolute inset-0 opacity-20"
         style={{
           backgroundImage:
             'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0, transparent 35%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0, transparent 40%)',
         }} />
    <div className="relative flex items-center gap-3.5 px-6 py-5">
      <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-md">
        <IdCard className="w-5.5 h-5.5 text-white" />
      </div>
      <div>
        <div className="text-white text-[16px] font-bold tracking-wide">Assign Student Room Form</div>
        <div className="text-white/75 text-[10.5px] uppercase tracking-[0.22em] mt-1 font-semibold">Auto Generate</div>
      </div>
    </div>
  </div>
);

const ChevronSelect = ({ value, onChange, children }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className="w-full h-[42px] pl-3 pr-9 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f3d5e] focus:ring-2 focus:ring-[#0f3d5e]/20 bg-white appearance-none font-medium cursor-pointer"
    >
      {children}
    </select>
    <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
    </svg>
  </div>
);

export default function AutoGenerateRoomModal({ isOpen, onClose, onSuccess }) {
  const [type,  setType]  = useState('');
  const [step,  setStep]  = useState(1);
  const [room,  setRoom]  = useState({ id: '', label: '' });
  const [cls,   setCls]   = useState({ id: '', label: '' });
  const [ay,    setAy]    = useState({ id: '', label: '' });
  const [exam,  setExam]  = useState({ id: '', label: '' });
  const [shift, setShift] = useState({ id: '', label: '' });
  const [level, setLevel] = useState({ id: '', label: '' });
  const [sex,   setSex]   = useState('Both');
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType(''); setStep(1);
    setRoom({ id: '', label: '' }); setCls({ id: '', label: '' });
    setAy({ id: '', label: '' });   setExam({ id: '', label: '' });
    setShift({ id: '', label: '' }); setLevel({ id: '', label: '' });
    setSex('Both'); setBusy(false);
  }, [isOpen]);

  const roomLoader  = useMemo(() => makeOptionLoader('room_options'), []);
  const classLoader = useMemo(() => makeOptionLoader('class_simple_options'), []);
  const acadLoader  = useMemo(() => makeOptionLoader('academicYeartab', null, { sortByActiveState: true }), []);
  const examLoader  = useMemo(
    () => makeOptionLoader('exam_by_academic_options', () => ({ ...(ay.id && { academicYearId: ay.id }) })),
    [ay.id]
  );
  const shiftLoader = useMemo(() => makeOptionLoader('shift_options'), []);
  const levelLoader = useMemo(() => makeOptionLoader('levels'), []);

  // Type select onChange: automatically advance to step 2 — no Continue click
  // needed. Empty selection (the placeholder option) keeps the user on step 1.
  const handleTypeChange = (val) => {
    setType(val);
    if (val) setStep(2);
  };

  const handleGenerate = async () => {
    const required = FIELDS_BY_TYPE[type] || [];
    const get = { room, cls, ay, exam, shift, level };
    for (const f of required) {
      if (f === 'sex') {
        if (!sex) return swalError(`Fadlan dooro ${FIELD_LABELS.sex}`, '');
      } else if (!get[f]?.id) {
        return swalError(`Fadlan dooro ${FIELD_LABELS[f]}`, '');
      }
    }
    setBusy(true);
    try {
      const u_br_id = getSessionUBrIdNum();
      const br_id   = getSessionBrIdNum();
      const result = await crud({
        operation: 'insert',
        fn: `auto_generate_by_${type}_sp`,
        params: {
          r_id_sp:    Number(room.id) || 0,
          a_y_id_sp:  Number(ay.id) || 0,
          ex_id_sp:   Number(exam.id) || 0,
          sh_id_sp:   Number(shift.id) || 0,
          ...(type === 'class' && { cl_id_sp:  Number(cls.id) || 0 }),
          ...(type === 'level' && { lev_id_sp: Number(level.id) || 0 }),
          sex_sp:     sex,
          br_id_sp:   br_id,
          u_br_id_sp: u_br_id,
        },
      });
      await swalSuccess('Waa la guulaystey', result?.message || '');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      swalError(err?.message || 'Khalad ayaa dhacay', '');
    } finally {
      setBusy(false);
    }
  };

  const renderField = (key) => {
    const placeholder = FIELD_LABELS[key];
    if (key === 'room')  return <Select2 isClearable={false} value={room.id}  selectedLabel={room.label}  onChange={(e) => setRoom({ id: e.target.value, label: e.target.label || '' })}  loadOptions={roomLoader}  placeholder={placeholder} />;
    if (key === 'cls')   return <Select2 isClearable={false} value={cls.id}   selectedLabel={cls.label}   onChange={(e) => setCls({ id: e.target.value, label: e.target.label || '' })}   loadOptions={classLoader} placeholder={placeholder} />;
    if (key === 'ay')    return <Select2 isClearable={false} value={ay.id}    selectedLabel={ay.label}    onChange={(e) => setAy({ id: e.target.value, label: e.target.label || '' })}    loadOptions={acadLoader}  placeholder={placeholder} />;
    if (key === 'exam')  return <Select2 key={`ex-${ay.id || 'none'}`} isClearable={false} value={exam.id} selectedLabel={exam.label} onChange={(e) => setExam({ id: e.target.value, label: e.target.label || '' })} loadOptions={examLoader} placeholder={placeholder} isDisabled={!ay.id} />;
    if (key === 'shift') return <Select2 isClearable={false} value={shift.id} selectedLabel={shift.label} onChange={(e) => setShift({ id: e.target.value, label: e.target.label || '' })} loadOptions={shiftLoader} placeholder={placeholder} />;
    if (key === 'level') return <Select2 isClearable={false} value={level.id} selectedLabel={level.label} onChange={(e) => setLevel({ id: e.target.value, label: e.target.label || '' })} loadOptions={levelLoader} placeholder={placeholder} />;
    if (key === 'sex')   return (
      <ChevronSelect value={sex} onChange={(e) => setSex(e.target.value)}>
        {SEX_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
      </ChevronSelect>
    );
    return null;
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size={step === 1 ? 'md' : 'xl'}
      footer={
        <div className="flex justify-end gap-2 w-full">
          {step === 1 ? (
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
              <Button type="button" onClick={handleGenerate} disabled={busy}>
                {busy ? '...' : 'Generate'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <Header />

      {step === 1 && (
        <div className="px-2 pb-2">
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Pick the assignment <strong className="text-slate-700 dark:text-slate-200">type</strong>. The form will
            auto-load the fields it needs for that type.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleTypeChange(o.value)}
                className={`px-3 py-3 rounded-xl border text-[12px] font-semibold uppercase tracking-wide transition ${
                  type === o.value
                    ? 'bg-[#0B3C5D] text-white border-[#0B3C5D] shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-[#0B3C5D]/40 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(FIELDS_BY_TYPE[type] || []).map((key) => (
            <div key={key}>
              <FieldLabel>{FIELD_LABELS[key]}</FieldLabel>
              {renderField(key)}
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
