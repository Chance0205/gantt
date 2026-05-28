// ---------------------------------------------------------
// [0] Gemini API 통합 (AI 로직)
// ---------------------------------------------------------
const apiKey = "";

async function callGemini(promptText, isJson = false) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: "당신은 20년 경력의 전문 프로젝트 매니저입니다. 항상 한국어로 답변해야 합니다." }] }
    };

    if (isJson) {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        text: { type: "STRING", description: "구체적인 하위 작업명" },
                        duration: { type: "INTEGER", description: "작업에 예상되는 소요일수 (숫자)" }
                    }
                }
            }
        };
    }

    let retries = 5;
    let delay = 1000;
    while (retries > 0) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error.message);
            return result.candidates[0].content.parts[0].text;
        } catch (e) {
            retries--;
            if (retries === 0) throw e;
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    }
}

window.generateAITasks = async function () {
    const goal = prompt("어떤 작업을 계획 중이신가요?\nAI가 목표를 분석해 하위 작업과 일정을 자동으로 세팅합니다.\n(예: 모바일 앱 로그인 화면 개발)");
    if (!goal) return;

    setStatus('saving', '✨ AI가 일정을 분할 중입니다...');
    try {
        const promptMsg = `'${goal}' 목표를 달성하기 위해 필요한 구체적인 하위 작업 3~5개를 시간 순서대로 작성해주세요.`;
        const aiResponse = await callGemini(promptMsg, true);
        const subTasks = JSON.parse(aiResponse);

        const today = new Date();
        const totalDuration = subTasks.reduce((sum, t) => sum + t.duration, 0);

        const rootTasks = gantt.getChildren(0);
        const nextRootWbs = String(rootTasks.length + 1);

        gantt.addTask({
            id: nextRootWbs,
            wbs: nextRootWbs,
            text: goal + " ✨",
            start_date: gantt.templates.task_date(today),
            duration: totalDuration,
            progress: 0,
            progress_percent: 0,
            owner: "AI 매니저",
            open: true
        });

        let currentStartDate = new Date(today);
        subTasks.forEach((taskObj, idx) => {
            const childWbs = nextRootWbs + "." + (idx + 1);
            gantt.addTask({
                id: childWbs,
                wbs: childWbs,
                text: taskObj.text,
                start_date: gantt.templates.task_date(currentStartDate),
                duration: taskObj.duration || 1,
                progress: 0,
                progress_percent: 0,
                owner: "",
                parent: nextRootWbs
            });
            currentStartDate.setDate(currentStartDate.getDate() + (taskObj.duration || 1));
        });

        setStatus('', '🟢 AI 일정 생성 완료');
    } catch (err) {
        console.error("AI Error:", err);
        alert("AI 작업 생성 중 오류가 발생했습니다.");
        setStatus('error', '🔴 AI 오류');
    }
}

window.analyzeProject = async function () {
    const tasks = gantt.getTaskByTime();
    if (tasks.length === 0) {
        alert("분석할 일정이 없습니다. 차트에 데이터를 추가해주세요.");
        return;
    }

    setStatus('saving', '✨ AI가 프로젝트를 분석 중입니다...');

    const taskSummaries = tasks.map(t =>
        `- ${t.wbs}: ${t.text} (담당: ${t.owner || '미정'}, 기간: ${t.start_date.toLocaleDateString()}~${t.end_date.toLocaleDateString()}, 진행률: ${Math.round((t.progress || 0) * 100)}%)`
    ).join('\n');

    const promptMsg = `다음은 현재 진행 중인 프로젝트 일정 데이터입니다:\n\n${taskSummaries}\n\n이 프로젝트의 전반적인 상태를 진단하고, 위험 요소나 병목이 예상되는 일정에 대해 3~4문장으로 짧고 명확하게 조언해주세요.`;

    try {
        const analysisText = await callGemini(promptMsg, false);
        document.getElementById('aiModalContent').innerText = analysisText;
        document.getElementById('aiModalOverlay').style.display = 'flex';
        setStatus('', '🟢 AI 진단 완료');
    } catch (err) {
        console.error("AI Error:", err);
        alert("AI 프로젝트 진단 중 오류가 발생했습니다.");
        setStatus('error', '🔴 AI 오류');
    }
}

// ---------------------------------------------------------
// [1] 환경 설정 (Config) 및 상태 관리
// ---------------------------------------------------------
let GOOGLE_APP_SCRIPT_URL = localStorage.getItem('GANTT_API_URL') || '';
let todayMarkerId = null;

const statusEl = document.getElementById('syncStatus');
function setStatus(state, msg) {
    statusEl.className = 'status-badge ' + state;
    statusEl.innerText = msg;
    if (state === 'saving') setTimeout(() => setStatus('', '🟢 엑셀에 저장됨'), 2000);
}

