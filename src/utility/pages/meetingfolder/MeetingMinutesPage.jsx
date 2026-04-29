import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Database, Plus, Printer } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import { getTabsForPath } from '../../../config/menuConfig';
import { setActiveTab } from '../../../slices/uiSlice';

const motionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

const iconMap = { Users };

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLS = 'block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1';

function mapTab(tab, t) {
  return {
    ...tab,
    icon: typeof tab.icon === 'string' ? (iconMap[tab.icon] ?? Users) : tab.icon,
    label: tab.labelKey ? t(tab.labelKey, tab.label) : tab.label,
  };
}

function todayIso() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function MeetingMinutesTab() {
  const { t } = useTranslation();
  const today = todayIso();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="px-3 py-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="meeting-from" className={LABEL_CLS}>
              {t('meeting.from', 'From.')}
            </label>
            <input
              id="meeting-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label htmlFor="meeting-to" className={LABEL_CLS}>
              {t('meeting.to', 'To.')}
            </label>
            <input
              id="meeting-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <Button size="sm" variant="primary" leftIcon={<Printer className="w-4 h-4" />}>
            {t('action.print', 'PRINT')}
          </Button>
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-3">
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            {t('entity.addNew', 'ADD NEW')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Database className="w-4 h-4" />}
            onClick={() => setLoaded(true)}
          >
            {t('action.showData', 'SHOW DATA')}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white py-10">
        <EmptyState
          title={
            loaded
              ? t('empty.noData', 'No meeting minutes found')
              : t('empty.notLoaded', 'No data loaded yet')
          }
          description={
            loaded
              ? t('empty.noDataFilters', 'Try adjusting the date range')
              : t('empty.clickShowData', 'Click SHOW DATA to load meeting minutes')
          }
        />
      </div>
    </div>
  );
}

export default function MeetingMinutesPage() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const rawTabs = getTabsForPath(location.pathname);
  const tabs = useMemo(() => rawTabs.map((tab) => mapTab(tab, t)), [rawTabs, t]);

  const { activeTab } = useSelector((state) => state.ui);

  useEffect(() => {
    if (tabs.length && !tabs.some((tab) => tab.id === activeTab)) {
      dispatch(setActiveTab(tabs[0].id));
    }
  }, [location.pathname, tabs, activeTab, dispatch]);

  const renderTabContent = () => {
    if (activeTab === 'MeetingMinutes') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <MeetingMinutesTab />
        </motion.div>
      );
    }
    return null;
  };

  if (!tabs.length) return null;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/60">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="relative px-5 py-5 bg-white border-b border-slate-200/70">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => dispatch(setActiveTab(id))}
            className="w-full"
          />
        </div>
        <div className="px-3 pb-4 pt-2">
          <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
