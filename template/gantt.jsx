// Gantt — WBS-driven, fully editable.
// 데이터는 window.__GANTT_DATA__ (외부 data.js)에서 우선 로드,
// 없으면 아래 내장 기본값 사용.
const { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } = React;

// ================================================================
// ▼▼▼  내장 기본 데이터 — 외부 data.js 없을 때만 사용됨  ▼▼▼
//       (data.js 사용 시 이 블록은 무시됩니다)
// ================================================================
const PROJECT_CONFIG = window.__GANTT_DATA__ || (function() {
  const _Y = 2026;
  const _d = (m, day) => new Date(_Y, m - 1, day);
  return {
  // ── 제목 ──────────────────────────────────────────────────────
  pageTitle:   "Micro Restaurant V2 — Build Schedule",
  headerRight: "Build Schedule · Hardware Ops",
  subtitle:    "Micro Restaurant V2 · MVP build",
  wbsPrefix:   "Cooking · Rice · Fridge",   // h1 왼쪽
  wbsSuffix:   "WBS Schedule",              // h1 오른쪽 (— 사이)

  // ── 날짜 ──────────────────────────────────────────────────────
  projectStart: new Date(_Y, 3, 6),   // Apr 6
  projectEnd:   new Date(_Y, 6, 19),  // Jul 19
  today:        new Date(_Y, 4, 26),  // null 로 바꾸면 실제 오늘 날짜 사용

  // ── 저장소 키 (프로젝트마다 고유하게) ─────────────────────────
  storageKey: "mr-v2-gantt-state-v1",

  // ── 팀 ────────────────────────────────────────────────────────
  teams: [
    { id: "RND", name: "R&D", members: ["KE", "RI", "LI", "SE"] },
    { id: "ENG", name: "ENG", members: ["CH", "IL", "AA", "JA", "72", "JH", "LU", "NO"] },
  ],

  // ── 팀원 ──────────────────────────────────────────────────────
  owners: {
    KE: { name: "Kevin",   team: "RND", role: "Tech Lead",   tint: "var(--accent)" },
    RI: { name: "Ricky",   team: "RND", role: "ME Designer", tint: "var(--rose)"   },
    LI: { name: "Liberto", team: "RND", role: "PM",          tint: "var(--olive)"  },
    SE: { name: "Seungho", team: "RND", role: "Research",    tint: "var(--plum)"   },
    CH: { name: "Changsu", team: "ENG", role: "Eng Lead",    tint: "var(--slate)"  },
    IL: { name: "Ilje",    team: "ENG", role: "EE",          tint: "var(--clay)"   },
    AA: { name: "Aaron",   team: "ENG", role: "Test",        tint: "var(--olive)"  },
    JA: { name: "James",   team: "ENG", role: "Systems",     tint: "var(--slate)"  },
    "72": { name: "72",    team: "ENG", role: "Procure",     tint: "var(--plum)"   },
    JH: { name: "Jaehun", team: "ENG", role: "Test",        tint: "var(--rose)"   },
    LU: { name: "Lucio",  team: "ENG", role: "Test",        tint: "var(--accent)" },
    NO: { name: "Noah",   team: "ENG", role: "QA",          tint: "var(--clay)"   },
  },

  // ── 루트 모듈 (WBS 1단계 항목 색상) ───────────────────────────
  roots: {
    "1": { name: "Layout Drawing", color: "var(--slate)"  },
    "2": { name: "BOM",            color: "var(--clay)"   },
    "3": { name: "Cooking Module", color: "var(--accent)" },
    "4": { name: "Rice Module",    color: "var(--olive)"  },
    "5": { name: "Fridge Module",  color: "var(--plum)"   },
  },

  // ── WBS 초기 데이터 ────────────────────────────────────────────
  // level: 1=루트, 2=서브, 3=리프 | pct: 0-100 | deps: 선행 태스크 id 배열
  initialWBS: [
    { id: "i1", level: 1, name: "Layout Drawing", owner: "KE", start: _d(4, 6),  end: _d(4, 17), pct: 100 },
    { id: "i2", level: 1, name: "BOM",            owner: "LI", start: _d(4, 13), end: _d(4, 24), pct: 100 },

    { id: "i3",     level: 1, name: "Cooking Module" },
    { id: "i3_1",   level: 2, name: "Module concept",           owner: "KE", start: _d(4, 20), end: _d(5, 1),  pct: 100 },
    { id: "i3_2",   level: 2, name: "I.H Unit" },
    { id: "i3_2_1", level: 3, name: "H/W 개발",                 owner: "CH", start: _d(5, 4),  end: _d(6, 5),  pct: 75,  deps: ["i3_2_2"] },
    { id: "i3_2_2", level: 3, name: "Unit Concept",             owner: "KE", start: _d(4, 27), end: _d(5, 8),  pct: 100 },
    { id: "i3_2_3", level: 3, name: "3D 모델링",                 owner: "RI", start: _d(5, 4),  end: _d(5, 22), pct: 100, deps: ["i3_2_2"] },
    { id: "i3_2_4", level: 3, name: "부품도 작성",               owner: "RI", start: _d(5, 18), end: _d(5, 29), pct: 70,  deps: ["i3_2_3"] },
    { id: "i3_2_5", level: 3, name: "발주 및 입고",             owner: "LI", start: _d(5, 25), end: _d(6, 12), pct: 15,  deps: ["i3_2_4"] },
    { id: "i3_2_6", level: 3, name: "유닛 개별 테스트 및 보완", owner: "AA", start: _d(6, 8),  end: _d(6, 26), pct: 0,   deps: ["i3_2_5"] },
    { id: "i3_3",   level: 2, name: "Cooking Frame" },
    { id: "i3_3_1", level: 3, name: "3D 모델링",                 owner: "RI", start: _d(5, 4),  end: _d(5, 22), pct: 100 },
    { id: "i3_3_2", level: 3, name: "부품도 작성",               owner: "RI", start: _d(5, 18), end: _d(6, 1),  pct: 60,  deps: ["i3_3_1"] },
    { id: "i3_3_3", level: 3, name: "발주 및 입고",             owner: "LI", start: _d(5, 25), end: _d(6, 12), pct: 15,  deps: ["i3_3_2"] },
    { id: "i3_4",   level: 2, name: "모듈 조립 및 배선 작업",   owner: "IL", start: _d(6, 19), end: _d(7, 3),  pct: 0,   deps: ["i3_2_6", "i3_3_3"] },
    { id: "i3_5",   level: 2, name: "모듈 테스트 및 보완",       owner: "JA", start: _d(6, 26), end: _d(7, 10), pct: 0,   deps: ["i3_4"] },

    { id: "i4",     level: 1, name: "Rice Module" },
    { id: "i4_1",   level: 2, name: "Module concept",           owner: "SE", start: _d(4, 27), end: _d(5, 8),  pct: 100 },
    { id: "i4_2",   level: 2, name: "M.W Unit" },
    { id: "i4_2_1", level: 3, name: "H/W 개발",                 owner: "CH", start: _d(5, 4),  end: _d(6, 5),  pct: 70,  deps: ["i4_2_2"] },
    { id: "i4_2_2", level: 3, name: "Unit Concept",             owner: "SE", start: _d(4, 27), end: _d(5, 8),  pct: 100 },
    { id: "i4_2_3", level: 3, name: "3D 모델링",                 owner: "RI", start: _d(5, 4),  end: _d(5, 29), pct: 90,  deps: ["i4_2_2"] },
    { id: "i4_2_4", level: 3, name: "부품도 작성",               owner: "RI", start: _d(5, 20), end: _d(6, 5),  pct: 55,  deps: ["i4_2_3"] },
    { id: "i4_2_5", level: 3, name: "발주 및 입고",             owner: "72", start: _d(6, 1),  end: _d(6, 19), pct: 0,   deps: ["i4_2_4"] },
    { id: "i4_2_6", level: 3, name: "유닛 개별 테스트 및 보완", owner: "JH", start: _d(6, 15), end: _d(7, 3),  pct: 0,   deps: ["i4_2_5"] },
    { id: "i4_3",   level: 2, name: "Storage Unit" },
    { id: "i4_3_1", level: 3, name: "3D 모델링",                 owner: "RI", start: _d(5, 11), end: _d(5, 29), pct: 85 },
    { id: "i4_3_2", level: 3, name: "부품도 작성",               owner: "RI", start: _d(5, 22), end: _d(6, 5),  pct: 40,  deps: ["i4_3_1"] },
    { id: "i4_3_3", level: 3, name: "발주 및 입고",             owner: "72", start: _d(6, 1),  end: _d(6, 19), pct: 0,   deps: ["i4_3_2"] },
    { id: "i4_3_4", level: 3, name: "유닛 개별 테스트 및 보완", owner: "LU", start: _d(6, 15), end: _d(7, 3),  pct: 0,   deps: ["i4_3_3"] },
    { id: "i4_4",   level: 2, name: "Rice Pick_Place Unit" },
    { id: "i4_4_1", level: 3, name: "3D 모델링",                 owner: "RI", start: _d(5, 11), end: _d(6, 1),  pct: 75 },
    { id: "i4_4_2", level: 3, name: "부품도 작성",               owner: "RI", start: _d(5, 25), end: _d(6, 12), pct: 15,  deps: ["i4_4_1"] },
    { id: "i4_4_3", level: 3, name: "발주 및 입고",             owner: "LI", start: _d(6, 8),  end: _d(6, 22), pct: 0,   deps: ["i4_4_2"] },
    { id: "i4_4_4", level: 3, name: "유닛 개별 테스트 및 보완", owner: "AA", start: _d(6, 19), end: _d(7, 6),  pct: 0,   deps: ["i4_4_3"] },
    { id: "i4_5",   level: 2, name: "모듈 조립 및 배선 작업",   owner: "IL", start: _d(6, 26), end: _d(7, 10), pct: 0,   deps: ["i4_2_6", "i4_3_4", "i4_4_4"] },
    { id: "i4_6",   level: 2, name: "모듈 테스트 및 보완",       owner: "NO", start: _d(7, 6),  end: _d(7, 17), pct: 0,   deps: ["i4_5"] },

    { id: "i5",     level: 1, name: "Fridge Module" },
    { id: "i5_1",   level: 2, name: "Module concept",           owner: "KE", start: _d(5, 4),  end: _d(5, 15), pct: 100 },
    { id: "i5_2",   level: 2, name: "Fridge Frame" },
    { id: "i5_2_1", level: 3, name: "3D 모델링",                 owner: "RI", start: _d(5, 11), end: _d(5, 29), pct: 80 },
    { id: "i5_2_2", level: 3, name: "부품도 작성",               owner: "RI", start: _d(5, 22), end: _d(6, 5),  pct: 35,  deps: ["i5_2_1"] },
    { id: "i5_2_3", level: 3, name: "발주 및 입고",             owner: "LI", start: _d(6, 1),  end: _d(6, 19), pct: 0,   deps: ["i5_2_2"] },
    { id: "i5_3",   level: 2, name: "Pouch Cartridge" },
    { id: "i5_3_1", level: 3, name: "3D 모델링",                 owner: "RI", start: _d(5, 18), end: _d(6, 5),  pct: 50 },
    { id: "i5_3_2", level: 3, name: "부품도 작성",               owner: "RI", start: _d(5, 29), end: _d(6, 12), pct: 15,  deps: ["i5_3_1"] },
    { id: "i5_3_3", level: 3, name: "발주 및 입고",             owner: "72", start: _d(6, 8),  end: _d(6, 22), pct: 0,   deps: ["i5_3_2"] },
    { id: "i5_3_4", level: 3, name: "유닛 개별 테스트 및 보완", owner: "JH", start: _d(6, 19), end: _d(7, 3),  pct: 0,   deps: ["i5_3_3"] },
    { id: "i5_4",   level: 2, name: "Pouch Cartridge (확장)",   owner: "LU", start: _d(6, 8),  end: _d(7, 3),  pct: 0 },
  ],

  // ── 푸터 주요 마일스톤 ─────────────────────────────────────────
  criticalDates: [
    { label: "BOM lock",               date: "Apr 24", accent: true  },
    { label: "I.H Unit 부품도 완료",   date: "May 29", accent: false },
    { label: "모든 유닛 입고 완료",   date: "Jun 22", accent: false },
    { label: "Cooking 모듈 조립 시작", date: "Jun 19", accent: true  },
    { label: "모듈 테스트 완료",       date: "Jul 17", accent: true  },
  ],
  };
})();