window.saveApiUrl = function () {
    const inputUrl = document.getElementById('apiUrlInput').value.trim();
    if (inputUrl) {
        localStorage.setItem('GANTT_API_URL', inputUrl);
        GOOGLE_APP_SCRIPT_URL = inputUrl;
        loadGanttData();
    } else {
        alert("웹 앱 URL을 입력해주세요.");
    }
}

window.addNewTask = function () {
    const rootTasks = gantt.getChildren(0);
    const newWbs = String(rootTasks.length + 1);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const newTask = {
        id: newWbs,
        wbs: newWbs,
        text: "새로운 작업",
        start_date: `${yyyy}-${mm}-${dd}`,
        duration: 3,
        progress: 0,
        progress_percent: 0,
        owner: ""
    };
    gantt.addTask(newTask);
    gantt.showLightbox(newTask.id);
}

// ---------------------------------------------------------
// [2] DHTMLX Gantt 초기 설정
// ---------------------------------------------------------
gantt.plugins({
    marker: true,
    inline_editors: true
});

gantt.config.date_format = "%Y-%m-%d";

gantt.config.grid_width = 550;

gantt.config.fit_tasks = true;
gantt.config.auto_scheduling = false;

gantt.config.scales = [
    { unit: "month", step: 1, format: "%Y년 %m월" },
    {
        unit: "day", step: 1, format: "%d", css: function (date) {
            if (date.getDay() === 0 || date.getDay() === 6) return "weekend-header";
            return "";
        }
    }
];
gantt.config.scale_height = 50;
gantt.config.min_column_width = 25;

var textEditor = { type: "text", map_to: "text" };
var ownerEditor = { type: "text", map_to: "owner" };
var dateEditor = { type: "date", map_to: "start_date" };
var endDateEditor = { type: "date", map_to: "end_date" };
var progressEditor = { type: "number", map_to: "progress_percent", min: 0, max: 100 };

gantt.config.columns = [
    { name: "wbs", label: "WBS", align: "center", width: 50, resize: true },
    { name: "text", label: "작업명(Task)", tree: true, width: 300, min_width: 150, resize: true, editor: textEditor },
    { name: "owner", label: "담당자", align: "center", width: 70, resize: true, editor: ownerEditor },
    { name: "start_date", label: "시작일", align: "center", width: 85, resize: true, editor: dateEditor },
    { name: "end_date", label: "종료일", align: "center", width: 85, resize: true, editor: endDateEditor },
    { name: "progress_percent", label: "진행률(%)", align: "center", width: 70, resize: true, editor: progressEditor, template: obj => (obj.progress_percent || 0) + "%" },
    { name: "add", label: "", width: 44 }
];

gantt.templates.timeline_cell_class = function (item, date) {
    if (date.getDay() === 0 || date.getDay() === 6) return "weekend";
    return "";
};

gantt.locale.labels.section_description = "작업명";
gantt.locale.labels.section_owner = "담당자";
gantt.locale.labels.section_time = "작업 기간";

gantt.config.lightbox.sections = [
    { name: "description", height: 38, map_to: "text", type: "textarea", focus: true },
    { name: "owner", height: 38, map_to: "owner", type: "textarea" },
    { name: "time", height: 72, type: "duration", map_to: "auto" }
];

gantt.init("gantt_here");

