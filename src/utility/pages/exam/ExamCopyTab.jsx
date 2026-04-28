import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Select2 from '../../../components/ui/Select2';
import { makeOptionLoader } from '../../../services/api';

const emptySel = { id: '', label: '' };

export default function ExamCopyTab() {
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
      <div className="flex items-center justify-end">
        <Button size="sm" variant="primary" leftIcon={<Copy className="w-4 h-4" />} onClick={() => setOpen(true)}>
          COPY EXAM
        </Button>
      </div>

      <Modal
        isOpen={open}
        onClose={close}
        title="Copy exam"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="primary" onClick={() => {}}>
              GENERATE
            </Button>
            <Button variant="primary" onClick={close}>
              CLOSE
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select2 name="classFrom" value={classFrom.id} selectedLabel={classFrom.label} onChange={onSelChange(setClassFrom)} loadOptions={classLoader} placeholder="Select Class From" isClearable={false} />
          <Select2 name="classTo" value={classTo.id} selectedLabel={classTo.label} onChange={onSelChange(setClassTo)} loadOptions={classLoader} placeholder="Select Class To" isClearable={false} />
          <Select2 name="subject" value={subject.id} selectedLabel={subject.label} onChange={onSelChange(setSubject)} loadOptions={subjectLoader} placeholder="Select Subject" isClearable={false} />
          <Select2 name="examReg" value={examReg.id} selectedLabel={examReg.label} onChange={onSelChange(setExamReg)} loadOptions={examRegLoader} placeholder="Select Exam" isClearable={false} />
        </div>
      </Modal>
    </div>
  );
}