// ================================================================
// ── 엔진 코드 (수정 불필요) ─────────────────────────────────────
// ================================================================

const PROJECT_START = PROJECT_CONFIG.projectStart;
const PROJECT_END   = PROJECT_CONFIG.projectEnd;
const TODAY         = PROJECT_CONFIG.today || new Date();
const d             = _d;   // 하위 호환 유지
const TEAMS         = PROJECT_CONFIG.teams;
const OWNERS        = PROJECT_CONFIG.owners;
const ROOTS         = PROJECT_CONFIG.roots;
const INITIAL_WBS   = PROJECT_CONFIG.initialWBS;
const STORAGE_KEY   = PROJECT_CONFIG.storageKey;


// ---------- helpers ----------
const DAY = 86400000;
const dayDiff = (a, b) => Math.round((b - a) / DAY);
const totalDays = dayDiff(PROJECT_START, PROJECT_END);
const addDays = (dt, n) => new Date(dt.getTime() + n * DAY);
const sameDay = (a, b) => a.getTime() === b.getTime();
const monthName = (m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m];
const fmtDate = (dt) => `${monthName(dt.getMonth())} ${dt.getDate()}`;
const fmtLong = (dt) => `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()]}, ${monthName(dt.getMonth())} ${dt.getDate()}`;

function isoWeek(dt) {
  const t = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const dn = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dn);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / DAY + 1) / 7);
}

// Derive WBS codes from flat list of items (each with .level).
// Returns new array; each item gets a `code` field.
function deriveCodes(items) {
  const c = [0, 0, 0, 0]; // 1-indexed, allow up to level 3
  return items.map((it) => {
    const lvl = it.level;
    c[lvl] = (c[lvl] || 0) + 1;
    for (let k = lvl + 1; k <= 3; k++) c[k] = 0;
    const parts = [];
    for (let k = 1; k <= lvl; k++) parts.push(c[k] || 0);
    return { ...it, code: parts.join(".") };
  });
}

// Range [start, end] (inclusive) of subtree starting at idx in items.
function subtreeRange(items, idx) {
  const base = items[idx].level;
  let end = idx;
  while (end + 1 < items.length && items[end + 1].level > base) end++;
  return [idx, end];
}

// Determine parent id of item at index in items (looks backwards for first item with smaller level).
function parentOf(items, idx) {
  const lvl = items[idx].level;
  for (let i = idx - 1; i >= 0; i--) {
    if (items[i].level < lvl) return items[i].id;
  }
  return null;
}

// Aggregate min/max/avg pct for a summary's leaves.
function aggregateSummary(items, idx) {
  const [start, end] = subtreeRange(items, idx);
  const leaves = [];
  for (let i = start + 1; i <= end; i++) {
    if (!hasChildrenAfter(items, i)) leaves.push(items[i]);
  }
  if (!leaves.length) return null;
  const minStart = leaves.reduce((m, l) => l.start < m ? l.start : m, leaves[0].start);
  const maxEnd = leaves.reduce((m, l) => l.end > m ? l.end : m, leaves[0].end);
  const totalD = leaves.reduce((s, l) => s + Math.max(1, dayDiff(l.start, l.end)), 0);
  const weighted = leaves.reduce((s, l) => s + Math.max(1, dayDiff(l.start, l.end)) * l.pct, 0);
  return { start: minStart, end: maxEnd, pct: Math.round(weighted / totalD), leafCount: leaves.length };
}

function hasChildrenAfter(items, idx) {
  return idx + 1 < items.length && items[idx + 1].level > items[idx].level;
}

// Translate a visible-list gap index → items array insertion index.
// Gap g means "insert before visibleRows[g]" (or at end if g === visibleRows.length).
// The corresponding items index is: end of previous row's subtree + 1.
function visibleGapToItemsIndex(items, visibleRows, gIdx) {
  if (gIdx <= 0) return 0;
  if (gIdx > visibleRows.length) gIdx = visibleRows.length;
  const prev = visibleRows[gIdx - 1];
  if (!prev) return items.length;
  const prevItemsIdx = items.findIndex((it) => it.id === prev.id);
  if (prevItemsIdx < 0) return items.length;
  const [, end] = subtreeRange(items, prevItemsIdx);
  return end + 1;
}

// Color & name for a top-level WBS code, with a fallback for ad-hoc tasks (codes beyond the predefined roots).
const FALLBACK_ROOT = { name: "Custom task", color: "var(--ink-3)" };
function rootInfo(code) {
  return ROOTS[code.split(".")[0]] || FALLBACK_ROOT;
}

// ====================================================================
//                       PERSISTENCE (JSON / localStorage)
// ====================================================================
// STORAGE_KEY is set from PROJECT_CONFIG above

// Convert items array <→ JSON-safe form (Dates become ISO strings).
function serializeItems(items) {
  return items.map((it) => ({
    ...it,
    start: it.start instanceof Date ? it.start.toISOString() : it.start,
    end:   it.end   instanceof Date ? it.end.toISOString()   : it.end,
  }));
}

function deserializeItems(raw) {
  if (!Array.isArray(raw)) return null;
  return raw.map((it) => ({
    ...it,
    start: it.start ? new Date(it.start) : undefined,
    end:   it.end   ? new Date(it.end)   : undefined,
  }));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      items: deserializeItems(parsed.items),
      collapsed: parsed.collapsed || {},
      meta: parsed.meta || null,
    };
  } catch (e) {
    console.warn("Gantt: failed to load saved state", e);
    return null;
  }
}

function saveToStorage(items, collapsed, meta) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: serializeItems(items),
      collapsed,
      meta,
      _savedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn("Gantt: failed to save state", e);
  }
}

function clearStorage() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

