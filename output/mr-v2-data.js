// ================================================================
// MR V2 프로젝트 데이터
// ── 이 파일만 수정하면 됩니다 ──────────────────────────────────
// ================================================================

const _Y = 2026;
const _d = (m, day) => new Date(_Y, m - 1, day);

window.__GANTT_DATA__ = {

  // ── 제목 ──────────────────────────────────────────────────────
  pageTitle:   "Micro Restaurant V2 — Build Schedule",
  headerRight: "Build Schedule · Hardware Ops",
  subtitle:    "Micro Restaurant V2 · MVP build",
  wbsPrefix:   "Cooking · Rice · Fridge",   // h1 왼쪽
  wbsSuffix:   "WBS Schedule",              // h1 오른쪽 (— 사이)

  // ── 날짜 ──────────────────────────────────────────────────────
  projectStart: new Date(_Y, 3, 6),   // Apr 6
  projectEnd:   new Date(_Y, 6, 19),  // Jul 19
  today:        null,  // null이면 실제 오늘 날짜 사용

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