// ===== 패널 리사이저 + 커스텀 컬럼 리사이저 =====
setTimeout(function () {
    var ganttEl = document.getElementById('gantt_here');
    var gridEl  = ganttEl.querySelector('.gantt_grid');
    if (!gridEl) return;

    var gridCell     = gridEl.closest('.gantt_layout_cell') || gridEl.parentElement;
    var timelineCell = gridCell.nextElementSibling;
    gridCell.style.overflow = 'hidden';

    // 초기 너비 고정 (grid + timeline 합 = 패널 너비 재분배 기준)
    var initGridW     = gridCell.offsetWidth;
    var initTimelineW = timelineCell ? timelineCell.offsetWidth : 0;
    var totalPanelW   = initGridW + initTimelineW;

    // 컬럼 너비 합 계산 (우측 최대 리밋)
    function colTotalW() {
        return gantt.config.columns.reduce(function (s, c) { return s + (c.width || 0); }, 0);
    }
    var COL_WBS_W   = 50; // WBS 너비 = Task 경계 = 최솟값
    var currentPanelW = initGridW;

    // 패널 너비 DOM 적용 (render 없이)
    function applyPanel(w) {
        currentPanelW = w;
        gridCell.style.width = w + 'px';
        if (timelineCell) timelineCell.style.width = (totalPanelW - w) + 'px';
    }

    // gantt.render() 오버라이드 → 렌더 후 패널 너비·오버레이 재적용
    var _origRender = gantt.render.bind(gantt);
    gantt.render = function () {
        _origRender();
        gridEl       = ganttEl.querySelector('.gantt_grid');
        if (!gridEl) return;
        gridCell     = gridEl.closest('.gantt_layout_cell') || gridEl.parentElement;
        timelineCell = gridCell.nextElementSibling;
        gridCell.style.overflow = 'hidden';
        gridCell.style.width    = currentPanelW + 'px';
        if (timelineCell) timelineCell.style.width = (totalPanelW - currentPanelW) + 'px';
        if (panelResizer) panelResizer.style.left  = currentPanelW + 'px';
    };

    // ----- 패널 경계선 오버레이 -----
    var panelResizer = document.createElement('div');
    panelResizer.className = 'gantt-resizer-overlay';
    panelResizer.style.left = currentPanelW + 'px';
    ganttEl.appendChild(panelResizer);

    var pDrag = false, pStartX = 0, pStartW = 0, pPendingW = 0;

    panelResizer.addEventListener('mousedown', function (e) {
        pDrag    = true;
        pStartX  = e.clientX;
        pStartW  = currentPanelW;
        pPendingW = pStartW;
        document.body.style.cursor    = 'col-resize';
        document.body.style.userSelect = 'none';
        panelResizer.classList.add('dragging');
        e.stopPropagation(); e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!pDrag) return;
        pPendingW = Math.max(COL_WBS_W, Math.min(colTotalW(), pStartW + (e.clientX - pStartX)));
        applyPanel(pPendingW);
        panelResizer.style.left = pPendingW + 'px';
    });

    document.addEventListener('mouseup', function () {
        if (!pDrag) return;
        pDrag = false;
        document.body.style.cursor = document.body.style.userSelect = '';
        panelResizer.classList.remove('dragging');
        gantt.config.grid_width = pPendingW;
    });

    // ----- 커스텀 컬럼 리사이저 (ganttEl 위임 → render 후에도 유지) -----
    ganttEl.addEventListener('mousedown', function (e) {
        var scaleEl = ganttEl.querySelector('.gantt_grid_scale');
        if (!scaleEl || !scaleEl.contains(e.target)) return;

        var cells  = scaleEl.querySelectorAll('.gantt_grid_head_cell');
        var colIdx = -1, colStartW = 0;
        cells.forEach(function (cell, idx) {
            if (idx >= gantt.config.columns.length - 1) return;
            var rect = cell.getBoundingClientRect();
            if (Math.abs(e.clientX - rect.right) <= 5) {
                colIdx   = idx;
                colStartW = gantt.config.columns[idx].width || rect.width;
            }
        });
        if (colIdx < 0) return;

        e.stopPropagation(); e.preventDefault();
        var colStartX = e.clientX, rafId = null;
        document.body.style.cursor = document.body.style.userSelect = 'col-resize';

        function onMove(e) {
            gantt.config.columns[colIdx].width = Math.max(30, colStartW + (e.clientX - colStartX));
            if (rafId) return;
            rafId = requestAnimationFrame(function () { rafId = null; gantt.render(); });
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = document.body.style.userSelect = '';
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            gantt.render();
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

}, 100);

// ---------------------------------------------------------
// [2.5] 지연 사유 입력 로직
// ---------------------------------------------------------
let originalEndDates = {};

gantt.attachEvent("onBeforeTaskDrag", function (id, mode, e) {
    let task = gantt.getTask(id);
    originalEndDates[id] = task.end_date.getTime();
    return true;
});

gantt.attachEvent("onBeforeTaskChanged", function (id, mode, task) {
    let origEnd = originalEndDates[id];
    if (origEnd && task.end_date.getTime() > origEnd) {
        let reason = prompt("기존 일정보다 종료일이 지연되었습니다.\n지연 사유를 간략히 입력해주세요:", "");
        if (reason !== null && reason.trim() !== "") {
            task.text = task.text + " [지연: " + reason.trim() + "]";
        }
    }
    return true;
});

// ---------------------------------------------------------
// [3] 데이터 가공 로직 (WBS 기반 트리 구조 형성)
// ---------------------------------------------------------
function fixDateStr(ds) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const fallbackDate = `${yyyy}-${mm}-${dd}`;

    if (!ds) return fallbackDate;
    let str = String(ds).trim();
    if (str === "") return fallbackDate;
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10);

    str = str.replace(/\s/g, '');
    let parts = str.split(/[\.\-\/]/).filter(p => p);

    if (parts.length >= 3) {
        let y = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let d = parseInt(parts[2]);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return fallbackDate;
        if (y < 100) y += 2000;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return fallbackDate;
}

function transformData(sheetData) {
    if (!sheetData || !sheetData.data) return { data: [], links: [] };

    let finalTasks = sheetData.data.map(item => {
        let wbsStr = String(item.wbs).trim();
        let parentWbs = 0;
        if (wbsStr.includes('.')) {
            parentWbs = wbsStr.substring(0, wbsStr.lastIndexOf('.'));
        }
        return {
            id: wbsStr,
            wbs: wbsStr,
            text: item.text,
            owner: item.owner || "",
            start_date: fixDateStr(item.start_date),
            end_date: fixDateStr(item.end_date),
            progress: item.progress || 0,
            progress_percent: Math.round((item.progress || 0) * 100),
            parent: parentWbs,
            open: true
        };
    });

    return { data: finalTasks, links: sheetData.links || [] };
}

// ---------------------------------------------------------
// [4] 수동 데이터 로드
// ---------------------------------------------------------
function renderGanttWithData(data) {
    const ganttData = transformData(data);

    const openStates = {};
    gantt.eachTask(function (task) { openStates[task.id] = task.$open; });

    gantt.clearAll();
    todayMarkerId = null;
    gantt.parse(ganttData);

    gantt.eachTask(function (task) { if (openStates[task.id]) gantt.open(task.id); });

    if (ganttData.data.length === 0) gantt.render();

    if (gantt.addMarker) {
        todayMarkerId = gantt.addMarker({ start_date: new Date(), css: "today_marker", text: "오늘", title: "오늘 날짜" });
    }
}

window.loadGanttData = function () {
    if (!GOOGLE_APP_SCRIPT_URL) {
        setStatus('error', '🔴 상단에 URL을 입력해주세요.');
        return;
    }
    setStatus('saving', '데이터를 불러오는 중...');

    fetch(GOOGLE_APP_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            renderGanttWithData(data);
            setStatus('', '🟢 엑셀 데이터 로드 완료');
        })
        .catch(err => setStatus('error', '🔴 데이터 로드 실패 (안내창 확인)'));
}

