/*
 * 程序功能：管理课表数据、教学周计算、视图切换、PWA 安装和离线状态。
 * 使用方法：由 index.html 自动加载，无需手动执行。
 */

/* 可修改参数：学期第 1 周周一、总周数和课表数据 */
const CONFIG = {
  semesterStart: "2026-09-07T00:00:00+08:00",
  totalWeeks: 20,
  termName: "2026 年秋季学期"
};

/* 可修改参数：每节课的具体时间；如教务系统时间有调整，只需修改这里 */
const sectionTimes = {
  1: "08:30–09:15", 2: "09:20–10:05", 3: "10:25–11:10", 4: "11:15–12:00",
  5: "13:30–14:15", 6: "14:20–15:05", 7: "15:25–16:10", 8: "16:15–17:00",
  9: "17:05–17:50", 10: "18:30–19:15", 11: "19:20–20:05", 12: "20:15–21:00",
  13: "21:05–21:50"
};

const courses = [
  { day: 1, sections: "3–4", name: "英语B-40班（怀）-高级听说", place: "学园一418", weeks: range(2, 17) },
  { day: 1, sections: "7–9", name: "高等集成电路设计与EDA", place: "教一楼405", weeks: [...range(2, 4), ...range(6, 20)] },
  { day: 2, sections: "3–4", name: "英语B-230班（怀）-高级写作", place: "教一楼225", weeks: [...range(2, 5), ...range(7, 17)] },
  { day: 2, sections: "12–13", name: "英语B-230班（怀）-高级写作", place: "教一楼214", weeks: [7], note: "第7周加课" },
  { day: 2, sections: "5–6", name: "学术道德与学术写作规范-通论", place: "教一楼009", weeks: range(13, 17) },
  { day: 2, sections: "10–12", name: "高等核电子学", place: "教二楼418", weeks: range(7, 16) },
  { day: 3, sections: "1–4", name: "自然辩证法概论", place: "教一楼002", weeks: [...range(2, 5), ...range(7, 10)] },
  { day: 3, sections: "5–7", name: "全球视野下的中国航天史", place: "学园二402", weeks: [...range(2, 5), ...range(7, 16)] },
  { day: 4, sections: "5–7", name: "超大规模集成电路基础", place: "教一楼208", weeks: [...range(2, 4), ...range(6, 17)] },
  { day: 4, sections: "10–12", name: "高等核电子学", place: "教二楼418", weeks: range(6, 15) },
  { day: 5, sections: "1–3", name: "核物理实验方法", place: "教二楼329", weeks: [...range(2, 3), ...range(5, 20)] },
  { day: 5, sections: "5–7", name: "高等数字集成电路分析与设计", place: "教一楼225", weeks: [2, ...range(4, 20)] },
  { day: 6, sections: "1–4", name: "自然辩证法概论", place: "教一楼002", weeks: [6], note: "补课" },
  { day: 6, sections: "3–4", name: "学术道德与学术写作规范-分论", place: "教二楼106", weeks: range(7, 11) },
  { day: 6, sections: "5–7", name: "全球视野下的中国航天史", place: "学园二402", weeks: [6], note: "补课" },
  { day: 6, sections: "5–8", name: "新时代中国特色社会主义理论与实践", place: "教一楼002", weeks: [...range(2, 5), ...range(7, 10)] },
  { day: 7, sections: "10–12", name: "高等数字集成电路分析与设计", place: "教一楼225", weeks: [7, 9, 11, 13] }
];

