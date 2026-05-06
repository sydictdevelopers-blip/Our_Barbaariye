/**
 * useTabsForPath — pulls the tabs for a sidebar path and filters them
 * (and their loadButtons) by the logged-in user's privalage. Drop-in
 * replacement for `getTabsForPath` inside React components: same return
 * shape, just with un-permitted tabs/buttons removed.
 *
 * Admins (user_type === 'Admin') see everything regardless of the
 * privalage tree, so a freshly-created admin doesn't get an empty UI.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { defaultMenuItems, getTabsForPath } from '../config/menuConfig';
import { deserializePrivilege, filterTabs, findMenuIdsForPath } from './privilege';

export function useTabsForPath(path) {
  const privalage = useSelector((s) => s.ui.user?.privalage);
  const userType = useSelector((s) => s.ui.user?.user_type);

  return useMemo(() => {
    const tabs = getTabsForPath(path);
    if (!Array.isArray(tabs) || tabs.length === 0) return tabs;
    const ids = findMenuIdsForPath(defaultMenuItems, path);
    if (!ids?.moduleId || !ids?.menuId) return tabs;
    const allowed = deserializePrivilege(privalage);
    return filterTabs(tabs, ids.moduleId, ids.menuId, allowed, userType);
  }, [path, privalage, userType]);
}
