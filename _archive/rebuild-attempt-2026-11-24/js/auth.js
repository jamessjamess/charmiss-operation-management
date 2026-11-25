/* auth.js — CR-01 · SSO Demo profiles, page access and function permissions for Charmiss Operations Management.
   Prototype only: the profile is chosen in the top bar and kept in localStorage (no real login — PROD-01).
   Rules:
   - A page not in profile.pages is hidden from the menu AND refused when opened by link (page gate).
   - profile.scope = 'MT' | 'TT' | 'ECOM' locks the Supply channel filter to that department (no data from other departments).
   - Supply pages are read-only: no profile can reserve / deduct quota or change WMS from them. */
(function (global) {
  'use strict';

  // ---- menu groups (ids used by the router) ----
  const OPS = ['home', 'orders', 'ecommerce', 'customers', 'catalog', 'stockquota', 'partners', 'so', 'workqueue', 'documents', 'reports', 'access', 'audit', 'returns'];
  const SUPPLY = ['overview', 'stock', 'expiry', 'consign', 'calendar', 'replen', 'quota', 'proposals', 'report'];
  const SETUP = ['data'];

  // ---- function permissions (Supply part; Ops function permissions arrive with the Ops modules in Phase 2) ----
  const SUPPLY_PERMS = ['supply.view', 'supply.export', 'supply.comment', 'supply.propose', 'supply.approve.recall', 'supply.approve.quota', 'supply.approve.po', 'supply.settings', 'supply.import'];

  const ALL_OPS = OPS.slice();
  const SALES_OPS = ['home', 'orders', 'customers', 'catalog', 'stockquota', 'partners', 'so', 'workqueue', 'documents', 'reports', 'audit', 'returns'];
  const SA_OPS_MTTT = ['home', 'orders', 'customers', 'catalog', 'stockquota', 'so', 'workqueue', 'returns'];
  const SA_OPS_ECOM = ['home', 'orders', 'ecommerce', 'customers', 'catalog', 'stockquota', 'workqueue', 'returns'];
  const MGR_SUPPLY = ['overview', 'stock', 'expiry', 'calendar', 'quota', 'proposals', 'report'];

  const PROFILES = [
    { id: 'director', th: 'Director', en: 'Director', role: 'director', scope: null,
      pages: ALL_OPS.concat(SUPPLY), perms: ['supply.view', 'supply.export', 'supply.approve.recall', 'supply.approve.quota', 'supply.approve.po'] },
    { id: 'mgr-mt', th: 'Manager · MT', en: 'Manager · MT', role: 'manager', scope: 'MT',
      pages: SALES_OPS.concat(MGR_SUPPLY, ['consign']), perms: ['supply.view', 'supply.export', 'supply.approve.quota', 'supply.approve.recall'] },
    { id: 'mgr-tt', th: 'Manager · TT', en: 'Manager · TT', role: 'manager', scope: 'TT',
      pages: SALES_OPS.concat(MGR_SUPPLY), perms: ['supply.view', 'supply.export', 'supply.approve.quota'] },
    { id: 'mgr-ecom', th: 'Manager · Ecom', en: 'Manager · Ecom', role: 'manager', scope: 'ECOM',
      pages: SALES_OPS.filter(p => p !== 'so').concat(['ecommerce'], MGR_SUPPLY), perms: ['supply.view', 'supply.export', 'supply.approve.quota'] },
    { id: 'sa-mt', th: 'Sales Admin · MT', en: 'Sales Admin · MT', role: 'sales_admin', scope: 'MT', pages: SA_OPS_MTTT, perms: [] },
    { id: 'sa-tt', th: 'Sales Admin · TT', en: 'Sales Admin · TT', role: 'sales_admin', scope: 'TT', pages: SA_OPS_MTTT, perms: [] },
    { id: 'sa-ecom', th: 'Sales Admin · Ecom', en: 'Sales Admin · Ecom', role: 'sales_admin', scope: 'ECOM', pages: SA_OPS_ECOM, perms: [] },
    { id: 'planner', th: 'Supply Chain Planner', en: 'Supply Chain Planner', role: 'planner', scope: null,
      pages: ['home', 'catalog', 'stockquota', 'partners', 'workqueue', 'reports', 'returns'].concat(SUPPLY, SETUP),
      perms: ['supply.view', 'supply.export', 'supply.comment', 'supply.propose', 'supply.settings', 'supply.import'] },
    { id: 'admin', th: 'Admin', en: 'Admin', role: 'admin', scope: null,
      pages: ALL_OPS.concat(SETUP), perms: ['supply.view', 'supply.settings', 'supply.import'] },
    { id: 'finance', th: 'ERP / Finance', en: 'ERP / Finance', role: 'erp', scope: null,
      pages: ['home', 'orders', 'documents', 'workqueue', 'reports', 'returns', 'audit', 'calendar', 'report'], perms: ['supply.view'] },
    { id: 'warehouse', th: 'Warehouse', en: 'Warehouse', role: 'warehouse', scope: null,
      pages: ['home', 'stockquota', 'workqueue', 'documents', 'reports', 'returns', 'calendar', 'expiry'], perms: ['supply.view'] }
  ];
  const BY_ID = Object.fromEntries(PROFILES.map(p => [p.id, p]));

  function load() { try { return BY_ID[localStorage.getItem('opm.profile')] ? localStorage.getItem('opm.profile') : 'director'; } catch (e) { return 'director'; } }
  let cur = load();

  const Auth = {
    OPS, SUPPLY, SETUP, SUPPLY_PERMS, PROFILES,
    get profile() { return BY_ID[cur]; },
    set(id) { if (!BY_ID[id]) return; cur = id; try { localStorage.setItem('opm.profile', id); } catch (e) { /* kept for this visit */ } },
    name(p) { p = p || BY_ID[cur]; return I18N.lang === 'en' ? p.en : p.th; },
    canPage(id) { return BY_ID[cur].pages.includes(id); },
    can(perm) { return BY_ID[cur].perms.includes(perm); },
    /** 'MT' | 'TT' | 'ECOM' | null — the Supply channel filter is locked to this. */
    get scope() { return BY_ID[cur].scope; },
    group(id) { return OPS.includes(id) ? 'ops' : SUPPLY.includes(id) ? 'supply' : SETUP.includes(id) ? 'setup' : null; },
    isSupplyPage(id) { return SUPPLY.includes(id) || SETUP.includes(id); },
    firstPage() { return BY_ID[cur].pages[0] || 'home'; },
    initials(p) { p = p || BY_ID[cur]; return p.en.split(/[\s·]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
  };
  global.Auth = Auth;
})(window);
