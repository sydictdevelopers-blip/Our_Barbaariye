import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';

const AR_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

const toArabicDigits = (s) => String(s).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
const toLatinDigits  = (s) => String(s).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

const isoToArDisplay = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return toArabicDigits(`${d}/${m}/${y}`);
};

const parseUserInput = (txt) => {
  const cleaned = toLatinDigits(String(txt || '')).replace(/[^\d/-]/g, '');
  const m = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const y  = m[3];
  if (Number(mm) < 1 || Number(mm) > 12) return null;
  if (Number(dd) < 1 || Number(dd) > 31) return null;
  return `${y}-${mm}-${dd}`;
};

const fireChange = (onChange, name, isoValue) => {
  if (!onChange) return;
  onChange({ target: { name, value: isoValue }, currentTarget: { name, value: isoValue } });
};

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const AR_WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

const isoToParts = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
};

const partsToIso = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const todayIso = () => {
  const t = new Date();
  return partsToIso(t.getFullYear(), t.getMonth() + 1, t.getDate());
};

const ArabicCalendar = ({ valueIso, onPick, onClose, style, popupRef }) => {
  const today = useMemo(() => isoToParts(todayIso()), []);
  const initial = isoToParts(valueIso) ?? today;
  const [view, setView] = useState({ y: initial.y, m: initial.m });

  const daysInMonth = new Date(view.y, view.m, 0).getDate();
  const firstWeekday = new Date(view.y, view.m - 1, 1).getDay();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const goPrev = () => {
    setView((v) => v.m === 1 ? { y: v.y - 1, m: 12 } : { ...v, m: v.m - 1 });
  };
  const goNext = () => {
    setView((v) => v.m === 12 ? { y: v.y + 1, m: 1 } : { ...v, m: v.m + 1 });
  };
  const pickToday = () => {
    onPick(todayIso());
    onClose();
  };

  const selected = isoToParts(valueIso);

  return (
    <div
      ref={popupRef}
      dir="rtl"
      style={style}
      className="w-72 rounded-xl border border-slate-200 bg-white shadow-lg dark:bg-slate-800 dark:border-slate-700 p-3 select-none"
    >
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={goPrev}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {AR_MONTHS[view.m - 1]} {toArabicDigits(view.y)}
        </div>
        <button type="button" onClick={goNext}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {AR_WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] text-center text-slate-500 dark:text-slate-400 py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`b-${i}`} />;
          const isToday  = today.y === view.y && today.m === view.m && today.d === d;
          const isSel    = selected && selected.y === view.y && selected.m === view.m && selected.d === d;
          const cls = isSel
            ? 'bg-[#0f3d5e] text-white'
            : isToday
              ? 'border border-[#0f3d5e] text-[#0f3d5e] dark:text-teal-300 dark:border-teal-400'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200';
          return (
            <button
              key={d}
              type="button"
              onClick={() => { onPick(partsToIso(view.y, view.m, d)); onClose(); }}
              className={`text-xs h-8 rounded-md ${cls}`}
            >
              {toArabicDigits(d)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        <button type="button" onClick={() => { onPick(''); onClose(); }}
          className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
          مسح
        </button>
        <button type="button" onClick={pickToday}
          className="text-xs font-medium text-[#0f3d5e] hover:underline dark:text-teal-300">
          اليوم
        </button>
      </div>
    </div>
  );
};

export default function DateInput({
  value,
  onChange,
  name,
  id,
  className = '',
  placeholder,
  defaultToToday = true,
  ...rest
}) {
  const { i18n } = useTranslation();
  const isAr = String(i18n.language || '').toLowerCase().startsWith('ar');
  const wrapRef = useRef(null);
  const popupRef = useRef(null);

  const [draft, setDraft] = useState(() => isoToArDisplay(value));
  const [popOpen, setPopOpen] = useState(false);
  const [popPos, setPopPos] = useState({ top: 0, left: 0 });

  // Default to today on first mount if no value supplied. App-wide preference:
  // every date field shows today by default (filters, forms, ranges) so users
  // don't have to manually pick the current date for the common case. Caller
  // can opt out with defaultToToday={false} (e.g. a DOB field where blank is
  // intentional).
  useEffect(() => {
    if (defaultToToday && (value == null || value === '')) {
      fireChange(onChange, name, todayIso());
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDraft(isoToArDisplay(value));
  }, [value]);

  useEffect(() => {
    if (!popOpen) return;
    const onDoc = (e) => {
      const inWrap  = wrapRef.current && wrapRef.current.contains(e.target);
      const inPopup = popupRef.current && popupRef.current.contains(e.target);
      if (!inWrap && !inPopup) setPopOpen(false);
    };
    const onScrollOrResize = () => setPopOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [popOpen]);

  if (!isAr) {
    return (
      <input
        type="date"
        name={name}
        id={id}
        value={value ?? ''}
        onChange={onChange}
        className={className}
        placeholder={placeholder}
        {...rest}
      />
    );
  }

  const handleTextChange = (e) => {
    const next = e.target.value;
    setDraft(next);
    if (next === '') {
      fireChange(onChange, name, '');
      return;
    }
    const iso = parseUserInput(next);
    if (iso !== null) fireChange(onChange, name, iso);
  };

  const handlePick = (iso) => {
    setDraft(isoToArDisplay(iso));
    fireChange(onChange, name, iso);
  };

  const togglePopup = () => {
    setPopOpen((open) => {
      if (open) return false;
      const r = wrapRef.current?.getBoundingClientRect();
      if (r) {
        const popupWidth = 288;
        const margin = 8;
        let left = r.right - popupWidth;
        if (left < margin) left = margin;
        if (left + popupWidth + margin > window.innerWidth) {
          left = window.innerWidth - popupWidth - margin;
        }
        let top = r.bottom + 4;
        const popupHeight = 320;
        if (top + popupHeight + margin > window.innerHeight) {
          top = Math.max(margin, r.top - popupHeight - 4);
        }
        setPopPos({ top, left });
      }
      return true;
    });
  };

  return (
    <div ref={wrapRef} className="relative w-full" dir="rtl">
      <input
        type="text"
        name={name}
        id={id}
        value={draft}
        onChange={handleTextChange}
        placeholder={placeholder ?? 'يوم/شهر/سنة'}
        dir="ltr"
        inputMode="numeric"
        className={`${className} text-right pl-9`}
        {...rest}
      />
      <button
        type="button"
        onClick={togglePopup}
        aria-label="اختيار التاريخ"
        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
      >
        <Calendar className="w-4 h-4" />
      </button>
      {popOpen && createPortal(
        <ArabicCalendar
          valueIso={value || ''}
          onPick={handlePick}
          onClose={() => setPopOpen(false)}
          popupRef={popupRef}
          style={{ position: 'fixed', top: popPos.top, left: popPos.left, zIndex: 9999 }}
        />,
        document.body
      )}
    </div>
  );
}