// Download items as a JSON file.
function downloadJSON(items, collapsed, meta) {
  const data = {
    items: serializeItems(items),
    collapsed,
    meta,
    exportedAt: new Date().toISOString(),
    version: 1,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gantt-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ====================================================================
//                           APP
// ====================================================================
function App() {
  const [v, setTweak] = window.useTweaks ? window.useTweaks({
    accent: "#8a3a1f",
    zoom: "month4",
    showDeps: true,
    owner: "all"
  }) : [{ accent: "#8a3a1f", zoom: "month4", showDeps: true, owner: "all" }, () => {}];

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", v.accent);
  }, [v.accent]);

  // ------- project meta (title fields, persisted) -------
  const [meta, setMetaState] = useState(() => {
    const saved = loadFromStorage();
    return saved && saved.meta ? saved.meta : {
      subtitle:    PROJECT_CONFIG.subtitle,
      wbsPrefix:   PROJECT_CONFIG.wbsPrefix,
      wbsSuffix:   PROJECT_CONFIG.wbsSuffix,
      headerRight: PROJECT_CONFIG.headerRight,
    };
  });
  const updateMeta = useCallback((patch) => {
    setMetaState((m) => ({ ...m, ...patch }));
  }, []);

  useEffect(() => {
    document.title = `${meta.wbsPrefix} — ${meta.wbsSuffix}`;
  }, [meta.wbsPrefix, meta.wbsSuffix]);

  // Map legacy keys (density/scale) so users who saved old settings still work.
  const zoom = v.zoom || (v.density === "spacious" ? "month1" : v.density === "comfortable" ? "month4" : "month4");
  // Day width by zoom level. month1 = daily cells; month4 = weekly cells; month12 = monthly cells.
  const dayW = zoom === "month1" ? 40 : zoom === "month12" ? 5 : 14;
  const rowH = 30;

  // Visible timeline range. For 12mo, show the entire calendar year so empty months are visible.
  const viewStart = zoom === "month12" ? new Date(PROJECT_START.getFullYear(), 0, 1) : PROJECT_START;
  const viewEnd   = zoom === "month12" ? new Date(PROJECT_START.getFullYear(), 11, 31) : PROJECT_END;
  const viewTotalDays = dayDiff(viewStart, viewEnd);
  const leftW = 380;

  // ------- editable state (auto-persisted to localStorage) -------
  const [items, setItems] = useState(() => {
    const saved = loadFromStorage();
    return (saved && saved.items && saved.items.length) ? saved.items : INITIAL_WBS;
  });
  const [collapsed, setCollapsed] = useState(() => {
    const saved = loadFromStorage();
    return (saved && saved.collapsed) || {};
  });

  // Persist on every change.
  useEffect(() => { saveToStorage(items, collapsed, meta); }, [items, collapsed, meta]);

  // Export current state as a JSON file the user can keep.
  const exportJSON = useCallback(() => downloadJSON(items, collapsed, meta), [items, collapsed, meta]);

  // Import a JSON file the user picks; merge { items, collapsed }.
  const importJSON = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const nextItems = deserializeItems(parsed.items);
        if (!nextItems) throw new Error("invalid items");
        setItems(nextItems);
        setCollapsed(parsed.collapsed || {});
        if (parsed.meta) setMetaState(parsed.meta);
      } catch (err) {
        alert("Could not parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
  }, []);

  // Reset to initial data; also clears localStorage.
  const resetData = useCallback(() => {
    if (!confirm("Reset all tasks back to the initial WBS? This will discard your changes.")) return;
    clearStorage();
    setItems(INITIAL_WBS);
    setCollapsed({});
    setMetaState({
      subtitle:    PROJECT_CONFIG.subtitle,
      wbsPrefix:   PROJECT_CONFIG.wbsPrefix,
      wbsSuffix:   PROJECT_CONFIG.wbsSuffix,
      headerRight: PROJECT_CONFIG.headerRight,
    });
  }, []);

  // Derive codes from current items
  const itemsWithCodes = useMemo(() => deriveCodes(items), [items]);

  // Compute per-item summary aggregate
  const enriched = useMemo(() => {
    return itemsWithCodes.map((it, i) => {
      const isSummary = hasChildrenAfter(items, i);
      if (!isSummary) return { ...it, isSummary: false };
      const agg = aggregateSummary(items, i);
      return { ...it, isSummary: true, start: agg ? agg.start : addDays(PROJECT_START, 0), end: agg ? agg.end : addDays(PROJECT_START, 1), pct: agg ? agg.pct : 0, leafCount: agg ? agg.leafCount : 0 };
    });
  }, [items, itemsWithCodes]);

  // Visible filter: by owner (keep ancestor summaries) + by collapse (hide descendants of collapsed summaries)
  const visibleRows = useMemo(() => {
    // 1) ownership pass
    let keepIds = new Set(enriched.map((r) => r.id));
    if (v.owner !== "all") {
      const team = TEAMS.find((t) => t.id === v.owner);
      const matchOwner = team ? (o) => team.members.includes(o) : (o) => o === v.owner;
      keepIds = new Set();
      enriched.forEach((r, i) => {
        if (!r.isSummary && matchOwner(r.owner)) {
          keepIds.add(r.id);
          // add ancestors
          let lvl = r.level;
          for (let j = i - 1; j >= 0; j--) {
            if (enriched[j].level < lvl) {
              keepIds.add(enriched[j].id);
              lvl = enriched[j].level;
              if (lvl === 1) break;
            }
          }
        }
      });
    }
    // 2) collapse pass — drop descendants of collapsed summaries
    const out = [];
    let collapseAtLevel = null; // if set, drop items whose level > this
    let collapseBoundary = null;
    enriched.forEach((r) => {
      if (collapseAtLevel != null && r.level > collapseAtLevel) return; // hidden inside collapsed subtree
      if (collapseAtLevel != null && r.level <= collapseAtLevel) {
        collapseAtLevel = null;
      }
      if (!keepIds.has(r.id)) return;
      out.push(r);
      if (r.isSummary && collapsed[r.id]) collapseAtLevel = r.level;
    });
    return out;
  }, [enriched, v.owner, collapsed]);

  const rowIndex = useMemo(() => {
    const m = {};
    visibleRows.forEach((r, i) => {m[r.id] = i;});
    return m;
  }, [visibleRows]);

  const timelineW = viewTotalDays * dayW;
  const todayX = dayDiff(viewStart, TODAY) * dayW;

  const [hover, setHover] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [selectedDep, setSelectedDep] = useState(null); // {fromId, toId} or null
  const [depMenu, setDepMenu] = useState(null); // {x, y, fromId, toId}

  // ------- mutating actions -------
  const updateItem = useCallback((id, patch) => {
    setItems((items) => items.map((it) => it.id === id ? { ...it, ...patch } : it));
  }, []);

  // Move a subtree (item at fromIdx + descendants) to before targetIdx in the items array.
  // levelDelta: shift level of every item in the subtree by this amount (clamped 1..3).
  const moveSubtree = useCallback((sourceId, targetIdx, levelDelta = 0) => {
    setItems((items) => {
      const fromIdx = items.findIndex((x) => x.id === sourceId);
      if (fromIdx < 0) return items;
      const [s, e] = subtreeRange(items, fromIdx);
      const block = items.slice(s, e + 1).map((it) => ({
        ...it,
        level: Math.max(1, Math.min(3, it.level + levelDelta))
      }));
      const rest = items.slice(0, s).concat(items.slice(e + 1));
      let insertAt = targetIdx;
      if (targetIdx > e) insertAt = targetIdx - block.length;
      insertAt = Math.max(0, Math.min(rest.length, insertAt));
      return rest.slice(0, insertAt).concat(block, rest.slice(insertAt));
    });
  }, []);

  // New leaf task added at end of list, level 1.
  const addNewTask = useCallback(() => {
    const id = `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem = {
      id, level: 1, name: "New task",
      owner: "KE",
      start: addDays(TODAY, 1),
      end: addDays(TODAY, 8),
      pct: 0
    };
    setItems((items) => [...items, newItem]);
  }, []);

  // Add a dependency (toId depends on fromId), avoiding self/duplicate.
  const addDep = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setItems((items) => items.map((it) => {
      if (it.id !== toId) return it;
      const deps = it.deps || [];
      if (deps.includes(fromId)) return it;
      return { ...it, deps: [...deps, fromId] };
    }));
  }, []);

  const removeDep = useCallback((fromId, toId) => {
    setItems((items) => items.map((it) => {
      if (it.id !== toId) return it;
      return { ...it, deps: (it.deps || []).filter((x) => x !== fromId) };
    }));
  }, []);

  // Delete-key + Esc handling for selected dependency
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedDep) {
        e.preventDefault();
        removeDep(selectedDep.fromId, selectedDep.toId);
        setSelectedDep(null);
      } else if (e.key === "Escape") {
        setSelectedDep(null);
        setDepMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDep, removeDep]);

  // Click outside dep arrow / context menu to clear
  useEffect(() => {
    if (!selectedDep && !depMenu) return;
    const onDown = (e) => {
      if (e.target.closest("[data-dep-path]") || e.target.closest("[data-dep-menu]")) return;
      setSelectedDep(null);
      setDepMenu(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [selectedDep, depMenu]);

  // Toggle collapse on a summary.
  const toggleCollapsed = useCallback((id) => {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  }, []);

  // ------- bar drag (move / resize-left / resize-right) -------
  // While dragging, we maintain a `dragPreview` to show ghost without thrashing the items array.
  const [dragPreview, setDragPreview] = useState(null); // {id, start, end}

  const startBarDrag = useCallback((e, row, mode) => {
    e.stopPropagation();
    e.preventDefault();
    if (row.isSummary) return;
    const startClientX = e.clientX;
    const origStart = row.start;
    const origEnd = row.end;
    const duration = dayDiff(origStart, origEnd);

    function onMove(ev) {
      const dx = ev.clientX - startClientX;
      const ddays = Math.round(dx / dayW);
      let ns = origStart,ne = origEnd;
      if (mode === "move") {ns = addDays(origStart, ddays);ne = addDays(origEnd, ddays);} else
      if (mode === "l") {ns = addDays(origStart, ddays);if (dayDiff(ns, ne) < 1) ns = addDays(ne, -1);} else
      if (mode === "r") {ne = addDays(origEnd, ddays);if (dayDiff(ns, ne) < 1) ne = addDays(ns, 1);}
      setDragPreview({ id: row.id, start: ns, end: ne });
    }
    function onUp(ev) {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const dx = ev.clientX - startClientX;
      const ddays = Math.round(dx / dayW);
      if (ddays !== 0) {
        let ns = origStart,ne = origEnd;
        if (mode === "move") {ns = addDays(origStart, ddays);ne = addDays(origEnd, ddays);} else
        if (mode === "l") {ns = addDays(origStart, ddays);if (dayDiff(ns, ne) < 1) ns = addDays(ne, -1);} else
        if (mode === "r") {ne = addDays(origEnd, ddays);if (dayDiff(ns, ne) < 1) ne = addDays(ns, 1);}
        updateItem(row.id, { start: ns, end: ne });
      }
      setDragPreview(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [dayW, updateItem]);

  // ------- dep drag -------
  const [depDrag, setDepDrag] = useState(null); // {fromId, fromX, fromY, x, y, hitId}
  const scrollWrapRef = useRef(null);

  const startDepDrag = useCallback((e, row) => {
    e.stopPropagation();
    e.preventDefault();
    if (row.isSummary) return;
    const fromX = dayDiff(viewStart, row.end) * dayW;
    const fromY = rowIndex[row.id] * rowH + rowH / 2;
    setDepDrag({ fromId: row.id, fromX, fromY, x: fromX, y: fromY, hitId: null });

    function clientToContent(ev) {
      const wrap = scrollWrapRef.current;
      if (!wrap) return { x: 0, y: 0 };
      const rect = wrap.getBoundingClientRect();
      return {
        x: ev.clientX - rect.left + wrap.scrollLeft,
        y: ev.clientY - rect.top - 56 // 56 = headerH
      };
    }
    function onMove(ev) {
      const pt = clientToContent(ev);
      // hit-test: which row index? which item?
      const ri = Math.floor(pt.y / rowH);
      let hit = null;
      if (ri >= 0 && ri < visibleRows.length) {
        const r = visibleRows[ri];
        if (!r.isSummary && r.id !== row.id) {
          const rx = dayDiff(viewStart, r.start) * dayW;
          const rw = dayDiff(r.start, r.end) * dayW;
          if (pt.x >= rx - 4 && pt.x <= rx + rw + 4) hit = r.id;
        }
      }
      setDepDrag({ fromId: row.id, fromX, fromY, x: pt.x, y: pt.y, hitId: hit });
    }
    function onUp(ev) {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Find last hit
      setDepDrag((cur) => {
        if (cur && cur.hitId) addDep(row.id, cur.hitId);
        return null;
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [rowIndex, dayW, rowH, visibleRows, addDep]);

  // ------- pan timeline -------
  const startPan = useCallback((e) => {
    if (e.button !== 0) return;
    const wrap = scrollWrapRef.current;
    if (!wrap) return;
    const startX = e.clientX;
    const startScroll = wrap.scrollLeft;
    e.preventDefault();
    document.body.style.cursor = "grabbing";
    function onMove(ev) {
      wrap.scrollLeft = startScroll - (ev.clientX - startX);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // ------- row reorder drag (any gap + level change) -------
  const [rowDrag, setRowDrag] = useState(null);
  // shape: { sourceId, sourceLevel, targetGap: {visibleIndex, itemsIdx}, targetLevel, valid }

  const startRowDrag = useCallback((e, row) => {
    e.preventDefault();
    e.stopPropagation();
    const items_ = items;
    const fromIdx = items_.findIndex((x) => x.id === row.id);
    if (fromIdx < 0) return;
    const [s, e2] = subtreeRange(items_, fromIdx);
    const sourceLevel = items_[fromIdx].level;
    const block = items_.slice(s, e2 + 1);
    const blockMaxLevel = Math.max(...block.map((b) => b.level));
    // max root level such that deepest descendant stays ≤ 3
    const maxRootLevel = 3 - (blockMaxLevel - sourceLevel);
    const rest = items_.slice(0, s).concat(items_.slice(e2 + 1));
    const startClientX = e.clientX;

    setRowDrag({
      sourceId: row.id, sourceLevel,
      targetGap: null, targetLevel: sourceLevel, valid: false
    });

    function onMove(ev) {
      const leftList = document.getElementById("__wbs_left_list__");
      if (!leftList) return;
      const rect = leftList.getBoundingClientRect();
      const yInside = ev.clientY - rect.top;

      // visibleGap index 0..N
      let gIdx = Math.round(yInside / rowH);
      gIdx = Math.max(0, Math.min(visibleRows.length, gIdx));

      // desired level = sourceLevel + delta-X / 14px
      // (intuitive: vertical-only drag preserves level; right +14 = demote; left -14 = promote)
      const dx = ev.clientX - startClientX;
      let dLevel = sourceLevel + Math.round(dx / 14);
      dLevel = Math.max(1, Math.min(3, dLevel));
      dLevel = Math.min(dLevel, maxRootLevel);

      // Compute itemsIdx for this visible gap.
      const itemsIdx = visibleGapToItemsIndex(items_, visibleRows, gIdx);

      // Validate. Don't allow dropping inside source's own subtree.
      let valid = !(itemsIdx > s && itemsIdx <= e2 + 1);

      // Strict nesting: when dLevel > 1, the previous row in `rest` (after removal) at level dLevel-1 must exist immediately as ancestor.
      if (valid && dLevel > 1) {
        let restInsertIdx = itemsIdx;
        if (itemsIdx > e2) restInsertIdx = itemsIdx - (e2 - s + 1);
        restInsertIdx = Math.max(0, Math.min(rest.length, restInsertIdx));
        let parent = null;
        for (let i = restInsertIdx - 1; i >= 0; i--) {
          if (rest[i].level < dLevel) {parent = rest[i];break;}
        }
        valid = !!parent && parent.level === dLevel - 1;
      }

      setRowDrag((cur) => cur ? {
        ...cur,
        targetGap: { visibleIndex: gIdx, itemsIdx },
        targetLevel: dLevel,
        valid
      } : cur);
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setRowDrag((cur) => {
        if (cur && cur.targetGap && cur.valid) {
          const delta = cur.targetLevel - sourceLevel;
          const targetIdx = cur.targetGap.itemsIdx;
          // Auto-expand any collapsed ancestors of the new insertion point
          // so the moved row never lands inside a collapsed subtree.
          let restIdx = targetIdx;
          if (targetIdx > e2) restIdx = targetIdx - (e2 - s + 1);
          restIdx = Math.max(0, Math.min(rest.length, restIdx));
          const ancestors = [];
          let curLevel = 999;
          for (let i = restIdx - 1; i >= 0; i--) {
            if (rest[i].level < curLevel) {
              ancestors.push(rest[i].id);
              curLevel = rest[i].level;
              if (curLevel === 1) break;
            }
          }
          if (ancestors.length) {
            setCollapsed((c) => {
              const next = { ...c };
              ancestors.forEach((aid) => { delete next[aid]; });
              return next;
            });
          }
          moveSubtree(cur.sourceId, targetIdx, delta);
        }
        return null;
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [items, visibleRows, rowH, moveSubtree]);

  // Stats
  const stats = useMemo(() => {
    const leaves = enriched.filter((r) => !r.isSummary);
    const total = leaves.length;
    const done = leaves.filter((r) => r.pct === 100).length;
    const inflight = leaves.filter((r) => r.pct > 0 && r.pct < 100).length;
    const overall = Math.round(leaves.reduce((s, r) => s + r.pct, 0) / total);
    return { total, done, inflight, overall, summaries: enriched.length - total };
  }, [enriched]);

  return (
    <div>
      <Masthead stats={stats} meta={meta} updateMeta={updateMeta} />
      <Toolbar v={v} setTweak={setTweak} onExport={exportJSON} onImport={importJSON} onReset={resetData} />
      <div style={{
        background: "var(--paper-2)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: "0 1px 0 rgba(28,25,22,0.04), 0 24px 60px -40px rgba(28,25,22,0.18)"
      }}>
        <GanttGrid
          rows={visibleRows}
          rowIndex={rowIndex}
          dayW={dayW}
          rowH={rowH}
          leftW={leftW}
          timelineW={timelineW}
          viewStart={viewStart}
          viewEnd={viewEnd}
          viewTotalDays={viewTotalDays}
          todayX={todayX}
          v={v}
          hover={hover}
          setHover={setHover}
          focusId={focusId}
          setFocusId={setFocusId}
          collapsed={collapsed}
          toggleCollapsed={toggleCollapsed}
          startBarDrag={startBarDrag}
          startDepDrag={startDepDrag}
          startRowDrag={startRowDrag}
          startPan={startPan}
          dragPreview={dragPreview}
          depDrag={depDrag}
          rowDrag={rowDrag}
          scrollWrapRef={scrollWrapRef}
          removeDep={removeDep}
          selectedDep={selectedDep}
          setSelectedDep={setSelectedDep}
          depMenu={depMenu}
          setDepMenu={setDepMenu}
          addNewTask={addNewTask}
          updateItem={updateItem} />
        
      </div>
      <Footer />
    </div>);

}

// ====================================================================
//                           MASTHEAD / TOOLBAR
// ====================================================================
function Masthead({ stats, meta, updateMeta }) {
  return (
    <header style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--ink)", paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="mono small-caps" style={{ color: "var(--ink-3)" }}>Today</span>
          <span className="serif" style={{ fontSize: 26, lineHeight: 1, color: "var(--ink)", letterSpacing: "-0.005em" }}>
            {`${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][TODAY.getDay()]}, ${monthName(TODAY.getMonth())} ${TODAY.getDate()}, ${TODAY.getFullYear()}`}
          </span>
        </div>
        <EditableText value={meta.headerRight} onCommit={(v) => updateMeta({ headerRight: v })}
          style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 500, color: "var(--ink-3)" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", marginTop: 16, gap: 24 }}>
        <div>
          <EditableText value={meta.subtitle} onCommit={(v) => updateMeta({ subtitle: v })}
            style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 500, color: "var(--accent)", marginBottom: 6, display: "block" }} />
          <h1 className="serif" style={{ fontSize: 56, lineHeight: 1.0, margin: 0, letterSpacing: "-0.02em", color: "var(--ink)", display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <EditableText value={meta.wbsPrefix} onCommit={(v) => updateMeta({ wbsPrefix: v })}
              style={{ fontSize: 56, fontFamily: "Instrument Serif, Georgia, serif", letterSpacing: "-0.02em", color: "var(--ink)" }} />
            <span style={{ fontStyle: "italic", color: "var(--accent)" }}>—</span>
            <EditableText value={meta.wbsSuffix} onCommit={(v) => updateMeta({ wbsSuffix: v })}
              style={{ fontSize: 56, fontFamily: "Instrument Serif, Georgia, serif", letterSpacing: "-0.02em", color: "var(--ink)" }} />
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 24, paddingBottom: 6 }}>
          <Stat label="Leaves" value={stats.total} />
          <Stat label="Summaries" value={stats.summaries} />
          <Stat label="Shipped" value={stats.done} />
          <Stat label="Overall" value={`${stats.overall}%`} accent />
        </div>
      </div>

      <p style={{ marginTop: 14, maxWidth: 880, color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.55 }}>
        <span className="mono small-caps" style={{ color: "var(--accent)", marginRight: 6 }}>Tip</span>
        Click a summary name to collapse. Drag <span className="mono">⋮⋮</span> to reorder — move
        horizontally during drag to promote / demote (level). Drag a bar's middle to shift the schedule;
        edges to resize. Pull the small dot at a bar's tail to draw a dependency. Click an arrow to select
        it, then <span className="mono" style={{ background: "var(--paper-3)", padding: "1px 4px", borderRadius: 2 }}>Delete</span> or right-click for a menu.
        Drag empty timeline area to pan. Zoom toolbar switches between
        <span className="mono" style={{ background: "var(--paper-3)", padding: "1px 6px", borderRadius: 2, margin: "0 4px" }}>1 mo</span>
        /
        <span className="mono" style={{ background: "var(--paper-3)", padding: "1px 6px", borderRadius: 2, margin: "0 4px" }}>4 mo</span>
        /
        <span className="mono" style={{ background: "var(--paper-3)", padding: "1px 6px", borderRadius: 2, margin: "0 4px" }}>12 mo</span>
        — 1 mo shows daily date headers.
      </p>
    </header>);

}

function Stat({ label, value, accent }) {
  return (
    <div style={{ textAlign: "right", borderRight: "1px solid var(--line-2)", paddingRight: 24 }}>
      <div className="serif" style={{ fontSize: 38, lineHeight: 1, color: accent ? "var(--accent)" : "var(--ink)" }}>{value}</div>
      <div className="mono small-caps" style={{ color: "var(--ink-3)", marginTop: 4 }}>{label}</div>
    </div>);

}

function Toolbar({ v, setTweak, onExport, onImport, onReset }) {
  const fileRef = useRef(null);
  return (
    <div style={{
      display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 10, gap: 18, padding: "10px 14px",
      background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 4, marginBottom: -1,
      borderBottom: "none"
    }}>
      <Seg label="Zoom" value={v.zoom || "month4"} options={[["month1", "1 mo"], ["month4", "4 mo"], ["month12", "12 mo"]]} onChange={(x) => setTweak("zoom", x)} />
      <OwnerFilter value={v.owner} onChange={(x) => setTweak("owner", x)} />
      <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
        <Toggle label="Dependencies" value={v.showDeps} onChange={(x) => setTweak("showDeps", x)} />
        <span style={{ width: 1, height: 20, background: "var(--line-2)", margin: "0 4px" }} />
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onImport(f); e.target.value = ""; }} />
        <ToolbarBtn onClick={onExport} title="Download current schedule as JSON">↓ Export</ToolbarBtn>
        <ToolbarBtn onClick={() => fileRef.current && fileRef.current.click()} title="Load schedule from JSON file">↑ Import</ToolbarBtn>
        <ToolbarBtn onClick={onReset} title="Discard changes and restore initial WBS" danger>↻ Reset</ToolbarBtn>
      </div>
    </div>);

}

function ToolbarBtn({ onClick, title, danger, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        border: "1px solid var(--line-2)", padding: "5px 10px", borderRadius: 3,
        background: hover ? (danger ? "var(--accent)" : "var(--ink)") : "var(--paper)",
        color: hover ? "var(--paper)" : (danger ? "var(--accent)" : "var(--ink-2)"),
        fontFamily: "IBM Plex Mono, monospace", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase",
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
        transition: "background 120ms ease, color 120ms ease"
      }}>
      {children}
    </button>);

}

function OwnerFilter({ value, onChange }) {
  const owningTeam = TEAMS.find((t) => t.id === value || t.members.includes(value));
  const [expanded, setExpanded] = useState(owningTeam ? owningTeam.id : null);
  const isActive = (k) => k === value;
  const baseBtn = {
    border: "none", padding: "5px 10px", fontFamily: "inherit", fontSize: 12,
    cursor: "pointer", letterSpacing: 0.2, background: "transparent",
    color: "var(--ink-2)", display: "inline-flex", alignItems: "center",
    gap: 6, whiteSpace: "nowrap"
  };
  const active = (k) => ({
    ...baseBtn,
    background: isActive(k) ? "var(--ink)" : "transparent",
    color: isActive(k) ? "var(--paper)" : "var(--ink-2)"
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span className="mono small-caps" style={{ color: "var(--ink-3)" }}>Owner</span>
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "stretch",
        border: "1px solid var(--line-2)", borderRadius: 3, overflow: "hidden",
        background: "var(--paper)"
      }}>
        <button onClick={() => onChange("all")} style={active("all")}>All</button>
        {TEAMS.map((team) => {
          const open = expanded === team.id;
          const teamActive = isActive(team.id);
          return (
            <React.Fragment key={team.id}>
              <button
                onClick={() => {
                  if (teamActive && open) {setExpanded(null);return;}
                  if (open && !teamActive) {onChange(team.id);return;}
                  onChange(team.id);
                  setExpanded(team.id);
                }}
                style={{ ...active(team.id), borderLeft: "1px solid var(--line-2)", fontWeight: 500 }}>
                
                <span>{team.name}</span>
                <span style={{
                  display: "inline-block",
                  transform: open ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 160ms ease",
                  fontSize: 9, opacity: 0.6, marginLeft: 2
                }}>▾</span>
                <span className="mono" style={{
                  fontSize: 10, opacity: isActive(team.id) ? 0.7 : 0.5, marginLeft: 2
                }}>{team.members.length}</span>
              </button>
              {open && team.members.map((mid) => {
                const o = OWNERS[mid];
                if (!o) return null;
                const memberActive = isActive(mid);
                return (
                  <button key={mid} onClick={() => onChange(mid)} style={{
                    ...baseBtn,
                    background: memberActive ? "var(--ink)" : "var(--paper-2)",
                    color: memberActive ? "var(--paper)" : "var(--ink-2)",
                    borderLeft: "1px solid var(--line-2)",
                    fontSize: 11.5
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: 99,
                      background: memberActive ? "var(--paper)" : o.tint
                    }} />
                    {o.name}
                  </button>);

              })}
            </React.Fragment>);

        })}
      </div>
    </div>);

}

function Seg({ label, value, options, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="mono small-caps" style={{ color: "var(--ink-3)" }}>{label}</span>
      <div style={{ display: "flex", border: "1px solid var(--line-2)", borderRadius: 3, overflow: "hidden", background: "var(--paper)" }}>
        {options.map(([k, l]) => {
          const a = k === value;
          return (
            <button key={k} onClick={() => onChange(k)} style={{
              border: "none", padding: "5px 10px", fontFamily: "inherit", fontSize: 12,
              background: a ? "var(--ink)" : "transparent",
              color: a ? "var(--paper)" : "var(--ink-2)",
              cursor: "pointer", letterSpacing: 0.2
            }}>{l}</button>);

        })}
      </div>
    </div>);

}

function Toggle({ label, value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      border: "1px solid var(--line-2)", padding: "5px 10px", borderRadius: 3,
      background: value ? "var(--ink)" : "var(--paper)",
      color: value ? "var(--paper)" : "var(--ink-3)",
      fontFamily: "IBM Plex Mono", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase",
      cursor: "pointer", display: "flex", alignItems: "center", gap: 8
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: 99,
        background: value ? "var(--paper)" : "var(--line-2)",
        boxShadow: value ? "0 0 0 2px rgba(244,237,224,0.2)" : "none"
      }} />
      {label}
    </button>);

}

// ====================================================================
//                       GANTT GRID
// ====================================================================
function GanttGrid(props) {
  const {
    rows, rowIndex, dayW, rowH, leftW, timelineW, todayX, v,
    viewStart, viewEnd, viewTotalDays,
    hover, setHover, focusId, setFocusId,
    collapsed, toggleCollapsed,
    startBarDrag, startDepDrag, startRowDrag, startPan,
    dragPreview, depDrag, rowDrag, scrollWrapRef,
    removeDep, selectedDep, setSelectedDep, depMenu, setDepMenu, addNewTask, updateItem
  } = props;

  const headerH = 56;
  const totalRowsHeight = rows.length * rowH;

  const days = [];
  for (let i = 0; i <= viewTotalDays; i++) days.push(new Date(viewStart.getTime() + i * DAY));

  const weeks = [];
  for (let i = 0; i <= viewTotalDays; i++) {
    const dt = new Date(viewStart.getTime() + i * DAY);
    if (dt.getDay() === 1 || i === 0) weeks.push({ i, dt, w: isoWeek(dt) });
  }

  const months = [];
  {
    let prev = -1;
    days.forEach((dt, i) => {
      if (dt.getMonth() !== prev) {
        months.push({ i, name: monthName(dt.getMonth()), year: dt.getFullYear() });
        prev = dt.getMonth();
      }
    });
  }

  const zoomLevel = v.zoom || "month4";

  useEffect(() => {
    if (scrollWrapRef.current) {
      scrollWrapRef.current.scrollLeft = Math.max(0, todayX - 360);
    }
  }, [todayX, scrollWrapRef]);

  const colorFor = (code) => rootInfo(code).color;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${leftW}px 1fr`, position: "relative" }}>
      {/* LEFT */}
      <div style={{ borderRight: "1px solid var(--line)", background: "var(--paper-2)" }}>
        <div style={{ height: headerH, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 12px", gap: 6 }}>
          <span style={{ width: 14 }} />
          <span style={{ width: 14 }} />
          <span className="mono small-caps" style={{ color: "var(--ink-3)", minWidth: 36, paddingLeft: 8 }}>WBS</span>
          <span className="mono small-caps" style={{ color: "var(--ink-3)", flex: 1 }}>Task</span>
          <span className="mono small-caps" style={{ color: "var(--ink-3)", width: 22, textAlign: "center" }}>Own</span>
          <span className="mono small-caps" style={{ color: "var(--ink-3)", minWidth: 36, textAlign: "right", paddingLeft: 8, borderLeft: "1px solid var(--line-2)" }}>%</span>
        </div>
        <div id="__wbs_left_list__" style={{ position: "relative" }}>
          {rows.map((r, i) => {
            const lvl = r.level;
            const indent = (lvl - 1) * 14;
            const isHover = hover === r.id;
            const isFocus = focusId === r.id;
            const o = !r.isSummary ? OWNERS[r.owner] : null;
            const rootColor = colorFor(r.code);
            const isCollapsed = collapsed[r.id];
            return (
              <div key={r.id}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              style={{
                height: rowH, display: "flex", alignItems: "center", gap: 6,
                padding: `0 12px 0 ${10 + indent}px`,
                borderBottom: "1px solid var(--line)",
                background: isFocus ? "var(--paper-3)" :
                isHover ? "rgba(232,221,198,0.5)" :
                r.isSummary && lvl === 1 ? "var(--paper-3)" :
                r.isSummary && lvl === 2 ? "rgba(232,221,198,0.35)" :
                "transparent",
                position: "relative"
              }}>
                {/* drag grip */}
                <span
                  onMouseDown={(e) => startRowDrag(e, r)}
                  title="Drag to reorder"
                  className="mono"
                  style={{
                    width: 14, fontSize: 11, color: "var(--ink-4)",
                    cursor: "grab", userSelect: "none", textAlign: "center",
                    opacity: isHover ? 1 : 0.45, lineHeight: 1
                  }}>⋮⋮</span>

                {/* collapse chevron for summaries */}
                {r.isSummary ?
                <span
                  onClick={(e) => {e.stopPropagation();toggleCollapsed(r.id);}}
                  style={{
                    cursor: "pointer", width: 14, fontSize: 10, color: "var(--ink-2)",
                    transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)",
                    transition: "transform 140ms ease", lineHeight: 1, userSelect: "none"
                  }}>▾</span> :

                <span style={{ width: 14 }} />
                }

                <span className="mono" style={{
                  fontSize: 10.5,
                  color: r.isSummary ? "var(--ink-2)" : "var(--ink-4)",
                  fontWeight: r.isSummary ? 600 : 400,
                  minWidth: 36, letterSpacing: 0.3,
                  borderLeft: `2px solid ${rootColor}`,
                  paddingLeft: 6
                }}>{r.code}</span>

                <div
                  onClick={() => {
                    if (r.isSummary) toggleCollapsed(r.id);else
                    setFocusId(focusId === r.id ? null : r.id);
                  }}
                  style={{ minWidth: 0, flex: 1, cursor: r.isSummary ? "pointer" : "default" }}>
                  <EditableText
                    value={r.name}
                    onCommit={(v) => updateItem(r.id, { name: v })}
                    style={{
                      fontSize: r.isSummary && lvl === 1 ? 15 : r.isSummary ? 12.5 : 12.5,
                      fontWeight: r.isSummary ? 600 : 400,
                      color: "var(--ink)",
                      lineHeight: 1.15,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      fontFamily: r.isSummary && lvl === 1 ? "Instrument Serif, Georgia, serif" : "inherit",
                      letterSpacing: r.isSummary && lvl === 1 ? "-0.005em" : 0
                    }} />
                  {!r.isSummary &&
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: 0.3, marginTop: 1 }}>
                      {fmtDate(r.start)} → {fmtDate(r.end)} · {dayDiff(r.start, r.end)}d
                    </div>
                  }
                </div>

                {o ?
                <OwnerPicker value={r.owner} onChange={(v) => updateItem(r.id, { owner: v })} /> :
                <span className="mono" style={{ fontSize: 9.5, color: "var(--ink-4)" }}>{r.leafCount || 0}</span>}
                <PctChip pct={r.pct} editable={!r.isSummary} onChange={(val) => updateItem(r.id, { pct: val })} />

              </div>);

          })}

          {/* drop indicator for reorder — single element, X-positioned by targetLevel */}
          {rowDrag && rowDrag.targetGap &&
          <div style={{
            position: "absolute",
            top: rowDrag.targetGap.visibleIndex * rowH - 1.5,
            left: 22 + (rowDrag.targetLevel - 1) * 14,
            right: 4,
            height: 3,
            background: rowDrag.valid ? "var(--accent)" : "#c44b3d",
            zIndex: 5,
            pointerEvents: "none",
            boxShadow: rowDrag.valid ? "0 0 0 1px var(--paper)" : "0 0 0 1px var(--paper)"
          }}>
              <div style={{
              position: "absolute", top: -3, left: -8, width: 0, height: 0,
              borderTop: "4px solid transparent", borderBottom: "4px solid transparent",
              borderLeft: `8px solid ${rowDrag.valid ? "var(--accent)" : "#c44b3d"}`
            }} />
            </div>
          }

          {/* + New task button */}
          <button
            onClick={addNewTask}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", border: "none", borderTop: "1px solid var(--line)",
              padding: "10px 14px", background: "transparent",
              color: "var(--ink-3)", cursor: "pointer",
              fontFamily: "IBM Plex Mono, monospace", fontSize: 11,
              letterSpacing: 0.5, textTransform: "uppercase", textAlign: "left"
            }}
            onMouseEnter={(e) => {e.currentTarget.style.background = "var(--paper-3)";e.currentTarget.style.color = "var(--ink)";}}
            onMouseLeave={(e) => {e.currentTarget.style.background = "transparent";e.currentTarget.style.color = "var(--ink-3)";}}>
            <span style={{ fontSize: 16, lineHeight: 1, color: "var(--accent)" }}>+</span>
            <span>New task</span>
          </button>
        </div>
      </div>

      {/* RIGHT — scrollable */}
      <div ref={scrollWrapRef} style={{ overflowX: "auto", overflowY: "hidden", position: "relative" }}>
        <div style={{ width: timelineW, position: "relative" }}>
          {/* HEADER */}
          <div style={{ height: headerH, borderBottom: "1px solid var(--line)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, height: 24, borderBottom: "1px solid var(--line)" }}>
              {months.map((m, idx) => {
                const next = months[idx + 1];
                const w = ((next ? next.i : viewTotalDays) - m.i) * dayW;
                return (
                  <div key={idx} style={{
                    position: "absolute", left: m.i * dayW, width: w, height: 24,
                    display: "flex", alignItems: "center", paddingLeft: 10,
                    borderRight: "1px solid var(--line)"
                  }}>
                    <span className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>{m.name}</span>
                    <span className="mono small-caps" style={{ color: "var(--ink-4)", marginLeft: 6 }}>{m.year}</span>
                  </div>);

              })}
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 24, height: 32 }}>
              {zoomLevel === "month12" ?
              /* 12-month zoom: no sub-rail, just continuation of month dividers */
              months.map((m, idx) => {
                const next = months[idx + 1];
                const w = ((next ? next.i : viewTotalDays) - m.i) * dayW;
                return (
                  <div key={idx} style={{
                    position: "absolute", left: m.i * dayW, width: w, height: 32,
                    borderRight: "1px dashed var(--line-2)"
                  }} />);
              }) :
              zoomLevel === "month1" ?
              /* 1-month zoom: per-day cells showing date number */
              days.map((dt, i) => {
                const isToday = dt.getTime() === TODAY.getTime();
                const isFirstOfMonth = dt.getDate() === 1;
                return (
                  <div key={i} style={{
                    position: "absolute", left: i * dayW, width: dayW, height: 32,
                    borderRight: isFirstOfMonth ? "1px solid var(--line)" : "1px dashed var(--line-2)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: isToday ? "rgba(138,58,31,0.08)" : "transparent"
                  }}>
                    <span className="mono" style={{ fontSize: 9.5, color: "var(--ink-4)", letterSpacing: 0.4, lineHeight: 1 }}>
                      {["S","M","T","W","T","F","S"][dt.getDay()]}
                    </span>
                    <span className="mono" style={{
                      fontSize: 12, color: isToday ? "var(--accent)" : "var(--ink-2)",
                      fontWeight: isToday ? 600 : 400, marginTop: 1, lineHeight: 1
                    }}>{dt.getDate()}</span>
                  </div>);
              }) :
              /* 4-month zoom: weekly cells */
              weeks.map((w, idx) => {
                const next = weeks[idx + 1];
                const wpx = ((next ? next.i : viewTotalDays) - w.i) * dayW;
                return (
                  <div key={idx} style={{
                    position: "absolute", left: w.i * dayW, width: wpx, height: 32,
                    borderRight: "1px dashed var(--line-2)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0 8px"
                  }}>
                      <span className="mono small-caps" style={{ color: "var(--ink-3)" }}>W{w.w}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{fmtDate(w.dt)}</span>
                    </div>);
              })
              }
            </div>
          </div>

          {/* BODY (pan capture surface) */}
          <div
            onMouseDown={startPan}
            style={{ position: "relative", height: totalRowsHeight, cursor: depDrag ? "crosshair" : "grab" }}>
            
            {/* week lines */}
            {weeks.map((w, idx) =>
            <div key={idx} style={{
              position: "absolute", top: 0, left: w.i * dayW, width: 1, height: totalRowsHeight,
              background: "var(--line)", pointerEvents: "none"
            }} />
            )}

            {/* row tinting + separators */}
            {rows.map((r, i) => {
              const lvl = r.level;
              const bg = r.isSummary && lvl === 1 ? "var(--paper-3)" :
              r.isSummary && lvl === 2 ? "rgba(232,221,198,0.35)" : "transparent";
              return (
                <React.Fragment key={r.id}>
                  {bg !== "transparent" &&
                  <div style={{
                    position: "absolute", top: i * rowH, left: 0, right: 0, height: rowH,
                    background: bg, pointerEvents: "none"
                  }} />
                  }
                  <div style={{
                    position: "absolute", left: 0, right: 0, top: (i + 1) * rowH - 1,
                    height: 1, background: "var(--line)", pointerEvents: "none"
                  }} />
                </React.Fragment>);

            })}

            {/* dep arrows */}
            {v.showDeps &&
            <svg style={{ position: "absolute", inset: 0, width: timelineW, height: totalRowsHeight, pointerEvents: "none", overflow: "visible" }}>
                <defs>
                  <marker id="arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="var(--ink-2)" />
                  </marker>
                  <marker id="arr-soft" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="var(--ink-4)" />
                  </marker>
                  <marker id="arr-sel" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="8" markerHeight="8" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
                  </marker>
                </defs>
                {rows.flatMap((r) => (r.deps || []).map((depId) => {
                const di = rowIndex[depId];
                const ri = rowIndex[r.id];
                if (di == null || ri == null) return null;
                const dep = rows[di];
                const x1 = dayDiff(viewStart, dep.end) * dayW;
                const y1 = di * rowH + rowH / 2;
                const x2 = dayDiff(viewStart, r.start) * dayW;
                const y2 = ri * rowH + rowH / 2;
                const path = elbowPath(x1, y1, x2, y2);
                const active = hover === r.id || hover === depId || focusId === r.id || focusId === depId;
                const isSel = selectedDep && selectedDep.fromId === depId && selectedDep.toId === r.id;
                return (
                  <g key={`${depId}-${r.id}`}
                  data-dep-path
                  onClick={(e) => {e.stopPropagation();setSelectedDep({ fromId: depId, toId: r.id });setDepMenu(null);}}
                  onContextMenu={(e) => {
                    e.preventDefault();e.stopPropagation();
                    setSelectedDep({ fromId: depId, toId: r.id });
                    setDepMenu({ x: e.clientX, y: e.clientY, fromId: depId, toId: r.id });
                  }}
                  style={{ cursor: "pointer" }}>
                      {/* invisible wide path to make arrow easier to click */}
                      <path d={path} stroke="transparent" strokeWidth={12} fill="none" style={{ pointerEvents: "stroke" }} />
                      {/* visible path */}
                      <path d={path}
                    stroke={isSel ? "var(--accent)" : active ? "var(--ink-2)" : "var(--ink-4)"}
                    strokeWidth={isSel ? 2 : active ? 1.4 : 0.9}
                    strokeDasharray={isSel || active ? "0" : "2 3"}
                    fill="none"
                    markerEnd={isSel ? "url(#arr-sel)" : active ? "url(#arr)" : "url(#arr-soft)"}
                    opacity={isSel ? 1 : active ? 1 : 0.55}
                    style={{ pointerEvents: "none" }} />
                    </g>);

              }))}

                {/* selection × badge for selected dep */}
                {selectedDep && (() => {
                const di = rowIndex[selectedDep.fromId];
                const ri = rowIndex[selectedDep.toId];
                if (di == null || ri == null) return null;
                const dep = rows[di],r = rows[ri];
                if (!dep || !r) return null;
                const x1 = dayDiff(viewStart, dep.end) * dayW;
                const y1 = di * rowH + rowH / 2;
                const x2 = dayDiff(viewStart, r.start) * dayW;
                const y2 = ri * rowH + rowH / 2;
                const dx = x2 - x1;
                const mid = dx >= 24 ? x1 + Math.max(10, dx / 2) : x1 + 12;
                const cx = mid,cy = (y1 + y2) / 2;
                return (
                  <g
                    data-dep-path
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDep(selectedDep.fromId, selectedDep.toId);
                      setSelectedDep(null);
                    }}
                    style={{ cursor: "pointer", pointerEvents: "all" }}>
                      <circle cx={cx} cy={cy} r={9} fill="var(--accent)" />
                      <path d={`M ${cx - 4} ${cy - 4} L ${cx + 4} ${cy + 4} M ${cx + 4} ${cy - 4} L ${cx - 4} ${cy + 4}`}
                    stroke="var(--paper)" strokeWidth={1.6} strokeLinecap="round" fill="none" />
                    </g>);

              })()}

                {/* preview line during dep drag */}
                {depDrag &&
              <g>
                    <path d={elbowPath(depDrag.fromX, depDrag.fromY, depDrag.x, depDrag.y)}
                stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="3 3" fill="none"
                markerEnd="url(#arr)" />
                    {depDrag.hitId &&
                <circle cx={depDrag.x} cy={depDrag.y} r={5} fill="var(--accent)" />
                }
                  </g>
              }
              </svg>
            }

            {/* dep context menu */}
            {depMenu &&
            <div data-dep-menu
            style={{
              position: "fixed", left: depMenu.x, top: depMenu.y,
              background: "var(--paper-2)", border: "1px solid var(--line-2)",
              borderRadius: 4, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.3)",
              zIndex: 10000, padding: 4, minWidth: 160
            }}>
                <button onClick={(e) => {
                e.stopPropagation();
                removeDep(depMenu.fromId, depMenu.toId);
                setDepMenu(null);
                setSelectedDep(null);
              }} style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", border: "none", background: "transparent",
                padding: "8px 10px", borderRadius: 3, cursor: "pointer",
                fontSize: 12.5, color: "var(--ink)", textAlign: "left", fontFamily: "inherit"
              }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper-3)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <span style={{ color: "var(--accent)" }}>×</span>
                  <span>Delete arrow</span>
                  <span className="mono" style={{ marginLeft: "auto", color: "var(--ink-4)", fontSize: 10.5 }}>Del</span>
                </button>
              </div>
            }

            {/* TODAY */}
            <div style={{
              position: "absolute", top: 0, left: todayX, width: 1, height: totalRowsHeight,
              background: "var(--accent)", pointerEvents: "none"
            }}>
              <div style={{
                position: "absolute", top: -6, left: -4, width: 9, height: 9,
                background: "var(--accent)", transform: "rotate(45deg)"
              }} />
            </div>

            {/* BARS */}
            {rows.map((r, i) => {
              const usePreview = dragPreview && dragPreview.id === r.id;
              const start = usePreview ? dragPreview.start : r.start;
              const end = usePreview ? dragPreview.end : r.end;
              const x = dayDiff(viewStart, start) * dayW;
              const w = Math.max(dayW * 0.7, dayDiff(start, end) * dayW);
              const color = colorFor(r.code);

              if (r.isSummary) {
                return (
                  <SummaryBar key={r.id} r={r} i={i} x={x} w={w} rowH={rowH} color={color}
                  isHover={hover === r.id} isFocus={focusId === r.id}
                  onEnter={() => setHover(r.id)} onLeave={() => setHover(null)}
                  onClick={() => setFocusId(focusId === r.id ? null : r.id)} />);

              }
              const y = i * rowH + 5;
              const h = rowH - 10;
              return (
                <LeafBar key={r.id} r={r} previewStart={start} previewEnd={end} x={x} y={y} w={w} h={h} color={color}
                isHover={hover === r.id} isFocus={focusId === r.id}
                onEnter={() => setHover(r.id)} onLeave={() => setHover(null)}
                onBarDown={(e, mode) => startBarDrag(e, r, mode)}
                onDepDown={(e) => startDepDrag(e, r)}
                isPreview={usePreview} />);

            })}
          </div>
        </div>
      </div>
    </div>);

}