const dayNames = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const state = { view: "week", selectedWeek: clamp(getCurrentWeek(), 1, CONFIG.totalWeeks) };
let deferredInstallPrompt = null;

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getCurrentWeek() {
  const start = new Date(CONFIG.semesterStart);
  const now = new Date();
  return Math.floor((startOfDay(now) - startOfDay(start)) / 604800000) + 1;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateForWeekDay(week, day) {
  const date = new Date(CONFIG.semesterStart);
  date.setDate(date.getDate() + (week - 1) * 7 + day - 1);
  return date;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatToday(date) {
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${dayNames[weekday]}`;
}

function sectionStart(value) {
  return Number.parseInt(value.split(/[–-]/)[0], 10);
}

function sectionEnd(value) {
  const parts = value.split(/[–-]/);
  return Number.parseInt(parts[parts.length - 1], 10);
}

function courseTime(value) {
  const start = sectionStart(value);
  const end = sectionEnd(value);
  return `${sectionTimes[start].split("–")[0]}–${sectionTimes[end].split("–")[1]}`;
}

function courseCard(course, showWeeks = false) {
  const detail = showWeeks ? `<span class="pill">${compressWeeks(course.weeks)}</span>` : "";
  const note = course.note ? `<span class="pill">${course.note}</span>` : "";
  return `
    <article class="course">
      <div class="course__time"><strong>${course.sections}</strong><span>节</span></div>
      <div>
        <h3 class="course__name">${course.name}</h3>
        <div class="course__meta"><span class="pill pill--place">${course.place}</span>${detail}${note}</div>
      </div>
    </article>`;
}

function compressWeeks(weeks) {
  const groups = [];
  let start = weeks[0];
  let previous = weeks[0];
  for (let index = 1; index <= weeks.length; index += 1) {
    const current = weeks[index];
    if (current !== previous + 1) {
      groups.push(start === previous ? `${start}` : `${start}–${previous}`);
      start = current;
    }
    previous = current;
  }
  return `第${groups.join("、")}周`;
}

function renderDay(day, items, week, showWeeks = false) {
  const date = dateForWeekDay(week, day);
  const now = new Date();
  const todayClass = startOfDay(date).getTime() === startOfDay(now).getTime() ? " is-today" : "";
  const dateLabel = showWeeks ? `${items.length} 个时段` : formatMonthDay(date);
  return `
    <section class="day-card${todayClass}">
      <header class="day-heading"><h2>${dayNames[day]}</h2><span>${dateLabel}</span></header>
      ${items.sort((a, b) => sectionStart(a.sections) - sectionStart(b.sections)).map(item => courseCard(item, showWeeks)).join("")}
    </section>`;
}

function courseColor(name) {
  const palettes = ["coral", "teal", "blue", "amber", "violet", "green"];
  const value = Array.from(name).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return palettes[value % palettes.length];
}

function renderWeekGrid(week) {
  const weekCourses = courses.filter(course => course.weeks.includes(week));
  const headers = range(1, 7).map(day => {
    const date = dateForWeekDay(week, day);
    const now = new Date();
    const todayClass = startOfDay(date).getTime() === startOfDay(now).getTime() ? " is-today" : "";
    return `<div class="grid-day${todayClass}" style="grid-column:${day + 1}"><strong>${dayNames[day]}</strong><span>${date.getMonth() + 1}/${date.getDate()}</span></div>`;
  }).join("");
  const times = range(1, 13).map(section => `
    <div class="grid-time" style="grid-row:${section + 1}">
      <strong>${section}</strong><span>${sectionTimes[section].replace("–", "<br>")}</span>
    </div>`).join("");
  const cells = range(1, 7).flatMap(day => range(1, 13).map(section =>
    `<div class="grid-cell" style="grid-column:${day + 1};grid-row:${section + 1}"></div>`
  )).join("");
  const blocks = weekCourses.map(course => {
    const start = sectionStart(course.sections);
    const end = sectionEnd(course.sections);
    return `
      <article class="grid-course grid-course--${courseColor(course.name)}" style="grid-column:${course.day + 1};grid-row:${start + 1}/${end + 2}">
        <strong>${course.name}</strong>
        <span class="grid-course__place">${course.place}</span>
        <span class="grid-course__time">${courseTime(course.sections)} · ${course.sections}节</span>
      </article>`;
  }).join("");
  return `
    <div class="timetable-hint">← 左右滑动查看一周 →</div>
    <div class="timetable-scroll">
      <div class="timetable-grid">
        <div class="grid-corner"><strong>节次</strong><span>时间</span></div>
        ${headers}${cells}${times}${blocks}
      </div>
    </div>`;
}

function render() {
  const schedule = document.querySelector("#schedule");
  const summary = document.querySelector("#summary");
  const weekControls = document.querySelector("#weekControls");
  const now = new Date();
  const todayDay = now.getDay() === 0 ? 7 : now.getDay();
  let html = "";

  weekControls.hidden = state.view === "today";

  if (state.view === "today") {
    const currentWeek = getCurrentWeek();
    const items = courses.filter(course => course.day === todayDay && course.weeks.includes(currentWeek));
    summary.textContent = currentWeek < 1 || currentWeek > CONFIG.totalWeeks ? "当前日期不在本学期教学周内" : `第 ${currentWeek} 教学周 · 今天 ${items.length} 节课程安排`;
    html = items.length ? renderDay(todayDay, items, currentWeek) : emptyState("今天没有课", "给自己留一点自由时间。🫖");
  } else if (state.view === "week") {
    const grouped = groupByDay(courses.filter(course => course.weeks.includes(state.selectedWeek)));
    summary.textContent = `本周共 ${Object.values(grouped).reduce((sum, items) => sum + items.length, 0)} 个上课时段`;
    html = Object.keys(grouped).length ? renderWeekGrid(state.selectedWeek) : emptyState("本周没有课", "这一周暂时没有课程安排。");
  } else {
    const grouped = groupByDay(courses);
    summary.textContent = "显示整个学期的固定课程与特殊安排";
    html = Object.entries(grouped).map(([day, items]) => renderDay(Number(day), items, 1, true)).join("");
  }

  schedule.innerHTML = html;
  updateWeekControls();
}

function groupByDay(items) {
  return items.reduce((groups, item) => {
    (groups[item.day] ||= []).push(item);
    return groups;
  }, {});
}

function emptyState(title, detail) {
  return `<div class="empty"><strong>${title}</strong><span>${detail}</span></div>`;
}

function updateWeekControls() {
  const start = dateForWeekDay(state.selectedWeek, 1);
  const end = dateForWeekDay(state.selectedWeek, 7);
  document.querySelector("#selectedWeekLabel").textContent = `第 ${state.selectedWeek} 周`;
  document.querySelector("#selectedWeekDates").textContent = `${formatMonthDay(start)}—${formatMonthDay(end)}`;
  document.querySelector("#weekSelect").value = String(state.selectedWeek);
  document.querySelector("#previousWeek").disabled = state.selectedWeek === 1;
  document.querySelector("#nextWeek").disabled = state.selectedWeek === CONFIG.totalWeeks;
}

function initialize() {
  const now = new Date();
  const currentWeek = getCurrentWeek();
  document.querySelector("#currentDate").textContent = formatToday(now);
  document.querySelector("#currentWeek").textContent = currentWeek >= 1 && currentWeek <= CONFIG.totalWeeks ? currentWeek : "—";
  document.querySelector("#statusLabel").textContent = currentWeek >= 1 && currentWeek <= CONFIG.totalWeeks ? CONFIG.termName : "非教学周";

  const select = document.querySelector("#weekSelect");
  select.innerHTML = range(1, CONFIG.totalWeeks).map(week => `<option value="${week}">第 ${week} 周</option>`).join("");

  document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
    state.view = button.dataset.view;
    document.querySelectorAll(".tab").forEach(item => item.classList.toggle("is-active", item === button));
    render();
  }));

  document.querySelector("#previousWeek").addEventListener("click", () => { state.selectedWeek -= 1; render(); });
  document.querySelector("#nextWeek").addEventListener("click", () => { state.selectedWeek += 1; render(); });
  document.querySelector("#weekPickerButton").addEventListener("click", () => {
    select.style.pointerEvents = "auto";
    select.showPicker?.();
    select.focus();
  });
  select.addEventListener("change", event => {
    state.selectedWeek = Number(event.target.value);
    select.style.pointerEvents = "none";
    render();
  });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    document.querySelector("#installButton").hidden = false;
  });
  document.querySelector("#installButton").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    document.querySelector("#installButton").hidden = true;
  });

  window.addEventListener("offline", updateConnectionState);
  window.addEventListener("online", updateConnectionState);
  updateConnectionState();
  render();
}

function updateConnectionState() {
  document.querySelector("#offlineState").textContent = navigator.onLine ? "可离线使用" : "当前为离线模式";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}

initialize();
