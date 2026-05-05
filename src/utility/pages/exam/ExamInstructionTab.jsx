import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Database } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { fetchSelectOptions } from '../../../services/api';
import { swalSuccess, swalError, swalConfirm } from '../../../utils/swal';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function postBulk(steps) {
  const res = await fetch(`${API_BASE}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch (_) { data = { error: text }; }
  if (!res.ok) throw new Error(data?.error || 'Bulk failed');
  return data;
}

const emptyBodies = { a: '', b: '', c: '', d: '' };

export default function ExamInstructionTab() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.ui.user);
  const uBrId = user?.u_br_id ?? user?.br_id ?? 0;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('insert'); // 'insert' | 'edit'
  const [editId, setEditId] = useState(null);
  const [bodies, setBodies] = useState(emptyBodies);
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchSelectOptions('exam_in_show', 200, '', { u_br_id: uBrId });
      setRows(Array.isArray(resp?.data) ? resp.data : []);
    } catch (e) {
      swalError('Khalad', e?.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [uBrId]);

  const handleShow = async () => {
    setShowResults(true);
    await refresh();
  };

  const refreshIfShown = async () => {
    if (showResults) await refresh();
  };

  const openInsert = () => {
    setModalMode('insert');
    setBodies(emptyBodies);
    setEditId(null);
    setEditBody('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setModalMode('edit');
    setEditId(row.id);
    setEditBody(row.instruction || '');
    setBodies(emptyBodies);
    setModalOpen(true);
  };

  const close = () => setModalOpen(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      let steps;
      if (modalMode === 'insert') {
        const { a, b, c, d } = bodies;
        if (!a.trim() || !b.trim() || !c.trim() || !d.trim()) {
          swalError('Khalad', 'Buuxi 4-ta instruction (A, B, C, D).');
          setSaving(false);
          return;
        }
        steps = [{
          type: 'sp', fn: 'exam_in_sp',
          params: [0, a.trim(), b.trim(), c.trim(), d.trim(), uBrId, 'insert'],
        }];
      } else {
        const body = editBody.trim();
        if (!body) {
          swalError('Khalad', 'Geli instruction-ka.');
          setSaving(false);
          return;
        }
        steps = [{
          type: 'sp', fn: 'exam_in_sp',
          params: [editId, body, '', '', '', uBrId, 'update'],
        }];
      }
      await postBulk(steps);
      swalSuccess('Wa la guulaystey', modalMode === 'insert' ? 'Waa la kaydiyay' : 'Waa la cusbooneysiiyay');
      close();
      await refreshIfShown();
    } catch (e) {
      swalError('Khalad ayaa dhacay', e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await swalConfirm();
    if (!ok) return;
    try {
      await postBulk([{
        type: 'sp', fn: 'exam_in_sp',
        params: [row.id, '', '', '', '', uBrId, 'delete'],
      }]);
      swalSuccess('Wa la guulaystey', 'La tirtirey');
      await refreshIfShown();
    } catch (e) {
      swalError('Khalad', e?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4 px-2 py-3">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-50/60 dark:bg-slate-800/30">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('examInstruction.title', { defaultValue: 'Exam Instructions' })}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShow} disabled={loading}>
              {loading ? t('action.loading') : t('action.showData')}
            </Button>
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openInsert}>
              {t('entity.addNew')}
            </Button>
          </div>
        </div>
      </div>

      {showResults && (
      <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
        <div className="flex items-center bg-[#0B3C5D] text-white px-4 py-2">
          <span className="font-semibold flex-1">{t('examInstruction.title', { defaultValue: 'Exam Instructions' })} ({rows.length})</span>
        </div>
        {loading ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400">{t('action.loading')}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400">{t('examInstruction.empty', { defaultValue: 'No instructions yet.' })}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-start px-4 py-2 w-16">ID</th>
                  <th className="text-start px-4 py-2">Instruction</th>
                  <th className="text-start px-4 py-2 w-32">Date</th>
                  <th className="text-start px-4 py-2 w-32">Username</th>
                  <th className="text-center px-4 py-2 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">{r.id}</td>
                    <td className="px-4 py-2">{r.instruction}</td>
                    <td className="px-4 py-2">{r.reg_date}</td>
                    <td className="px-4 py-2">{r.username || ''}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center gap-2">
                        <button type="button" onClick={() => openEdit(r)} className="bg-amber-500 hover:bg-amber-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(r)} className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={close}
        title="Exam Instructions Form"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="primary" onClick={close} disabled={saving}>
              Close
            </Button>
          </div>
        }
      >
        {modalMode === 'insert' ? (
          <div className="space-y-4">
            {[
              { key: 'a', label: 'Inustraction (A) :' },
              { key: 'b', label: 'Inustraction (B) :' },
              { key: 'c', label: 'Inustraction (C) :' },
              { key: 'd', label: 'Inustraction (D) :' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-emerald-600 font-medium">{label}</label>
                <textarea
                  rows={2}
                  value={bodies[key]}
                  onChange={(e) => setBodies((b) => ({ ...b, [key]: e.target.value }))}
                  className="w-full border-b border-slate-300 focus:border-[#0B3C5D] outline-none px-1 py-1 bg-transparent resize-y"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-emerald-600 font-medium">Instruction :</label>
            <textarea
              rows={4}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full border-b border-slate-300 focus:border-[#0B3C5D] outline-none px-1 py-1 bg-transparent resize-y"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
