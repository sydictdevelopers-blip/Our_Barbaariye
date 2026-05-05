import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Select2 from '../../../components/ui/Select2';
import { makeOptionLoader } from '../../../services/api';

const emptySel = { id: '', label: '' };

export default function ExamCopyTab() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [classFrom, setClassFrom] = useState(emptySel);
  const [classTo, setClassTo] = useState(emptySel);
  const [subject, setSubject] = useState(emptySel);
  const [examReg, setExamReg] = useState(emptySel);
  const onSelChange = (setter) => (e) => setter({ id: e.target.value, label: e.target.label || '' });

  const classLoader = useMemo(() => makeOptionLoader('class_options'), []);
  const subjectLoader = useMemo(() => makeOptionLoader('subject_options'), []);
  const examRegLoader = useMemo(() => makeOptionLoader('exam_reg_options'), []);

  const reset = () => {
    setClassFrom(emptySel);
    setClassTo(emptySel);
    setSubject(emptySel);
    setExamReg(emptySel);
  };

  const close = () => { setOpen(false); reset(); };

  return (
    <div className="space-y-4 px-2 py-3">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-50/60 dark:bg-slate-800/30">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('examCopy.title', { defaultValue: 'Copy Exam' })}
          </span>
          <Button size="sm" variant="primary" leftIcon={<Copy className="w-4 h-4" />} onClick={() => setOpen(true)}>
            {t('examCopy.copyExam', { defaultValue: 'Copy Exam' })}
          </Button>
        </div>
      </div>

      <Modal
        isOpen={open}
        onClose={close}
        title={t('examCopy.title', { defaultValue: 'Copy Exam' })}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="primary" onClick={() => {}}>
              {t('examCopy.generate', { defaultValue: 'Generate' })}
            </Button>
            <Button variant="secondary" onClick={close}>
              {t('common.close')}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select2 name="classFrom" value={classFrom.id} selectedLabel={classFrom.label} onChange={onSelChange(setClassFrom)} loadOptions={classLoader} placeholder={t('select.classFrom')} isClearable={false} />
          <Select2 name="classTo" value={classTo.id} selectedLabel={classTo.label} onChange={onSelChange(setClassTo)} loadOptions={classLoader} placeholder={t('select.classTo')} isClearable={false} />
          <Select2 name="subject" value={subject.id} selectedLabel={subject.label} onChange={onSelChange(setSubject)} loadOptions={subjectLoader} placeholder={t('select.subject')} isClearable={false} />
          <Select2 name="examReg" value={examReg.id} selectedLabel={examReg.label} onChange={onSelChange(setExamReg)} loadOptions={examRegLoader} placeholder={t('select.exam')} isClearable={false} />
        </div>
      </Modal>
    </div>
  );
}
