/**
 * Privilege filtering — turns the raw `privalage` JSONB stored on user_branch
 * into Sidebar / Tab / Button gating for the UI. NOT a security boundary:
 * the backend's requireAuth + per-endpoint checks are. This only controls
 * what the UI offers a given user.
 *
 * Storage shape (login_check / users_show):
 *   [
 *     { menuId: 'academic',
 *       children: [
 *         { id: 'AcademicSetup',
 *           tabs: [ { id: 'ClassSetup', buttons: ['ClassSetup','addNew'] } ] }
 *       ] }
 *   ]
 *
 * users_show wraps a per-user value in another array (jsonb_agg), so the
 * normaliser handles both [..] and [[..]] without callers caring.
 */

const ALWAYS_VISIBLE_MENU_IDS = new Set(['dashboard']);
const ADMIN_ONLY_MENU_IDS = new Set(['userPrivilege', 'moduleVideos']);

/** Flatten the privalage value to a single array of module entries. */
function normalisePrivalage(priv) {
  if (!Array.isArray(priv)) return [];
  if (priv.length === 0) return [];
  // Detect nested form (jsonb_agg from users_show): take first inner array
  // that actually contains module entries.
  if (Array.isArray(priv[0]) && priv.every((v) => Array.isArray(v))) {
    return priv.flat().filter((m) => m && typeof m === 'object');
  }
  return priv.filter((m) => m && typeof m === 'object');
}

/** Build a Set of allowed ids from the privalage tree. Ids match
 *  buildPermissionTree in UserPrivilegePage so admins see the same shape
 *  they configured. */
export function deserializePrivilege(priv) {
  const ids = new Set();
  for (const mod of normalisePrivalage(priv)) {
    const m = mod.menuId;
    if (!m) continue;
    ids.add(`module:${m}`);
    for (const menu of mod.children || []) {
      const mn = menu.id;
      if (!mn) continue;
      ids.add(`menu:${m}/${mn}`);
      for (const tab of menu.tabs || []) {
        const t = tab.id;
        if (!t) continue;
        ids.add(`tab:${m}/${mn}/${t}`);
        for (const btn of tab.buttons || []) {
          ids.add(`action:${m}/${mn}/${t}/${btn}`);
        }
      }
    }
  }
  return ids;
}

function isAdmin(userType) {
  return String(userType || '').trim().toLowerCase() === 'admin';
}

/**
 * Visibility rules — privalage is enforced for every user (including Admin)
 * so admins can scope themselves to a subset of menus when they save their
 * own privilege tree. Two safety nets keep an admin from locking themselves
 * out:
 *   1. dashboard is always visible to everyone.
 *   2. userPrivilege + moduleVideos are always visible to admins, regardless
 *      of what their privalage tree says — they can't lose access to the
 *      tools that let them edit privileges.
 *
 * Non-admins can never see ADMIN_ONLY menus, even if their privalage
 * mistakenly references them.
 */
export function canSeeModule(moduleId, allowedIds, userType) {
  if (ALWAYS_VISIBLE_MENU_IDS.has(moduleId)) return true;
  if (ADMIN_ONLY_MENU_IDS.has(moduleId)) return isAdmin(userType);
  return allowedIds.has(`module:${moduleId}`);
}

export function canSeeMenu(moduleId, menuId, allowedIds) {
  return allowedIds.has(`menu:${moduleId}/${menuId}`);
}

export function canSeeTab(moduleId, menuId, tabId, allowedIds) {
  return allowedIds.has(`tab:${moduleId}/${menuId}/${tabId}`);
}

export function canDoAction(moduleId, menuId, tabId, actionId, allowedIds) {
  return allowedIds.has(`action:${moduleId}/${menuId}/${tabId}/${actionId}`);
}

/** Filter the full menu tree for a user. Returns a new array (does not
 *  mutate). Modules with no surviving children are dropped — except those
 *  that are flat single-page links (no children/tabs to begin with). */
export function filterMenuByPrivilege(menuItems, allowedIds, userType) {
  const out = [];
  for (const mod of menuItems || []) {
    if (!mod) continue;
    if (!canSeeModule(mod.id, allowedIds, userType)) continue;

    // Flat link (e.g. dashboard, userPrivilege, moduleVideos)
    if (!mod.children) {
      out.push(mod);
      continue;
    }

    // Module with children → filter children + their tabs
    const children = [];
    for (const menu of mod.children) {
      if (!menu) continue;
      if (!canSeeMenu(mod.id, menu.id, allowedIds)) continue;

      let tabs = menu.tabs;
      if (Array.isArray(tabs)) {
        tabs = tabs
          .filter((tab) => canSeeTab(mod.id, menu.id, tab.id, allowedIds))
          .map((tab) => {
            if (!Array.isArray(tab.loadButtons)) return tab;
            return {
              ...tab,
              loadButtons: tab.loadButtons.filter((btn) =>
                canDoAction(mod.id, menu.id, tab.id, btn.id, allowedIds)
              ),
            };
          });
      }

      // Drop a menu entry that lost all its tabs (would render an empty page).
      if (Array.isArray(tabs) && tabs.length === 0 && Array.isArray(menu.tabs) && menu.tabs.length > 0) {
        continue;
      }
      children.push(tabs === menu.tabs ? menu : { ...menu, tabs });
    }
    if (children.length === 0) continue;
    out.push({ ...mod, children });
  }
  return out;
}

/** Filter just the tabs array for a given menuId+moduleId. Used by tab
 *  pages (AcademicSetup etc.) that consume getTabsForPath. */
export function filterTabs(tabs, moduleId, menuId, allowedIds /* userType reserved */) {
  if (!Array.isArray(tabs)) return tabs;
  return tabs
    .filter((tab) => canSeeTab(moduleId, menuId, tab.id, allowedIds))
    .map((tab) => {
      if (!Array.isArray(tab.loadButtons)) return tab;
      return {
        ...tab,
        loadButtons: tab.loadButtons.filter((btn) =>
          canDoAction(moduleId, menuId, tab.id, btn.id, allowedIds)
        ),
      };
    });
}

/** Walks the menu tree and returns { moduleId, menuId } for the page at
 *  this path. Tabs live one level deep (top → children → tabs), so the
 *  search only needs two levels. Returns null if the path isn't on a
 *  tabbed menu page. */
export function findMenuIdsForPath(menuItems, path) {
  for (const top of menuItems || []) {
    if (!top) continue;
    if (top.path === path) return { moduleId: top.id, menuId: null };
    for (const menu of top.children || []) {
      if (menu?.path === path) return { moduleId: top.id, menuId: menu.id };
    }
  }
  return null;
}