// elbow routing: horizontal-vertical-horizontal with a small dogleg.
// BUFFER keeps the vertical line a comfortable distance away from the arrow head.
function elbowPath(x1, y1, x2, y2) {
  const BUFFER = 14;
  const ARR_GAP = 6;
  const dx = x2 - x1;
  if (Math.abs(y2 - y1) < 1) return `M ${x1} ${y1} L ${x2 - ARR_GAP} ${y2}`;
  // Backtrack route when target is behind source or too tight to elbow normally
  if (dx < BUFFER + 14) {
    const downY = (y1 + y2) / 2;
    const stub = 10;
    return `M ${x1} ${y1} L ${x1 + stub} ${y1} L ${x1 + stub} ${downY} L ${x2 - BUFFER} ${downY} L ${x2 - BUFFER} ${y2} L ${x2 - ARR_GAP} ${y2}`;
  }
  // Normal elbow: vertical clamped to ≥ BUFFER away from target
  const mid = Math.min(x1 + Math.max(10, dx / 2), x2 - BUFFER);
  return `M ${x1} ${y1} L ${mid} ${y1} L ${mid} ${y2} L ${x2 - ARR_GAP} ${y2}`;
}

// ====================================================================
//                       BARS
// ====================================================================
function SummaryBar({ r, i, x, w, rowH, color, isHover, isFocus, onEnter, onLeave, onClick }) {
  const lvl = r.level;
  const cy = i * rowH + rowH / 2;
  const barH = lvl === 1 ? 12 : 9;
  const fillW = w * (r.pct / 100);
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => {e.stopPropagation();onClick();}}
    style={{
      position: "absolute", left: x, top: cy - barH / 2, width: w, height: barH,
      cursor: "pointer", zIndex: isHover || isFocus ? 4 : 2
    }}>
      <div style={{
        position: "absolute", top: barH / 2 - 1, left: 0, width: w, height: 2,
        background: color, opacity: 0.45
      }} />
      <div style={{
        position: "absolute", top: barH / 2 - 1, left: 0, width: fillW, height: 2,
        background: color
      }} />
      {/* sturdier end caps — bracket-style */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: 3, height: barH, background: color, borderRadius: 1
      }} />
      <div style={{
        position: "absolute", top: 0, right: 0, width: 3, height: barH, background: color, borderRadius: 1
      }} />
      <div style={{
        position: "absolute", bottom: -5, left: -3, width: 0, height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `6px solid ${color}`
      }} />
      <div style={{
        position: "absolute", bottom: -5, right: -3, width: 0, height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `6px solid ${color}`
      }} />

      {isHover &&
      <SummaryTooltip r={r} color={color} rowH={rowH} />
      }
    </div>);

}