// ---------------------------------------------------------
// [5] 구글 시트로 데이터 전송
// ---------------------------------------------------------
function syncToGoogleSheets(action, item) {
    if (!GOOGLE_APP_SCRIPT_URL) return;

    setStatus('saving', '⏳ 엑셀에 저장 중...');

    if (item.start_date) item.start_date_str = gantt.templates.task_date(item.start_date);
    if (item.end_date) item.end_date_str = gantt.templates.task_date(item.end_date);

    fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action, payload: item })
    }).then(() => {
        setStatus('saving', '⏳ 엑셀에 저장 중...');
    }).catch(err => {
        setStatus('error', '🔴 저장 실패');
    });
}

// ---------------------------------------------------------
// [6] 이벤트 리스너 및 초기화
// ---------------------------------------------------------
gantt.attachEvent("onTaskCreated", function (task) {
    task.text = "새로운 작업";
    task.owner = "";
    task.progress = 0;
    task.progress_percent = 0;

    if (task.parent && task.parent !== 0) {
        let parentTask = gantt.getTask(task.parent);
        let children = gantt.getChildren(task.parent);
        task.wbs = parentTask.wbs + "." + (children.length + 1);
    } else {
        let rootTasks = gantt.getChildren(0);
        task.wbs = String(rootTasks.length + 1);
    }
    task.id = task.wbs;

    if (!task.start_date) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        task.start_date = `${yyyy}-${mm}-${dd}`;
    }
    if (!task.duration) task.duration = 3;
    return true;
});

gantt.attachEvent("onAfterTaskAdd", function (id, item) {
    syncToGoogleSheets('ADD_TASK', item);
});

gantt.attachEvent("onAfterTaskUpdate", function (id, item) {
    if (item.progress_percent !== undefined) {
        item.progress = item.progress_percent / 100;
    }
    syncToGoogleSheets('UPDATE_TASK', item);
});

gantt.attachEvent("onAfterTaskDelete", function (id, item) {
    syncToGoogleSheets('DELETE_TASK', { id: id });
});

gantt.attachEvent("onAfterLinkAdd", function (id, item) {
    syncToGoogleSheets('ADD_LINK', item);
});

gantt.attachEvent("onAfterLinkDelete", function (id, item) {
    syncToGoogleSheets('DELETE_LINK', { id: id });
});

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('apiUrlInput').value = GOOGLE_APP_SCRIPT_URL;
    loadGanttData();
});
