import {
  // Generic / table actions
  Database, Plus, Pencil, Trash2, Eye, Save, X, Check, Filter,
  Upload, Download, RefreshCw, Copy, Printer, GitMerge,
  Image, Mail, FileSpreadsheet, Search, MoreHorizontal,
  CheckCircle, CheckCircle2, CheckCheck, XCircle,
  LayoutGrid, LayoutDashboard, Grid3x3,
  // Domain entities
  GraduationCap, Users, User, UserCheck, UserCog, UserPlus, UserX,
  BookMarked, BookOpen, BookOpenCheck, ListChecks,
  Layers, Building2, Bus, DoorOpen,
  CalendarDays, CalendarClock, Calendar, Clock,
  Activity, BarChart3, ClipboardList, ClipboardCheck,
  FileCheck, FilePlus2, FileText,
  MessageSquare, HelpCircle, Info, AlertTriangle,
  Sparkles, Globe, Lock, ShieldCheck,
  Sliders, Settings2, Wrench,
  ArrowLeftRight, ArrowRightLeft, ArrowRight, ArrowLeft,
  Video, PlayCircle, Youtube,
  // Legacy fallbacks still referenced in older configs
  Timer, PenTool, FolderPlus, Hourglass,
} from 'lucide-react';

/**
 * Central registry mapping icon-name strings (used in menuConfig.jsx and
 * exam config files) to their lucide-react components. Keep this list
 * sorted by category so newcomers can find an icon quickly.
 */
export const ICON_REGISTRY = {
  Database, Plus, Pencil, Trash2, Eye, Save, X, Check, Filter,
  Upload, Download, RefreshCw, Copy, Printer, GitMerge,
  Image, Mail, FileSpreadsheet, Search, MoreHorizontal,
  CheckCircle, CheckCircle2, CheckCheck, XCircle,
  LayoutGrid, LayoutDashboard, Grid3x3,
  GraduationCap, Users, User, UserCheck, UserCog, UserPlus, UserX,
  BookMarked, BookOpen, BookOpenCheck, ListChecks,
  Layers, Building2, Bus, DoorOpen,
  CalendarDays, CalendarClock, Calendar, Clock,
  Activity, BarChart3, ClipboardList, ClipboardCheck,
  FileCheck, FilePlus2, FileText,
  MessageSquare, HelpCircle, Info, AlertTriangle,
  Sparkles, Globe, Lock, ShieldCheck,
  Sliders, Settings2, Wrench,
  ArrowLeftRight, ArrowRightLeft, ArrowRight, ArrowLeft,
  Video, PlayCircle, Youtube,
  Timer, PenTool, FolderPlus, Hourglass,
};

/** Resolve an icon string (e.g. "Database") or pass-through component. */
export function resolveIcon(value, fallback = Database) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  return ICON_REGISTRY[value] ?? fallback;
}

/** Tabs default to Database; buttons default to Plus. */
export const resolveTabIcon = (value) => resolveIcon(value, Database);
export const resolveButtonIcon = (value) => resolveIcon(value, Plus);