function SummaryTooltip({ r, color, rowH }) {
  return (
    <div style={{
      position: "absolute", left: 0, top: rowH / 2 + 10, width: 290,
      background: "var(--ink)", color: "var(--paper)",
      padding: "10px 12px", borderRadius: 3,
      zIndex: 12, pointerEvents: "none",
      boxShadow: "0 14px 30px -10px rgba(0,0,0,0.4)"
    }}>
      <div className="mono small-caps" style={{ color, filter: "brightness(1.6)" }}>
        {r.code} · {rootInfo(r.code).name}
      </div>
      <div className="serif" style={{ fontSize: 18, lineHeight: 1.2, marginTop: 4 }}>{r.name}</div>
      <div className="mono" style={{ fontSize: 11, color: "var(--paper-3)", marginTop: 6 }}>
        {fmtLong(r.start)} → {fmtLong(r.end)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5 }}>
        <span>Summary · {r.leafCount} leaves</span>
        <span className="mono">{r.pct}%</span>
      </div>
    </div>);

}

function LeafBar({ r, x, y, w, h, color, isHover, isFocus, onEnter, onLeave, onBarDown, onDepDown, isPreview, previewStart, previewEnd }) {
  const o = OWNERS[r.owner];
  const fillW = (w - 2) * (r.pct / 100);
  const handleW = 6;
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}
    onMouseDown={(e) => {e.stopPropagation();onBarDown(e, "move");}}
    style={{
      position: "absolute", left: x, top: y, width: w, height: h,
      background: "var(--paper)",
      border: `1px solid ${color}`,
      borderRadius: 3,
      overflow: "visible",
      cursor: "move",
      boxShadow: isHover || isFocus || isPreview ? `0 1px 0 ${color}, 0 6px 16px -8px rgba(28,25,22,0.4)` : "none",
      transition: isPreview ? "none" : "box-shadow 120ms ease",
      zIndex: isHover || isFocus || isPreview ? 5 : 3,
      outline: isPreview ? "1px dashed var(--ink-2)" : "none",
      outlineOffset: 1
    }}>
      {/* fill */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: fillW,
        background: color, opacity: 0.92, pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", top: 0, left: fillW, right: 0, bottom: 0,
        background: `repeating-linear-gradient(45deg, transparent 0 4px, ${color}22 4px 5px)`, pointerEvents: "none"
      }} />
      {/* label — dual layer (light on fill / dark on remaining) for readability */}
      {(() => {
        const labelContent =
        <React.Fragment>
            <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 14, height: 14, borderRadius: 99, background: "rgba(0,0,0,0.35)",
            color: "var(--paper)",
            fontSize: 8.5, letterSpacing: 0.5, flexShrink: 0
          }} className="mono">{r.owner}</span>
            {w > 80 && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>}
            {w > 160 && <span className="mono" style={{ marginLeft: "auto", fontSize: 10, opacity: 0.85 }}>{r.pct}%</span>}
          </React.Fragment>;

        const baseLabel = {
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          padding: "0 6px", gap: 6, fontSize: 11,
          whiteSpace: "nowrap", overflow: "hidden", pointerEvents: "none"
        };
        const rightClip = Math.max(0, w - fillW);
        return (
          <React.Fragment>
            <div style={{
              ...baseLabel, color: "var(--paper)",
              textShadow: "0 1px 0 rgba(0,0,0,0.2)",
              clipPath: `inset(0 ${rightClip}px 0 0)`
            }}>{labelContent}</div>
            <div style={{
              ...baseLabel, color: "var(--ink)",
              clipPath: `inset(0 0 0 ${fillW}px)`
            }}>{labelContent}</div>
          </React.Fragment>);

      })()}

      {/* left resize handle */}
      <div
        onMouseDown={(e) => {e.stopPropagation();onBarDown(e, "l");}}
        title="Drag to change start"
        style={{
          position: "absolute", top: 0, left: 0, width: handleW, height: h,
          cursor: "ew-resize", background: "transparent"
        }} />
      {/* right resize handle */}
      <div
        onMouseDown={(e) => {e.stopPropagation();onBarDown(e, "r");}}
        title="Drag to change end"
        style={{
          position: "absolute", top: 0, right: 0, width: handleW, height: h,
          cursor: "ew-resize", background: "transparent"
        }} />

      {/* dep pull-handle — small, vertically centered, visible only on hover */}
      <div
        onMouseDown={(e) => {e.stopPropagation();onDepDown(e);}}
        onMouseEnter={onEnter}
        title="Drag to draw dependency"
        style={{
          position: "absolute", top: h / 2 - 4, right: -9, width: 8, height: 8,
          borderRadius: 99,
          background: isHover || isFocus ? color : "var(--paper)",
          border: `1.5px solid ${color}`,
          cursor: "crosshair", zIndex: 6,
          opacity: isHover || isFocus ? 1 : 0,
          pointerEvents: isHover || isFocus ? "auto" : "none",
          transition: "opacity 120ms ease, background 120ms ease",
        }} />

      {/* tooltip */}
      {(isHover || isPreview) &&
      <div style={{
        position: "absolute", left: 0, top: h + 8, width: 290,
        background: "var(--ink)", color: "var(--paper)",
        padding: "10px 12px", borderRadius: 3,
        zIndex: 12, pointerEvents: "none",
        boxShadow: "0 14px 30px -10px rgba(0,0,0,0.4)"
      }}>
          <div className="mono small-caps" style={{ color, filter: "brightness(1.6)" }}>
            {r.code} · {rootInfo(r.code).name}
          </div>
          <div className="serif" style={{ fontSize: 18, lineHeight: 1.2, marginTop: 4 }}>{r.name}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--paper-3)", marginTop: 6 }}>
            {fmtLong(previewStart || r.start)} → {fmtLong(previewEnd || r.end)} · {dayDiff(previewStart || r.start, previewEnd || r.end)}d
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5 }}>
            <span>{o.name} · <span style={{ color: "var(--paper-3)" }}>{o.role}</span></span>
            <span className="mono">{r.pct}%</span>
          </div>
        </div>
      }
    </div>);

}

