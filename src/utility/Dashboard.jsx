/**
 * Dashboard.jsx - Dashboard overview
 *
 * - Summary cards (Students, Graduated, Free, Employees, Inactive)
 * - Charts: students by grade (Bar), enrollment trend (Area), grade distribution (Pie)
 * - Recent activity + Upcoming events
 * - Tabs: Admission, Finance, Attendance, Activity, Academic
 */
import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import StatValue from '../components/StatValue';
import Tabs from '../components/ui/Tabs';
import {
  Users,
  GraduationCap,
  Gift,
  UserCheck,
  UserX,
  ArrowRight,
  Calendar,
  Bell,
  BookOpen,
  Wallet,
  ChevronRight,
  Clock,
  UserPlus,
  ClipboardCheck,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const COLORS = { primary: '#0B3C5D', secondary: '#0D9488' };

const DASHBOARD_TAB_DEFS = [
  { id: 'admission', icon: UserPlus },
  { id: 'finance', icon: Wallet },
  { id: 'attendance', icon: ClipboardCheck },
  { id: 'activity', icon: Activity },
  { id: 'academic', icon: GraduationCap },
];

const summaryCardDefs = [
  { id: 'students', value: 1247, icon: Users, color: '#0B3C5D' },
  { id: 'graduated', value: 89, icon: GraduationCap, color: '#2ECC71' },
  { id: 'free', value: 42, icon: Gift, color: '#F4A261' },
  { id: 'employees', value: 156, icon: UserCheck, color: '#0D9488' },
  { id: 'inactive', value: 12, icon: UserX, color: '#9CA3AF' },
];

const chartData = [
  { grade: 'G1', male: 85, female: 92, total: 177 },
  { grade: 'G2', male: 78, female: 88, total: 166 },
  { grade: 'G3', male: 82, female: 79, total: 161 },
  { grade: 'G4', male: 90, female: 95, total: 185 },
  { grade: 'G5', male: 75, female: 82, total: 157 },
  { grade: 'G6', male: 88, female: 91, total: 179 },
  { grade: 'G7', male: 72, female: 78, total: 150 },
  { grade: 'G8', male: 65, female: 70, total: 135 },
];

const trendData = [
  { month: 'Jul', enrollment: 1100, attendance: 94 },
  { month: 'Aug', enrollment: 1150, attendance: 95 },
  { month: 'Sep', enrollment: 1180, attendance: 93 },
  { month: 'Oct', enrollment: 1210, attendance: 96 },
  { month: 'Nov', enrollment: 1230, attendance: 95 },
  { month: 'Dec', enrollment: 1247, attendance: 97 },
];

const pieDataDefs = [
  { id: 'primary', value: 520, color: COLORS.primary },
  { id: 'middle', value: 385, color: COLORS.secondary },
  { id: 'high', value: 342, color: '#2ECC71' },
];

const recentActivity = [
  { id: 1, type: 'enrollment', title: 'New enrollment', detail: 'Ahmed Hassan - Grade 5', time: '2 min ago', icon: UserCheck },
  { id: 2, type: 'payment', title: 'Fee received', detail: 'Fatima Ali - $450', time: '15 min ago', icon: Wallet },
  { id: 3, type: 'attendance', title: 'Attendance alert', detail: 'Grade 7 - 3 absences', time: '1 hour ago', icon: Bell },
  { id: 4, type: 'exam', title: 'Exam completed', detail: 'Grade 8 Math - Results ready', time: '2 hours ago', icon: BookOpen },
  { id: 5, type: 'event', title: 'Event reminder', detail: 'Parent-Teacher Meeting - Tomorrow', time: '3 hours ago', icon: Calendar },
];

const upcomingEvents = [
  { date: 'Feb 10', title: 'Parent-Teacher Meeting', type: 'meeting' },
  { date: 'Feb 15', title: 'Science Fair', type: 'event' },
  { date: 'Feb 20', title: 'Mid-term Exams Start', type: 'exam' },
  { date: 'Feb 25', title: 'Sports Day', type: 'event' },
];

function useGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t('greeting.morning');
  if (hour < 17) return t('greeting.afternoon');
  return t('greeting.evening');
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { sidebarCollapsed } = useSelector((state) => state.ui);
  const [activeTab, setActiveTab] = useState('admission');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const DASHBOARD_TABS = DASHBOARD_TAB_DEFS.map((tab) => ({
    ...tab,
    label: t(`dashboard.tabs.${tab.id}`),
  }));
  const summaryCards = summaryCardDefs.map((c) => ({
    ...c,
    label: t(`dashboard.cards.${c.id}`),
  }));
  const pieData = pieDataDefs.map((p) => ({
    ...p,
    name: t(`dashboard.charts.${p.id}`),
  }));
  const localeMap = { so: 'en-US', en: 'en-US', ar: 'ar' };
  const dateLocale = localeMap[i18n.language] || 'en-US';

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 300000);
    return () => clearInterval(timer);
  }, []);

  const maxW = sidebarCollapsed ? 'max-w-[1800px]' : 'max-w-[1600px]';
  const activeTabLabel = DASHBOARD_TABS.find((tab) => tab.id === activeTab)?.label;

  return (
    <main
      id="main-content"
      className={`py-7 px-6 sm:px-8 pb-12 ${maxW} mx-auto flex flex-col gap-6 transition-[max-width] duration-200 ease-in-out min-w-0`}
      role="main"
      tabIndex={-1}
    >
      {/* Header: greeting + date */}
      <section className="bg-white dark:bg-slate-800/95 rounded-xl p-6 md:p-7 border border-slate-200 dark:border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className="block text-[0.8125rem] font-medium text-slate-500 dark:text-slate-400 tracking-wide mb-1">
              {useGreeting(t)}, {t('greeting.admin')}
            </span>
            <h1 className="text-2xl font-bold tracking-tight mb-1.5 leading-snug">
              <span className="bg-gradient-to-br from-[#0B3C5D] to-[#1565a0] bg-clip-text text-transparent">
                {t('dashboard.overview')}
              </span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('dashboard.todayLine')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 py-2 px-3.5 border border-slate-200 dark:border-slate-600 rounded-[10px] text-[0.8125rem] font-medium text-slate-600 dark:text-slate-300 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 shadow-sm">
              <Calendar size={18} className="shrink-0 text-[#0B3C5D]" aria-hidden="true" />
              <span>
                {`${currentTime.toLocaleDateString(dateLocale, { weekday: 'short' })}, ${currentTime.toLocaleDateString(dateLocale, { month: 'short' })} ${currentTime.getDate()}, ${currentTime.getFullYear()}`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="bg-white dark:bg-slate-800/95 rounded-xl p-6 border border-slate-200 dark:border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.id}
                className="bg-white dark:bg-slate-800/80 rounded-[10px] overflow-hidden min-h-[100px] border border-slate-200 dark:border-slate-600 transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_12px_24px_rgba(0,0,0,0.05),0_2px_12px_rgba(11,60,93,0.12)] relative group"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-80"
                  style={{
                    background: `linear-gradient(90deg, ${card.color}, color-mix(in srgb, ${card.color} 70%, transparent))`,
                  }}
                  aria-hidden
                />
                <div className="p-5 h-full min-h-[100px] flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      background: `color-mix(in srgb, ${card.color} 14%, transparent)`,
                      color: card.color,
                    }}
                  >
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[1.625rem] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight mb-0.5">
                      <StatValue value={card.value} />
                    </span>
                    <span className="text-[0.8125rem] font-medium text-slate-500 dark:text-slate-400">
                      {card.label}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        <div className="bg-white dark:bg-slate-800/95 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between flex-wrap gap-2 p-4 md:p-5 border-b border-slate-200 dark:border-slate-600">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.charts.studentsByGrade')}</h2>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 py-1 px-2 rounded">
              {t('dashboard.charts.maleFemaleTotal')}
            </span>
          </div>
          <div className="p-4 md:p-5">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 16, right: 24, left: 16, bottom: 8 }}>
                <defs>
                  <linearGradient id="barMale" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.primary} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="barFemale" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.secondary} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLORS.secondary} stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="barTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2ECC71" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2ECC71" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecef" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e8ecef',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="male" fill="url(#barMale)" name={t('dashboard.charts.male')} radius={[6, 6, 0, 0]} />
                <Bar dataKey="female" fill="url(#barFemale)" name={t('dashboard.charts.female')} radius={[6, 6, 0, 0]} />
                <Bar dataKey="total" fill="url(#barTotal)" name={t('dashboard.charts.total')} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/95 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-600">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.charts.enrollmentTrend')}</h2>
          </div>
          <div className="p-2">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="areaEnrollment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecef" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecef' }} />
                <Area
                  type="monotone"
                  dataKey="enrollment"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fill="url(#areaEnrollment)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/95 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-600">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.charts.gradeDistribution')}</h2>
          </div>
          <div className="p-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecef' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-800/95 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between py-4 px-5 border-b border-slate-200 dark:border-slate-600">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.activity.title')}</h2>
            <button
              type="button"
              className="inline-flex items-center text-sm font-medium text-[#0B3C5D] hover:opacity-80 transition-opacity"
            >
              {t('dashboard.activity.viewAll')} <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <ul className="list-none">
            {recentActivity.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-4 py-4 px-6 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 hover:bg-gradient-to-r hover:from-[rgba(11,60,93,0.04)] hover:to-transparent transition-colors"
                >
                  <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[rgba(11,60,93,0.08)] to-[rgba(11,60,93,0.04)] text-[#0B3C5D] flex items-center justify-center shrink-0">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[0.9375rem] font-medium text-slate-800 dark:text-slate-200">
                      {item.title}
                    </span>
                    <span className="text-[0.8125rem] text-slate-500 dark:text-slate-400">{item.detail}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock size={12} aria-hidden="true" />
                    {item.time}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-800/95 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between py-5 px-6 border-b border-slate-100 dark:border-slate-700/50">
            <h2 className="text-[0.9375rem] font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.events.title')}</h2>
            <button
              type="button"
              className="inline-flex items-center text-sm font-medium text-[#0B3C5D] hover:opacity-80 transition-opacity"
            >
              {t('dashboard.events.calendar')} <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <ul className="list-none py-3">
            {upcomingEvents.map((event) => (
              <li
                key={`${event.date}-${event.title}`}
                className="flex items-center gap-4 py-3 px-6 hover:bg-gradient-to-r hover:from-[rgba(11,60,93,0.04)] hover:to-transparent transition-colors"
              >
                <div className="text-[0.8125rem] font-semibold text-[#0B3C5D] min-w-12 shrink-0">{event.date}</div>
                <span className="text-[0.9375rem] text-slate-800 dark:text-slate-200">{event.title}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Tabs: Admission, Finance, Attendance, Activity, Academic */}
      <section className="bg-white dark:bg-slate-800/95 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="p-5 border-b border-slate-200 dark:border-slate-600">
          <Tabs tabs={DASHBOARD_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('dashboard.tabContent', { tab: activeTabLabel })}
          </p>
        </div>
      </section>
    </main>
  );
}
