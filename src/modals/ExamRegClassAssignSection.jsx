import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { fetchDataPaginated } from '../services/api';
import * as swal from '../utils/swal';

// Section ku-dhejisan modalka Exam Registration. Waxa uu taageeraa insert iyo
// edit labadaba:
//   - Insert: radio (All/Custom). 'All' wuxuu galayaa dhammaan branch
//     classes-ka; 'Custom' wuxuu u oggolaanayaa user-ka multi-select.
//   - Edit:   radio sidoo kale waa la muujinayaa. Mode-ka bilowga waxa loo
//             qiyaasaa: haddii dhammaan options-ku assign-yihiin → 'all',
//             haddii kale → 'custom'. Multi-select-ka horeey loo buuxiyay
//             fasallada hadda jira.
//
// State-ka section-ka waxa hayaa parent (AcademicSetup). onChange wuxuu
// qaadanayaa updater-function (setState style) si effect-yo isku-mar
// shaqeeyaa aysan iska tirtirin midba midka kale (race condition).
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#0f3d5e' : 'rgb(226 232 240)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(15, 61, 94, 0.2)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#0f3d5e' : 'rgb(203 213 225)' },
  }),
  menu: (base) => ({ ...base, zIndex: 9999, borderRadius: '8px' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'rgb(241 245 249)',
    border: '1px solid rgb(226 232 240)',
    borderRadius: '6px',
  }),
};

const pairKey = (x) => `${x?.cl_id}-${x?.b_id}`;