// ====================================================================
//                       BITS
// ====================================================================
function Avatar({ owner, initials }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 22, height: 22, borderRadius: 99,
      background: owner.tint, color: "var(--paper)",
      fontFamily: "IBM Plex Mono", fontSize: 9.5, letterSpacing: 0.5, flexShrink: 0
    }}>{initials}</span>);

}

function PctChip({ pct, editable, onChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(pct));
  useEffect(() => {setVal(String(pct));}, [pct]);

  const state = pct === 100 ? "done" : pct === 0 ? "queued" : "live";
  const color = state === "done" ? "var(--ok)" : state === "queued" ? "var(--ink-4)" : "var(--ink-2)";

  const commit = () => {
    let n = parseInt(val, 10);
    if (Number.isNaN(n)) n = pct;
    n = Math.max(0, Math.min(100, n));
    setEditing(false);
    if (n !== pct) onChange && onChange(n);
  };

  if (editing && editable) {
    return (
      <input
        type="number" min="0" max="100" step="5"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {e.preventDefault();e.currentTarget.blur();} else
          if (e.key === "Escape") {setVal(String(pct));setEditing(false);}
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        autoFocus
        style={{
          width: 46, fontSize: 11, padding: "2px 4px",
          border: "1px solid var(--accent)", background: "var(--paper)",
          color: "var(--ink)", fontFamily: "IBM Plex Mono, monospace",
          borderRadius: 2, textAlign: "right", outline: "none"
        }} />);


  }

  const label = pct === 100 ? "100" : pct === 0 ? "—" : pct + "";
  return (
    <span
      onClick={(e) => {if (editable) {e.stopPropagation();setEditing(true);}}}
      onMouseDown={(e) => {if (editable) e.stopPropagation();}}
      title={editable ? "Click to edit progress" : undefined}
      className="mono"
      style={{
        fontSize: 10.5, color, letterSpacing: 0.3,
        borderLeft: "1px solid var(--line-2)", paddingLeft: 8, minWidth: 36, textAlign: "right",
        cursor: editable ? "text" : "default",
        userSelect: "none"
      }}>
      {label}{pct > 0 && pct < 100 ? "%" : ""}</span>);

}

