import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Layers, Grid3x3, RefreshCw, IdCard } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Select2 from '../components/ui/Select2';
import Button from '../components/ui/Button';
import {
  crud,
  makeOptionLoader,
  fetchSelectOptions,
  getSessionUBrIdNum,
  getSessionBrIdNum,
} from '../services/api';
import { swalSuccess, swalError } from '../utils/swal';

const ModalShell = ({ isOpen, onClose, title, footer, size = 'md', children }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    footer={footer}
    size={size}
    bodyClassName="space-y-4"
  >
    {children}
  </Modal>
);

const FieldLabel = ({ children }) => (
  <label className="block text-[12px] font-semibold uppercase tracking-wide text-slate-600 mb-1">
    {children}
  </label>
);

const GENDER_OPTIONS = [
  { value: 'Both',   label: 'Both' },
  { value: 'Male',   label: 'Male' },
  { value: 'Female', label: 'Female' },
];

const emptyRow = () => ({ cl_id: '', cl_label: '', no_of_std: '', gender: 'Both' });

/* ─────────────────── Room By Class ─────────────────── */
// Modal: dooro Room + Academic + Exam, ka dibna table-ka:
// Class | No of Seat (auto from room) | No. STD (input) | Gender (select).
// Save: per row → call room_by_class_sp(room, academic, exam, class, no_std, gender, u_br).
export function RoomByClassModal({ isOpen, onClose, onSuccess, context }) {
  const { t } = useTranslation();
  const [room, setRoom] = useState({ id: '', label: '', seats: 0 });
  const [ay, setAy] = useState({ id: '', label: '' });
  const [exam, setExam] = useState({ id: '', label: '' });
  const [rows, setRows] = useState([emptyRow()]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setRoom({ id: '', label: '', seats: 0 });
    setAy({ id: context?.academicYearId || '', label: context?.academicYearLabel || '' });
    setExam({ id: '', label: '' });
    setRows([emptyRow()]);
  }, [isOpen, context]);

  const roomLoader = useMemo(() => makeOptionLoader('room_options'), []);
  const acadLoader = useMemo(() => makeOptionLoader('academicYeartab', null, { sortByActiveState: true }), []);
  const examLoader = useMemo(
    () => makeOptionLoader('exam_by_academic_options', () => ({
      ...(ay.id && { academicYearId: ay.id }),
    })),
    [ay.id]
  );
  const classLoader = useMemo(() => makeOptionLoader('class_simple_options'), []);

  // Marka room la doorto, ka soo qaad seat capacity → cache laga dhigayo
  // si rows-yada cusub ee la abuuro ay isticmaalaan tirada saxda ah.
  const handleRoomChange = async (id, label) => {
    setRoom({ id, label, seats: 0 });
    if (!id) return;
    try {
      const res = await fetchSelectOptions('room_options', 1000, '', {});
      const match = (res?.data || []).find((r) => String(r.r_id) === String(id));
      if (match) setRoom({ id, label, seats: Number(match.no_of_students) || 0 });
    } catch {
      // ignore — seats stays 0
    }
  };

  const setRowField = (i, patch) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (i) =>
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const totalAssigned = rows.reduce((s, r) => s + (Number(r.no_of_std) || 0), 0);
  const seatsLeft = Math.max(0, room.seats - totalAssigned);

  const handleSave = async () => {
    if (!room.id) return swalError('Fadlan dooro Room', '');
    if (!ay.id) return swalError('Fadlan dooro Academic Year', '');
    if (!exam.id) return swalError('Fadlan dooro Exam', '');
    const valid = rows.filter((r) => r.cl_id && Number(r.no_of_std) > 0 && r.gender);
    if (!valid.length) return swalError('Wax la kaydiyo lama helin', 'Ugu yaraan hal row buuxiyo.');
    if (totalAssigned > room.seats && room.seats > 0) {
      return swalError(
        'Tirada arday way badan tahay seat-yada qolka',
        `Qolku waxa uu leeyahay ${room.seats} seat — la doortay ${totalAssigned}. Yaraysiis ama dooro qol kale.`
      );
    }

    setBusy(true);
    const u_br_id = getSessionUBrIdNum();
    const br_id   = getSessionBrIdNum();
    let ok = 0;
    let firstErr = '';
    try {
      for (const r of valid) {
        try {
          await crud({
            operation: 'insert',
            fn: 'room_by_class_sp',
            params: {
              r_id_sp:      Number(room.id) || 0,
              a_y_id_sp:    Number(ay.id) || 0,
              ex_id_sp:     Number(exam.id) || 0,
              cl_id_sp:     Number(r.cl_id) || 0,
              no_of_std_sp: Number(r.no_of_std) || 0,
              gender_sp:    r.gender || 'Both',
              br_id_sp:     br_id,
              u_br_id_sp:   u_br_id,
            },
          });
          ok += 1;
        } catch (e) {
          if (!firstErr) firstErr = e?.message || String(e);
        }
      }
      if (ok > 0) {
        await swalSuccess('Waa la guulaystey', `${ok} / ${valid.length} ayaa la kaydiyay`);
        onSuccess?.({ academicYearId: ay.id, academicYearLabel: ay.label, ex_id: exam.id });
        onClose?.();
      } else {
        swalError(firstErr || 'Wax aan la kaydiyo lama helin', '');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Room By Class"
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full gap-3 flex-wrap">
          {room.id ? (
            <div className="flex items-center gap-1.5 text-[11.5px]">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                {room.seats} total
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                {seatsLeft} remaining
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-semibold">
                {totalAssigned} assigned
              </span>
            </div>
          ) : <div />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
            <Button type="button" onClick={handleSave} disabled={busy}>
              {busy ? '...' : 'Assign Student Room'}
            </Button>
          </div>
        </div>
      }
    >
      {/* Hero header card with selectors */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="px-5 py-3 flex items-center gap-3"
             style={{ background: 'linear-gradient(135deg, #0B3C5D 0%, #1a5f8e 100%)' }}>
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-white text-[14px] font-bold tracking-wide">Room By Class</div>
            <div className="text-white/70 text-[10.5px] uppercase tracking-[0.2em] mt-0.5">Assign students to a room per class</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50/60">
          <div>
            <FieldLabel>Select Room</FieldLabel>
            <Select2
              value={room.id}
              selectedLabel={room.label}
              onChange={(e) => handleRoomChange(e.target.value, e.target.label || '')}
              loadOptions={roomLoader}
              placeholder="Select Room"
            />
          </div>
          <div>
            <FieldLabel>Select Academic Year</FieldLabel>
            <Select2
              value={ay.id}
              selectedLabel={ay.label}
              onChange={(e) => setAy({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={acadLoader}
              placeholder="Select Academic Year"
            />
          </div>
          <div key={`ex-${ay.id || 'none'}`}>
            <FieldLabel>Select Exam</FieldLabel>
            <Select2
              value={exam.id}
              selectedLabel={exam.label}
              onChange={(e) => setExam({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={examLoader}
              placeholder="Select Exam"
              isDisabled={!ay.id}
            />
          </div>
        </div>
      </div>

      {/* Class assignment table */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-[13px] border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '38%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr className="text-white" style={{ background: 'linear-gradient(180deg, #0B3C5D, #082c45)' }}>
              <th className="px-4 py-3 text-start font-semibold uppercase text-[11px] tracking-wider">Class</th>
              <th className="px-3 py-3 text-center font-semibold uppercase text-[11px] tracking-wider">No of Seat</th>
              <th className="px-3 py-3 text-center font-semibold uppercase text-[11px] tracking-wider">No. STD</th>
              <th className="px-3 py-3 text-start font-semibold uppercase text-[11px] tracking-wider">Gender</th>
              <th className="px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition"
                  title="Add row"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/40 transition-colors">
                <td className="px-3 py-2 align-middle">
                  <Select2
                    name={`cl_${i}`}
                    value={row.cl_id}
                    selectedLabel={row.cl_label}
                    onChange={(e) => setRowField(i, { cl_id: e.target.value, cl_label: e.target.label || '' })}
                    loadOptions={classLoader}
                    placeholder="Select Class"
                    isClearable={false}
                  />
                </td>
                <td className="px-2 py-2 align-middle text-center">
                  <span className="inline-flex items-center justify-center min-w-[3rem] h-9 px-3 rounded-full text-white font-bold tabular-nums text-[12.5px] shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #0B3C5D, #1a5f8e)' }}>
                    {room.seats || '—'}
                  </span>
                </td>
                <td className="px-2 py-2 align-middle">
                  <input
                    type="number"
                    min="0"
                    value={row.no_of_std}
                    onChange={(e) => setRowField(i, { no_of_std: e.target.value })}
                    className="w-full h-[42px] px-3 text-center rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f3d5e] focus:ring-2 focus:ring-[#0f3d5e]/20 tabular-nums font-semibold"
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-2 align-middle">
                  <div className="relative">
                    <select
                      value={row.gender}
                      onChange={(e) => setRowField(i, { gender: e.target.value })}
                      className="w-full h-[42px] pl-3 pr-9 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f3d5e] focus:ring-2 focus:ring-[#0f3d5e]/20 bg-white appearance-none font-medium cursor-pointer"
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                    <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </td>
                <td className="px-2 py-2 align-middle text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Remove row"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}

/* ─────────────────── Class By Room ─────────────────── */
// Mirror of Room By Class with the axes swapped: pick a Class up top, then a
// table of (Room, No of Seats — auto, No. STD, Gender) rows. Each row's
// "No of Seats" reflects the room chosen in THAT row (not a global selection).
const emptyCbrRow = () => ({ r_id: '', r_label: '', seats: 0, no_of_std: '', gender: 'Both' });

export function ClassByRoomModal({ isOpen, onClose, onSuccess, context }) {
  const { t } = useTranslation();
  const [cls, setCls] = useState({ id: '', label: '' });
  const [ay, setAy] = useState({ id: '', label: '' });
  const [exam, setExam] = useState({ id: '', label: '' });
  const [rows, setRows] = useState([emptyCbrRow()]);
  const [busy, setBusy] = useState(false);
  // Cache the rooms list once so per-row selections can resolve seat counts
  // without an extra fetch each time the user picks a room.
  const roomsCache = useRef([]);

  useEffect(() => {
    if (!isOpen) return;
    setCls({ id: context?.cl_id || '', label: context?.cl_label || '' });
    setAy({ id: context?.academicYearId || '', label: context?.academicYearLabel || '' });
    setExam({ id: '', label: '' });
    setRows([emptyCbrRow()]);
    // pre-warm rooms cache
    fetchSelectOptions('room_options', 1000, '', {})
      .then((res) => { roomsCache.current = res?.data || []; })
      .catch(() => {});
  }, [isOpen, context]);

  const classLoader = useMemo(() => makeOptionLoader('class_simple_options'), []);
  const acadLoader = useMemo(() => makeOptionLoader('academicYeartab', null, { sortByActiveState: true }), []);
  const examLoader = useMemo(
    () => makeOptionLoader('exam_by_academic_options', () => ({
      ...(ay.id && { academicYearId: ay.id }),
    })),
    [ay.id]
  );
  const roomLoader = useMemo(() => makeOptionLoader('room_options'), []);

  const setRowField = (i, patch) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, emptyCbrRow()]);
  const removeRow = (i) =>
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  // Per-row room change → look up seats from the cached rooms list (warmed
  // on open). If cache miss, fetch on demand.
  const handleRowRoomChange = async (i, value, label) => {
    setRowField(i, { r_id: value, r_label: label, seats: 0 });
    if (!value) return;
    let match = roomsCache.current.find((r) => String(r.r_id) === String(value));
    if (!match) {
      try {
        const res = await fetchSelectOptions('room_options', 1000, '', {});
        roomsCache.current = res?.data || [];
        match = roomsCache.current.find((r) => String(r.r_id) === String(value));
      } catch { /* ignore */ }
    }
    if (match) setRowField(i, { seats: Number(match.no_of_students) || 0 });
  };

  const totalAssigned = rows.reduce((s, r) => s + (Number(r.no_of_std) || 0), 0);

  const handleSave = async () => {
    if (!cls.id) return swalError('Fadlan dooro Class', '');
    if (!ay.id) return swalError('Fadlan dooro Academic Year', '');
    if (!exam.id) return swalError('Fadlan dooro Exam', '');
    const valid = rows.filter((r) => r.r_id && Number(r.no_of_std) > 0 && r.gender);
    if (!valid.length) return swalError('Wax la kaydiyo lama helin', 'Ugu yaraan hal row buuxiyo.');
    // Per-row seat check — can't assign more students than the room has seats.
    const overbooked = valid.find((r) => r.seats > 0 && Number(r.no_of_std) > r.seats);
    if (overbooked) {
      return swalError(
        'Tirada arday way badan tahay seats-ka qolka',
        `Qolka "${overbooked.r_label}" wuxuu leeyahay ${overbooked.seats} seat — la doortay ${overbooked.no_of_std}.`
      );
    }

    setBusy(true);
    const u_br_id = getSessionUBrIdNum();
    const br_id   = getSessionBrIdNum();
    let ok = 0;
    let firstErr = '';
    try {
      for (const r of valid) {
        try {
          await crud({
            operation: 'insert',
            fn: 'class_by_room_sp',
            params: {
              cl_id_sp:     Number(cls.id) || 0,
              a_y_id_sp:    Number(ay.id) || 0,
              ex_id_sp:     Number(exam.id) || 0,
              r_id_sp:      Number(r.r_id) || 0,
              no_of_std_sp: Number(r.no_of_std) || 0,
              gender_sp:    r.gender || 'Both',
              br_id_sp:     br_id,
              u_br_id_sp:   u_br_id,
            },
          });
          ok += 1;
        } catch (e) {
          if (!firstErr) firstErr = e?.message || String(e);
        }
      }
      if (ok > 0) {
        await swalSuccess('Waa la guulaystey', `${ok} / ${valid.length} ayaa la kaydiyay`);
        onSuccess?.({ academicYearId: ay.id, academicYearLabel: ay.label, ex_id: exam.id, cl_id: cls.id });
        onClose?.();
      } else {
        swalError(firstErr || 'Wax aan la kaydiyo lama helin', '');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Class By Room"
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full gap-3 flex-wrap">
          {cls.id ? (
            <div className="flex items-center gap-1.5 text-[11.5px]">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold">
                {rows.filter((r) => r.r_id).length} room{rows.filter((r) => r.r_id).length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-semibold">
                {totalAssigned} assigned
              </span>
            </div>
          ) : <div />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
            <Button type="button" onClick={handleSave} disabled={busy}>
              {busy ? '...' : 'Assign Student Room'}
            </Button>
          </div>
        </div>
      }
    >
      {/* Hero header card with selectors */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="px-5 py-3 flex items-center gap-3"
             style={{ background: 'linear-gradient(135deg, #0B3C5D 0%, #1a5f8e 100%)' }}>
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Grid3x3 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-white text-[14px] font-bold tracking-wide">Class By Room</div>
            <div className="text-white/70 text-[10.5px] uppercase tracking-[0.2em] mt-0.5">Spread one class across multiple rooms</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50/60">
          <div>
            <FieldLabel>Select Class</FieldLabel>
            <Select2
              value={cls.id}
              selectedLabel={cls.label}
              onChange={(e) => setCls({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={classLoader}
              placeholder="Select Class"
            />
          </div>
          <div>
            <FieldLabel>Select Academic Year</FieldLabel>
            <Select2
              value={ay.id}
              selectedLabel={ay.label}
              onChange={(e) => setAy({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={acadLoader}
              placeholder="Select Academic Year"
            />
          </div>
          <div key={`ex-${ay.id || 'none'}`}>
            <FieldLabel>Select Exam</FieldLabel>
            <Select2
              value={exam.id}
              selectedLabel={exam.label}
              onChange={(e) => setExam({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={examLoader}
              placeholder="Select Exam"
              isDisabled={!ay.id}
            />
          </div>
        </div>
      </div>

      {/* Room assignment table */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-[13px] border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '38%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr className="text-white" style={{ background: 'linear-gradient(180deg, #0B3C5D, #082c45)' }}>
              <th className="px-4 py-3 text-start font-semibold uppercase text-[11px] tracking-wider">Room</th>
              <th className="px-3 py-3 text-center font-semibold uppercase text-[11px] tracking-wider">No. Seats</th>
              <th className="px-3 py-3 text-center font-semibold uppercase text-[11px] tracking-wider">No. STD</th>
              <th className="px-3 py-3 text-start font-semibold uppercase text-[11px] tracking-wider">Gender</th>
              <th className="px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition"
                  title="Add row"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/40 transition-colors">
                <td className="px-3 py-2 align-middle">
                  <Select2
                    name={`room_${i}`}
                    value={row.r_id}
                    selectedLabel={row.r_label}
                    onChange={(e) => handleRowRoomChange(i, e.target.value, e.target.label || '')}
                    loadOptions={roomLoader}
                    placeholder="Select Room"
                    isClearable={false}
                  />
                </td>
                <td className="px-2 py-2 align-middle text-center">
                  <span className="inline-flex items-center justify-center min-w-[3rem] h-9 px-3 rounded-full text-white font-bold tabular-nums text-[12.5px] shadow-sm"
                        style={{ background: row.r_id ? 'linear-gradient(135deg, #0B3C5D, #1a5f8e)' : '#cbd5e1' }}>
                    {row.r_id ? (row.seats || '—') : '—'}
                  </span>
                </td>
                <td className="px-2 py-2 align-middle">
                  <input
                    type="number"
                    min="0"
                    value={row.no_of_std}
                    onChange={(e) => setRowField(i, { no_of_std: e.target.value })}
                    className="w-full h-[42px] px-3 text-center rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f3d5e] focus:ring-2 focus:ring-[#0f3d5e]/20 tabular-nums font-semibold"
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-2 align-middle">
                  <div className="relative">
                    <select
                      value={row.gender}
                      onChange={(e) => setRowField(i, { gender: e.target.value })}
                      className="w-full h-[42px] pl-3 pr-9 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f3d5e] focus:ring-2 focus:ring-[#0f3d5e]/20 bg-white appearance-none font-medium cursor-pointer"
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                    <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </td>
                <td className="px-2 py-2 align-middle text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Remove row"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}