export default function ExamRegClassAssignSection({
  academicYearId,
  examRegId, // null on insert, the ex_reg_id on edit
  value,
  onChange,
}) {
  const { t } = useTranslation();
  const isEdit = !!examRegId;
  const mode = value?.mode || (isEdit ? 'custom' : 'all');
  const selected = value?.selected || [];
  const options = value?.options || [];
  const original = value?.original || [];
  const loading = !!value?.loading;
  const optionsLoaded = !!value?.optionsLoaded;
  const existingLoaded = !!value?.existingLoaded;
  const initialModeSet = !!value?.initialModeSet;

  // Guard against fire-and-forget setState after unmount.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // Edit mode: load existing (a_c_ex, cl_id, b_id) ee fasallada hadda jira.
  // Labels-ka waxa ka dib lagu derive-gareeyaa option list-ka marka uu yimaado.
  useEffect(() => {
    if (!isEdit || !examRegId) return;
    if (existingLoaded) return;
    let cancelled = false;
    fetchDataPaginated({
      queryName: 'assign_class_exam_by_er',
      page: 1,
      limit: 1000,
      er_id: examRegId,
    })
      .then((res) => {
        if (cancelled || !aliveRef.current) return;
        const rows = (res?.data || []).filter((r) => r.cl_id != null);
        const orig = rows.map((r) => ({ a_c_ex: r.a_c_ex, cl_id: r.cl_id, b_id: r.b_id }));
        onChange?.((prev) => ({ ...prev, original: orig, existingLoaded: true }));
      })
      .catch((err) => {
        swal.swalError(err?.message || t('swal.titles.error', 'Khalad ayaa dhacay'), '');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, examRegId]);

  // Options preload: had & jeer marka academicYearId la yaqaan. Insert mode-ka
  // 'all'-ka wuxuu sidoo kale u baahan yahay options si onSuccess uu u helo
  // dhammaan (cl_id, b_id) pairs. Edit mode ku waxa lagu hubinayaa optionsLoaded.
  useEffect(() => {
    if (!academicYearId) {
      onChange?.((prev) => ({ ...prev, options: [], optionsLoaded: false }));
      return;
    }
    if (optionsLoaded || loading) return;
    let cancelled = false;
    onChange?.((prev) => ({ ...prev, loading: true }));
    fetchDataPaginated({
      queryName: 'add_assing_class_exam_show',
      page: 1,
      limit: 1000,
      academicYearId,
    })
      .then((res) => {
        if (cancelled || !aliveRef.current) return;
        const opts = (res?.data || [])
          .filter((r) => r.cl_id != null && r.Result == null)
          .map((r) => ({
            value: `${r.cl_id}-${r.b_id}`,
            label: r.Class || '',
            cl_id: r.cl_id,
            b_id: r.b_id,
          }));
        onChange?.((prev) => ({ ...prev, options: opts, optionsLoaded: true, loading: false }));
      })
      .catch((err) => {
        if (!cancelled) onChange?.((prev) => ({ ...prev, loading: false }));
        swal.swalError(err?.message || t('swal.titles.error', 'Khalad ayaa dhacay'), '');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId]);

  // Edit mode hookup: marka existing & options labadaba la rarayo, mar keliya
  //   1. Selected = existing rows oo lagu match-gareeyay options (labels).
  //   2. Initial mode = 'all' haddii dhammaan options-ku assign-yihiin, ama
  //      'custom' haddii kale.
  useEffect(() => {
    if (!isEdit) return;
    if (!existingLoaded || !optionsLoaded) return;
    if (initialModeSet) return;
    const byKey = new Map(options.map((o) => [pairKey(o), o]));
    const origKeys = new Set(original.map(pairKey));
    const sel = original.map((o) => {
      const opt = byKey.get(pairKey(o));
      return opt || {
        value: pairKey(o),
        label: `#${o.cl_id}-${o.b_id}`,
        cl_id: o.cl_id,
        b_id: o.b_id,
      };
    });
    const allOptionsCovered = options.length > 0 && options.every((o) => origKeys.has(pairKey(o)));
    onChange?.((prev) => ({
      ...prev,
      selected: sel,
      mode: allOptionsCovered ? 'all' : 'custom',
      initialModeSet: true,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existingLoaded, optionsLoaded]);

  const setMode = (m) => {
    onChange?.((prev) => {
      // Marka mode-ka beddelo 'all' → selected = dhammaan options si user-ku
      // u arko liiska firfircoon. 'custom' marka la dooro, selected sii daa
      // sida uu hadda yahay si user-ku u sii beddelo.
      if (m === 'all') {
        return { ...prev, mode: 'all', selected: prev.options || [] };
      }
      return { ...prev, mode: 'custom' };
    });
  };
  const setSelected = (arr) => onChange?.((prev) => ({ ...prev, selected: arr || [] }));

  const intro = useMemo(
    () =>
      t(
        'assignClassesFollowup.intro',
        'Imtixaanka cusub waxaa loo xareynayaa fasallada hoose. Dooro hab.'
      ),
    [t]
  );

  // Edit mode: ilaa la rarayo, ha la muujin radio si aysan u bilaabin in
  // user-ku riixo 'all' isagoo aan options la rarin (taas oo selected-ka
  // banaan dhigi karta).
  const showRadio = !isEdit || (existingLoaded && optionsLoaded);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 p-3 space-y-3">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {t('assignClassesFollowup.title', 'Fasallada Imtixaanka')}
      </div>
      {!isEdit && <p className="text-xs text-slate-500 dark:text-slate-400">{intro}</p>}
      {showRadio && (
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="assign_mode"
              value="all"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              className="w-4 h-4 text-[#0f3d5e]"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {t('assignClassesFollowup.allClasses', 'Dhammaan Fasallada')}
            </span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="assign_mode"
              value="custom"
              checked={mode === 'custom'}
              onChange={() => setMode('custom')}
              className="w-4 h-4 text-[#0f3d5e]"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {t('assignClassesFollowup.customClasses', 'Fasallo Gaar Ah')}
            </span>
          </label>
        </div>
      )}
      {mode === 'custom' && (
        <div className="space-y-2">
          <Select
            isMulti
            isLoading={loading}
            options={options}
            value={selected}
            onChange={setSelected}
            placeholder={t('assignClassesFollowup.pickPlaceholder', 'Dooro hal ama dhowr fasal…')}
            styles={selectStyles}
            classNamePrefix="select2"
            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            menuPosition="fixed"
            menuPlacement="auto"
            noOptionsMessage={() => t('entity.notFound', 'Wax xog ah lama helin')}
          />
          {optionsLoaded && options.length === 0 && !loading && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t('assignClassesFollowup.errNoClasses', 'Wax fasal ah lama helin')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
