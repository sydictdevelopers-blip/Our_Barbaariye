import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Database } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ActionButton from '../../../components/ui/ActionButton';
import DataTableCard from '../../../components/DataTableCard';
import { fetchSelectOptions } from '../../../services/api';
import { swalSuccess, swalError, swalConfirm } from '../../../utils/swal';
import { confirmDelete } from '../../../utils/confirmDelete';

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
  const brId = user?.br_id ?? 0;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('insert'); // 'insert' | 'edit'
  const [editId, setEditId] = useState(null);
  const [bodies, setBodies] = useState(emptyBodies);
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchSelectOptions('exam_in_show', 200, '', { br_id: brId });
      setRows(Array.isArray(resp?.data) ? resp.data : []);
    } catch (e) {
      swalError(t('examInstruction.msg.errTitle'), e?.message || t('examInstruction.msg.loadFailed'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [brId, t]);

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
    setEditId(row.ex_in_id);
    setEditBody(row.body || '');
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
          swalError(t('examInstruction.msg.errTitle'), t('examInstruction.msg.fillAll'));
          setSaving(false);
          return;
        }
        steps = [{
          type: 'sp', fn: 'exam_instructions_sp',
          params: [0, a.trim(), b.trim(), c.trim(), d.trim(), uBrId, 'insert'],
        }];
      } else {
        const body = editBody.trim();
        if (!body) {
          swalError(t('examInstruction.msg.errTitle'), t('examInstruction.msg.enterInstruction'));
          setSaving(false);
          return;
        }
        steps = [{
          type: 'sp', fn: 'exam_instructions_sp',
          params: [editId, body, '', '', '', uBrId, 'update'],
        }];
      }
      await postBulk(steps);
      swalSuccess(
        t('examInstruction.msg.successTitle'),
        modalMode === 'insert' ? t('examInstruction.msg.saved') : t('examInstruction.msg.updated'),
      );
      close();
      await refreshIfShown();
    } catch (e) {
      swalError(t('examInstruction.msg.errOccurred'), e?.message || t('examInstruction.msg.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirmDelete({ id: row.ex_in_id, label: 'Exam Instruction', recordPreview: row.title || row.instruction });
    if (!ok) return;
    try {
      await postBulk([{
        type: 'sp', fn: 'exam_instructions_sp',
        params: [row.ex_in_id, '', '', '', '', uBrId, 'delete'],
      }]);
      swalSuccess(t('examInstruction.msg.successTitle'), t('examInstruction.msg.deleted'));
      await refreshIfShown();
    } catch (e) {
      swalError(t('examInstruction.msg.errTitle'), e?.message || t('examInstruction.msg.deleteFailed'));
    }
  };

  const COLUMNS = useMemo(() => ([
    { key: 'ex_in_id', label: t('examInstruction.table.id') },
    { key: 'body',     label: t('examInstruction.table.instruction') },
    { key: 'reg_date', label: t('examInstruction.table.date') },
    { key: 'username', label: t('examInstruction.table.username') },
  ]), [t]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [rows, search]);
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => { setPage(1); }, [rows, pageSize]);

  const renderActions = useCallback((row) => (
    <div className="inline-flex gap-2">
      <ActionButton variant="edit" aria-label={t('examInstruction.table.edit')} onClick={() => openEdit(row)}>
        <Pencil className="w-4 h-4" />
      </ActionButton>
      <ActionButton variant="delete" aria-label={t('examInstruction.table.delete')} onClick={() => handleDelete(row)}>
        <Trash2 className="w-4 h-4" />
      </ActionButton>
    </div>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [t]);

  return (
    <div className="space-y-4 px-2 py-3">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-50/60 dark:bg-slate-800/30">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('examInstruction.title')}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShow} disabled={loading}>
              {loading ? t('examInstruction.loading') : t('examInstruction.showData')}
            </Button>
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openInsert}>
              {t('examInstruction.addNew')}
            </Button>
          </div>
        </div>
      </div>

      {showResults && (
        <DataTableCard
          columns={COLUMNS}
          data={pagedRows}
          isLoading={loading}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          itemsPerPage={pageSize}
          onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
          onPageClick={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          searchValue={search}
          onSearchChange={(e) => { setSearch(e?.target?.value ?? ''); setPage(1); }}
          emptyTitle={t('examInstruction.title')}
          emptyDescription={t('examInstruction.empty')}
          renderActions={renderActions}
          rowKey={(row) => row.ex_in_id}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={close}
        title={t('examInstruction.modalTitle')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? t('examInstruction.saving') : t('examInstruction.save')}
            </Button>
            <Button variant="primary" onClick={close} disabled={saving}>
              {t('examInstruction.close')}
            </Button>
          </div>
        }
      >
        {modalMode === 'insert' ? (
          <div className="space-y-4">
            {['a', 'b', 'c', 'd'].map((key) => (
              <div key={key} className="space-y-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('examInstruction.instructionLabel', { letter: key.toUpperCase() })}
                </label>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('examInstruction.instructionLabelSingle')}</label>
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
