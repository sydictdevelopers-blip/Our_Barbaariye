import { useMemo, useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  CheckSquare2,
  Eraser,
  Save,
  XCircle,
  Database,
  Plus,
  Users as UsersIcon,
  ShieldCheck,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Tabs from '../components/ui/Tabs';
import Select2 from '../components/ui/Select2';
import { defaultMenuItems } from '../config/menuConfig';
import { CRUD_CONFIG } from '../config/crudConfig';
import CrudModal from '../modals/CrudModal';
import { EntityTab } from './index';
import { loadData } from '../slices/dataSlice';
import { store } from '../store/store';
import { crud, fetchSelectOptions } from '../services/api';
import { swalSuccess, swalError } from '../utils/swal';
import { deserializePrivilege as deserializeUserPrivalage } from '../utils/privilege';

/* ───────────────── Permission tree helpers ───────────────── */

function buildPermissionTree(items = defaultMenuItems) {
  return items
    .filter((m) => m.id !== 'dashboard' && m.id !== 'userPrivilege')
    .map((module) => ({
      id: `module:${module.id}`,
      moduleKey: module.id,
      type: 'module',
      label: module.label,
      icon: module.icon,
      children: (module.children || []).map((menu) => ({
        id: `menu:${module.id}/${menu.id}`,
        menuKey: menu.id,
        type: 'menu',
        label: menu.label,
        children: (menu.tabs || []).map((tab) => ({
          id: `tab:${module.id}/${menu.id}/${tab.id}`,
          tabKey: tab.id,
          type: 'tab',
          label: tab.label,
          children: (tab.loadButtons || []).map((btn) => ({
            id: `action:${module.id}/${menu.id}/${tab.id}/${btn.id}`,
            actionKey: btn.id,
            type: 'action',
            label: btn.label,
          })),
        })),
      })),
    }))
    .filter((m) => m.children.length > 0);
}

function flattenNodes(tree) {
  const all = [];
  const walk = (n) => {
    all.push(n);
    n.children?.forEach(walk);
  };
  tree.forEach(walk);
  return all;
}

function getNodeState(node, selectedIds) {
  if (!node.children || node.children.length === 0) {
    return selectedIds.has(node.id) ? 'checked' : 'unchecked';
  }
  const childStates = node.children.map((c) => getNodeState(c, selectedIds));
  const allChecked = childStates.every((s) => s === 'checked');
  const noneChecked = childStates.every((s) => s === 'unchecked');
  if (allChecked) return 'checked';
  if (noneChecked) return selectedIds.has(node.id) ? 'checked' : 'unchecked';
  return 'indeterminate';
}

function filterTree(tree, term) {
  const q = term.trim().toLowerCase();
  if (!q) return tree;
  const match = (label) => label.toLowerCase().includes(q);
  const walk = (node) => {
    const children = (node.children || []).map(walk).filter(Boolean);
    if (match(node.label) || children.length) return { ...node, children };
    return null;
  };
  return tree.map(walk).filter(Boolean);
}

function serializePrivilege(tree, selectedIds) {
  return tree
    .map((module) => {
      const children = (module.children || [])
        .map((menu) => {
          const tabs = (menu.children || [])
            .map((tab) => {
              const buttons = (tab.children || [])
                .filter((action) => selectedIds.has(action.id))
                .map((action) => action.actionKey);
              if (buttons.length === 0 && !selectedIds.has(tab.id)) return null;
              return { id: tab.tabKey, buttons };
            })
            .filter(Boolean);
          if (tabs.length === 0 && !selectedIds.has(menu.id)) return null;
          return { id: menu.menuKey, tabs };
        })
        .filter(Boolean);
      if (children.length === 0 && !selectedIds.has(module.id)) return null;
      return { menuId: module.moduleKey, children };
    })
    .filter(Boolean);
}

function IndeterminateCheckbox({ checked, indeterminate, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 focus:ring-offset-0"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

/**
 * PermissionTreePanel — renders toolbar + module-pills + nested checkbox tree.
 * Reused by both the Privileges tab (global) and the per-user modal.
 */
function PermissionTreePanel({
  tree,
  search,
  setSearch,
  selectedIds,
  onToggleNode,
  onSelectAll,
  onClearAll,
  activeModuleId,
  setActiveModuleId,
}) {
  const { t } = useTranslation();
  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);
  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('userPrivilege.searchPermission')}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button size="sm" variant="primary" leftIcon={<CheckSquare2 className="w-4 h-4" />} onClick={onSelectAll}>
            {t('action.selectAll')}
          </Button>
          <Button size="sm" variant="secondary" leftIcon={<Eraser className="w-4 h-4" />} onClick={onClearAll}>
            {t('action.clear')}
          </Button>
        </div>
      </div>

      {/* Module pills */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {filteredTree.map((module) => {
          const Icon = module.icon;
          const isActive = module.id === activeModuleId;
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => setActiveModuleId(module.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span className="truncate">{module.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active module content */}
      <div className="mt-4 rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-5">
        {(() => {
          const activeModule = filteredTree.find((m) => m.id === activeModuleId) || filteredTree[0] || null;
          if (!activeModule) return <p className="text-sm text-slate-500">{t('userPrivilege.noPermissions')}</p>;
          return (
            <div className="flex flex-wrap gap-6">
              {activeModule.children.map((menu) => (
                <div key={menu.id} className="min-w-[210px] space-y-2">
                  <div className="text-sm font-semibold text-sky-700 border-b border-sky-100 pb-1">{menu.label}</div>
                  <div className="space-y-1.5 pt-1">
                    {menu.children.map((tab) => {
                      const tabState = getNodeState(tab, selectedIds);
                      return (
                        <div key={tab.id} className="space-y-0.5">
                          <div className="flex items-center gap-2 text-sm text-slate-800">
                            <IndeterminateCheckbox
                              checked={tabState === 'checked'}
                              indeterminate={tabState === 'indeterminate'}
                              onChange={(c) => onToggleNode(tab, c)}
                            />
                            <span className="font-medium">{tab.label}</span>
                          </div>
                          {tab.children?.length > 0 && (
                            <div className="pl-6 space-y-0.5">
                              {tab.children.map((action) => {
                                const actionChecked = getNodeState(action, selectedIds) === 'checked';
                                return (
                                  <button
                                    key={action.id}
                                    type="button"
                                    onClick={() => onToggleNode(action, !actionChecked)}
                                    className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                                      actionChecked
                                        ? 'bg-violet-50 text-violet-700 border-violet-400'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>{action.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </>
  );
}

/* ─────────────────────── Main Page ─────────────────────── */

export default function UserPrivilegePage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.ui.user);
  const tree = useMemo(() => buildPermissionTree(defaultMenuItems), []);

  /* Top tabs */
  const [activeTab, setActiveTab] = useState('users');

  /* Users CRUD modal */
  const [userModal, setUserModal] = useState({ isOpen: false, editRow: null });

  const usersLoadParams = useMemo(
    () => ({ br_id: String(currentUser?.br_id ?? 0) }),
    [currentUser?.br_id]
  );

  const openUserModal = () => (row = null) => {
    const config = CRUD_CONFIG.Users;
    if (row) {
      const editRow = config?.fromRow ? config.fromRow(row) : row;
      setUserModal({ isOpen: true, editRow });
    } else {
      setUserModal({ isOpen: true, editRow: { br_id_sp: currentUser?.br_id ?? '' } });
    }
  };
  const closeUserModal = () => setUserModal({ isOpen: false, editRow: null });

  /* ── Per-user privilege modal ── */
  const [privModal, setPrivModal] = useState({ isOpen: false, user: null });
  const [modalSearch, setModalSearch] = useState('');
  const [modalSelectedIds, setModalSelectedIds] = useState(() => new Set());
  const [modalActiveModuleId, setModalActiveModuleId] = useState(tree[0]?.id || '');
  const [savingPriv, setSavingPriv] = useState(false);
  const [userOptions, setUserOptions] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadUsersForPicker = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetchSelectOptions('Users', 500, '', { br_id: String(currentUser?.br_id ?? 0) });
      const rows = res?.data ?? res?.rows ?? [];
      const opts = rows.map((r) => ({
        value: String(r.usr_id ?? r.id ?? ''),
        label: String(r.username ?? r.p_name ?? r.usr_id ?? ''),
      }));
      const map = {};
      rows.forEach((r) => { map[String(r.usr_id ?? r.id ?? '')] = r; });
      setUserOptions(opts);
      setUsersById(map);
    } catch {
      setUserOptions([]);
      setUsersById({});
    } finally {
      setLoadingUsers(false);
    }
  };

  const openPrivModal = () => {
    setModalSelectedIds(new Set());
    setModalActiveModuleId(tree[0]?.id || '');
    setModalSearch('');
    setPrivModal({ isOpen: true, user: null });
    loadUsersForPicker();
  };
  const closePrivModal = () => setPrivModal({ isOpen: false, user: null });

  const handleModalUserChange = (e) => {
    const userId = e?.target?.value ?? '';
    if (!userId) {
      setPrivModal((p) => ({ ...p, user: null }));
      setModalSelectedIds(new Set());
      return;
    }
    const row = usersById[userId];
    if (!row) return;
    let priv = row.privalage;
    if (typeof priv === 'string') {
      try { priv = JSON.parse(priv); } catch { priv = []; }
    }
    setModalSelectedIds(deserializeUserPrivalage(priv));
    setModalActiveModuleId(tree[0]?.id || '');
    setPrivModal((p) => ({ ...p, user: row }));
  };

  const handleModalToggleNode = (node, checked) => {
    setModalSelectedIds((prev) => {
      const next = new Set(prev);
      const stack = [node];
      while (stack.length) {
        const cur = stack.pop();
        if (!cur) continue;
        if (checked) next.add(cur.id);
        else next.delete(cur.id);
        cur.children?.forEach((c) => stack.push(c));
      }
      return next;
    });
  };
  const modalSelectAll = () => setModalSelectedIds(new Set(flattenNodes(tree).map((n) => n.id)));
  const modalClearAll = () => setModalSelectedIds(new Set());

  const handleSavePriv = async () => {
    if (!privModal.user?.usr_id) return;
    const payload = serializePrivilege(tree, modalSelectedIds);
    setSavingPriv(true);
    try {
      const result = await crud({
        operation: 'update',
        fn: 'user_privilege_sp',
        params: {
          usr_id_sp: String(privModal.user.usr_id),
          privalage_sp: JSON.stringify(payload),
        },
      });
      await swalSuccess(t('swal.titles.success'), result?.message || '');
      closePrivModal();
      const entity = store.getState().data.entities?.Users ?? {};
      dispatch(loadData({
        queryName: 'Users',
        page: entity.currentPage ?? 1,
        limit: entity.itemsPerPage ?? 10,
        search: entity.searchQuery ?? '',
        br_id: String(currentUser?.br_id ?? 0),
      }));
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || t('userPrivilege.saveFailed'));
    } finally {
      setSavingPriv(false);
    }
  };

  /* ── Privileges tab (global / reference) ── */
  const [tabSearch, setTabSearch] = useState('');
  const [tabSelectedIds, setTabSelectedIds] = useState(() => new Set());
  const [tabActiveModuleId, setTabActiveModuleId] = useState(tree[0]?.id || '');

  const handleTabToggleNode = (node, checked) => {
    setTabSelectedIds((prev) => {
      const next = new Set(prev);
      const stack = [node];
      while (stack.length) {
        const cur = stack.pop();
        if (!cur) continue;
        if (checked) next.add(cur.id);
        else next.delete(cur.id);
        cur.children?.forEach((c) => stack.push(c));
      }
      return next;
    });
  };
  const tabSelectAll = () => setTabSelectedIds(new Set(flattenNodes(tree).map((n) => n.id)));
  const tabClearAll = () => setTabSelectedIds(new Set());
  const handleTabSave = () => {
    // Placeholder — tab view is for reference/admin
  };

  /* Toolbar: User Privileges button (replaces per-row shield) */
  const renderExtraHeaderActions = (
    <Button
      size="sm"
      variant="primary"
      leftIcon={<ShieldCheck className="w-4 h-4" />}
      onClick={openPrivModal}
    >
      {t('userPrivilege.userPrivileges')}
    </Button>
  );

  const topTabs = [
    { id: 'users', label: t('userPrivilege.tabs.users'), icon: UsersIcon },
    { id: 'privileges', label: t('userPrivilege.tabs.privileges'), icon: ShieldCheck },
  ];

  return (
    <div className="space-y-4 min-w-0">
      <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm shadow-slate-200/60 dark:shadow-slate-900/40">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="relative px-5 py-5 bg-white dark:bg-slate-800/80 border-b border-slate-200/70 dark:border-slate-700/70">
          <Tabs tabs={topTabs} activeTab={activeTab} onTabChange={setActiveTab} className="w-full" />
        </div>

        <div className="px-3 pb-4 pt-2">
          <AnimatePresence mode="wait">
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <EntityTab
                  entityKey="Users"
                  modalKey="Users"
                  icon={UsersIcon}
                  hiddenColumns={['p_id', 'br_id', 'password', 'privalage']}
                  loadButtons={[
                    { id: 'Users', label: t('userPrivilege.showUsers'), icon: Database },
                    { id: 'addNew', label: t('userPrivilege.addNew'), icon: Plus, modalKey: 'Users' },
                  ]}
                  dispatch={dispatch}
                  onEdit={openUserModal}
                  extraHeaderActions={renderExtraHeaderActions}
                  extraLoadParams={usersLoadParams}
                />
              </motion.div>
            )}

            {activeTab === 'privileges' && (
              <motion.div
                key="privileges"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="px-2 py-2"
              >
                <PermissionTreePanel
                  tree={tree}
                  search={tabSearch}
                  setSearch={setTabSearch}
                  selectedIds={tabSelectedIds}
                  onToggleNode={handleTabToggleNode}
                  onSelectAll={tabSelectAll}
                  onClearAll={tabClearAll}
                  activeModuleId={tabActiveModuleId}
                  setActiveModuleId={setTabActiveModuleId}
                />

                <div className="mt-4 flex justify-end">
                  <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleTabSave}>
                    {t('userPrivilege.savePrivileges')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* User create/edit modal */}
      <CrudModal
        isOpen={userModal.isOpen}
        onClose={closeUserModal}
        config={CRUD_CONFIG.Users}
        initialForm={userModal.editRow || {}}
        mode={userModal.editRow?.id ? 'update' : 'insert'}
        onSuccess={() => {
          const entity = store.getState().data.entities?.Users ?? {};
          dispatch(loadData({
            queryName: 'Users',
            page: entity.currentPage ?? 1,
            limit: entity.itemsPerPage ?? 10,
            search: entity.searchQuery ?? '',
            br_id: String(currentUser?.br_id ?? 0),
          }));
        }}
      />

      {/* User Privileges modal (opened via toolbar button) */}
      <Modal
        isOpen={privModal.isOpen}
        onClose={closePrivModal}
        title={privModal.user ? t('userPrivilege.formTitleWith', { user: privModal.user.username }) : t('userPrivilege.formTitle')}
        size="xl"
        className="max-w-5xl"
        bodyClassName="space-y-4 bg-gradient-to-b from-slate-50 via-white to-slate-50"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closePrivModal}>
              {t('common.close')}
            </Button>
            <Button
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSavePriv}
              disabled={savingPriv || !privModal.user}
            >
              {savingPriv ? t('action.updating') : t('common.save')}
            </Button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('select.user')}</label>
          <Select2
            name="privUser"
            value={privModal.user ? String(privModal.user.usr_id) : ''}
            onChange={handleModalUserChange}
            options={userOptions}
            placeholder={loadingUsers ? t('select.loadingUsers') : t('select.user')}
            isDisabled={loadingUsers}
          />
        </div>

        {privModal.user && (
          <PermissionTreePanel
            tree={tree}
            search={modalSearch}
            setSearch={setModalSearch}
            selectedIds={modalSelectedIds}
            onToggleNode={handleModalToggleNode}
            onSelectAll={modalSelectAll}
            onClearAll={modalClearAll}
            activeModuleId={modalActiveModuleId}
            setActiveModuleId={setModalActiveModuleId}
          />
        )}
      </Modal>
    </div>
  );
}