function EditableText({ value, onCommit, style, multiline }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);

  const commit = () => {
    setEditing(false);
    const v = (val || "").trim();
    if (!v) { setVal(value); return; }
    if (v !== value) onCommit(v);
  };

  if (editing) {
    return (
      <input
        type="text" value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
          else if (e.key === "Escape") { setVal(value); setEditing(false); }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        autoFocus
        style={{
          ...style,
          fontSize: style && style.fontSize ? style.fontSize : 13,
          padding: "1px 4px",
          border: "1px solid var(--accent)", background: "var(--paper)",
          color: "var(--ink)", borderRadius: 2, outline: "none",
          width: "100%", boxSizing: "border-box",
        }}
      />
    );
  }
  return (
    <span
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      style={{ ...style, cursor: "text", display: "block" }}
      title="Double-click to edit"
    >{value}</span>
  );
}

function OwnerPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const o = OWNERS[value];
  if (!o) return null;
  return (
    <span
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); setOpen((x) => !x); }}
      style={{ position: "relative", display: "inline-flex", cursor: "pointer" }}
      title="Click to change owner">
      <Avatar owner={o} initials={value} />
      {open && (
        <React.Fragment>
          <div
            onMouseDown={(e) => { e.stopPropagation(); setOpen(false); }}
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: "100%", right: 0, marginTop: 4,
              background: "var(--paper-2)", border: "1px solid var(--line)",
              borderRadius: 4, boxShadow: "0 12px 30px -8px rgba(0,0,0,0.25)",
              zIndex: 100, padding: 4, minWidth: 190, maxHeight: 320, overflowY: "auto",
            }}>
            {TEAMS.map((team) => (
              <React.Fragment key={team.id}>
                <div className="mono small-caps" style={{
                  fontSize: 9.5, color: "var(--ink-4)", padding: "6px 8px 2px",
                  letterSpacing: 0.5, display: "flex", justifyContent: "space-between"
                }}>
                  <span>{team.name}</span>
                  <span>{team.members.length}</span>
                </div>
                {team.members.map((k) => {
                  const o2 = OWNERS[k];
                  if (!o2) return null;
                  const active = k === value;
                  return (
                    <button key={k}
                      onClick={() => { onChange(k); setOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        padding: "5px 8px", border: "none",
                        background: active ? "var(--ink)" : "transparent",
                        color: active ? "var(--paper)" : "var(--ink-2)",
                        fontFamily: "inherit", fontSize: 12,
                        cursor: "pointer", borderRadius: 2, textAlign: "left",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--paper-3)"; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                      <Avatar owner={o2} initials={k} />
                      <span>{o2.name}</span>
                      <span className="mono" style={{ marginLeft: "auto", color: active ? "var(--paper-3)" : "var(--ink-4)", fontSize: 10 }}>{o2.role}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </React.Fragment>
      )}
    </span>
  );
}

function Footer() {
  return (
    <footer style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 28, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
      <div>
        <div className="mono small-caps" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Modules</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--ink-2)" }}>
          {Object.entries(ROOTS).map(([k, r]) =>
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 16, height: 8, background: r.color, borderRadius: 1 }} />
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{k}</span>
              <span>{r.name}</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="mono small-caps" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Interaction map</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 11.5, color: "var(--ink-2)" }} className="mono">
            <span style={{ color: "var(--ink-4)" }}>name</span><span>click summary → collapse, double-click → edit</span>
            <span style={{ color: "var(--ink-4)" }}>avatar</span><span>click owner avatar → pick new owner</span>
            <span style={{ color: "var(--ink-4)" }}>%</span><span>click progress → type 0–100</span>
            <span style={{ color: "var(--ink-4)" }}>⋮⋮</span><span>drag row → reorder + indent to change level</span>
            <span style={{ color: "var(--ink-4)" }}>+</span><span>new task button at the bottom of list</span>
            <span style={{ color: "var(--ink-4)" }}>bar</span><span>drag middle / edges → reschedule</span>
            <span style={{ color: "var(--ink-4)" }}>○</span><span>pull from bar tail → draw dep arrow</span>
            <span style={{ color: "var(--ink-4)" }}>arrow</span><span>click + Delete (or right-click) → remove</span>
            <span style={{ color: "var(--ink-4)" }}>empty</span><span>drag background → pan timeline</span>
          </div>
        </div>
      </div>

      <div>
        <div className="mono small-caps" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Team</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TEAMS.map((team) =>
          <div key={team.id}>
              <div className="mono small-caps" style={{ color: "var(--ink-2)", marginBottom: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span>{team.name}</span>
                <span style={{ flex: 1, height: 1, background: "var(--line-2)" }} />
                <span style={{ color: "var(--ink-4)" }}>{team.members.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {team.members.map((k) => {
                const o = OWNERS[k];
                if (!o) return null;
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-2)" }}>
                      <Avatar owner={o} initials={k} />
                      <span>{o.name}</span>
                      <span className="mono" style={{ color: "var(--ink-4)", fontSize: 10.5, marginLeft: "auto" }}>{o.role}</span>
                    </div>);

              })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mono small-caps" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Critical dates</div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12.5, color: "var(--ink-2)" }}>
          {PROJECT_CONFIG.criticalDates.map((cd, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < PROJECT_CONFIG.criticalDates.length - 1 ? "1px dashed var(--line-2)" : "none" }}>
              <span>{cd.label}</span>
              <span className="mono" style={{ color: cd.accent ? "var(--accent)" : "inherit" }}>{cd.date}</span>
            </li>
          ))}
        </ul>
      </div>
    </footer>);

}

// ---------- mount ----------
ReactDOM.createRoot(document.getElementById("root")).render(<App />);