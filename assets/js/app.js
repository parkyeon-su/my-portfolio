/* =========================================================
   Career Notebook — app.js
   - 해시 라우팅 SPA (#/dashboard, #/companies/hanmi ...)
   - data.js(기본값) + localStorage(브라우저 수정분)를 id 기준으로 병합
   ========================================================= */
(() => {
  "use strict";

  const BASE = window.SITE_DATA;
  const STORE_KEY = "career-notebook-overlay-v1";
  const COLLECTIONS = ["companies", "events", "todos", "news", "quotes"];

  const STATUSES = [
    { key: "interest",  label: "관심",        tone: "gray",  color: "#cfc8bd" },
    { key: "writing",   label: "작성중",      tone: "sand",  color: "#d2b48c" },
    { key: "submitted", label: "서류제출",    tone: "navy",  color: "#9fb1cb" },
    { key: "passed",    label: "서류합격",    tone: "navy",  color: "#6f88ab" },
    { key: "test",      label: "인적성/코테", tone: "navy",  color: "#4f6b92" },
    { key: "interview", label: "면접",        tone: "navy",  color: "#2d4363" },
    { key: "offer",     label: "최종합격",    tone: "green", color: "#4f7a5e" },
    { key: "rejected",  label: "불합격",      tone: "red",   color: "#c99a94" },
    { key: "dropped",   label: "포기",        tone: "gray",  color: "#b9b2a7" },
  ];
  const ACTIVE = ["submitted", "passed", "test", "interview"];

  const EVENT_TYPES = {
    deadline:  { label: "서류마감",    bg: "#f4e2df", fg: "#a85a52" },
    test:      { label: "인적성/코테", bg: "#f2e6d6", fg: "#946a3c" },
    interview: { label: "면접",        bg: "#dfe6f0", fg: "#2d4363" },
    result:    { label: "발표",        bg: "#e3eee6", fg: "#4f7a5e" },
    event:     { label: "설명회/행사", bg: "#ece8e1", fg: "#6f6a62" },
    etc:       { label: "기타",        bg: "#eef2f7", fg: "#3f5b82" },
  };

  /* ---------------- Store ---------------- */
  const loadOverlay = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  };
  let overlay = loadOverlay();
  COLLECTIONS.forEach((k) => (overlay[k] = overlay[k] || {}));
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(overlay)); } catch {} };

  function list(name) {
    const map = new Map((BASE[name] || []).map((x) => [x.id, x]));
    for (const [id, v] of Object.entries(overlay[name] || {})) v === null ? map.delete(id) : map.set(id, v);
    return [...map.values()];
  }
  const get = (name, id) => list(name).find((x) => x.id === id);
  const upsert = (name, obj) => { overlay[name][obj.id] = obj; persist(); };
  const remove = (name, id) => { overlay[name][id] = null; persist(); };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- Helpers ---------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const today = () => ymd(new Date());
  const daysUntil = (s) => Math.round((parseDate(s) - parseDate(today())) / 86400000);
  const isFullDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  const dot = (s) => (s ? s.replaceAll("-", ".") : "");
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split("."); let cur = o; ks.slice(0, -1).forEach((k) => (cur = cur[k] = cur[k] || {})); cur[ks.at(-1)] = v; };
  const statusOf = (k) => STATUSES.find((s) => s.key === k) || STATUSES[0];
  const badge = (k) => { const s = statusOf(k); return `<span class="badge tone-${s.tone}">${s.label}</span>`; };
  const initials = (name) => esc((name || "?").replace(/[()\s]/g, "").slice(0, 2));

  function ddayHTML(date) {
    const n = daysUntil(date);
    const cls = n < 0 ? "past" : n <= 3 ? "urgent" : "";
    return `<span class="dday ${cls}">${n === 0 ? "D-DAY" : n > 0 ? `D-${n}` : `D+${-n}`}</span>`;
  }

  /** 간단한 텍스트 서식: "- " 글머리, **굵게**, 줄바꿈 */
  function fmt(t, emptyText = "아직 작성하지 않았어요.") {
    if (!t || !String(t).trim()) return `<p class="placeholder">${emptyText}</p>`;
    let html = "", inList = false;
    for (const line of esc(t).split("\n")) {
      const m = line.match(/^\s*[-•]\s+(.*)/);
      if (m) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${m[1]}</li>`; }
      else { if (inList) { html += "</ul>"; inList = false; } if (line.trim()) html += `<p>${line}</p>`; }
    }
    if (inList) html += "</ul>";
    return html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  const ICONS = {
    dashboard: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    strengths: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    applications: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    companies: '<path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M16 9h2a2 2 0 012 2v10M8 7h4M8 11h4M8 15h4M3 21h18"/>',
    essays: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    news: '<path d="M4 5h13v14a2 2 0 002 2H6a2 2 0 01-2-2z"/><path d="M17 9h3v10a2 2 0 01-2 2M8 9h5M8 13h5M8 17h3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

  const NAV = [
    { group: "개요" },
    { route: "dashboard", label: "대시보드" },
    { route: "profile", label: "프로필" },
    { route: "strengths", label: "강점 · 경험" },
    { group: "취업 준비" },
    { route: "calendar", label: "취업 달력" },
    { route: "applications", label: "지원 현황" },
    { route: "companies", label: "기업 분석" },
    { route: "news", label: "뉴스 · 이슈" },
    { route: "essays", label: "자소서 보관함" },
  ];

  /* 기업 분석 완성도 계산 항목 */
  const COMPLETENESS = [
    "analysis.overview", "analysis.business", "analysis.financials", "analysis.strategy",
    "analysis.talent", "analysis.competitors", "analysis.swot", "jobFit.job", "jobFit.fit",
    "issues", "applications", "interview",
  ];
  function completeness(c) {
    const filled = COMPLETENESS.filter((p) => {
      const v = getPath(c, p);
      if (Array.isArray(v)) return v.length > 0;
      if (v && typeof v === "object") return Object.values(v).some((x) => String(x || "").trim());
      return String(v || "").trim().length > 0;
    }).length;
    return Math.round((filled / COMPLETENESS.length) * 100);
  }

  /** 일정 + 기업 마감일(자동) */
  function allEvents() {
    const evs = list("events");
    list("companies").forEach((c) => {
      if (isFullDate(c.deadline)) evs.push({ id: `auto-${c.id}`, date: c.deadline, type: "deadline", title: `${c.name} 서류 마감`, companyId: c.id, auto: true });
    });
    return evs.sort((a, b) => a.date.localeCompare(b.date));
  }
  const companyName = (id) => get("companies", id)?.name || "";

  /* ---------------- UI shell ---------------- */
  function renderNav() {
    $("#nav").innerHTML = NAV.map((n) =>
      n.group ? `<div class="nav-label">${n.group}</div>` : `<a href="#/${n.route}" data-route="${n.route}">${icon(n.route)}<span>${n.label}</span></a>`
    ).join("");
  }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  let modalSubmit = null, modalDelete = null;
  function openModal({ title, body, wide = false, onSubmit, onDelete, submitLabel = "저장" }) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    $(".modal").classList.toggle("wide", wide);
    $("#modalFoot").innerHTML = `
      ${onDelete ? `<button class="btn danger" data-action="modal-delete">삭제</button>` : ""}
      <div class="right"><button class="btn ghost" data-action="modal-close">취소</button>
      <button class="btn" data-action="modal-submit">${submitLabel}</button></div>`;
    modalSubmit = onSubmit; modalDelete = onDelete;
    $("#modal").hidden = false;
    setTimeout(() => $("#modalBody input, #modalBody textarea, #modalBody select")?.focus(), 30);
  }
  const closeModal = () => { $("#modal").hidden = true; modalSubmit = modalDelete = null; };

  /* ---------------- Form builder ---------------- */
  function inputHTML(name, type, value) {
    const v = esc(value ?? "");
    if (type === "status") return `<select class="input" name="${name}">${STATUSES.map((s) => `<option value="${s.key}" ${s.key === value ? "selected" : ""}>${s.label}</option>`).join("")}</select>`;
    if (type === "evtype") return `<select class="input" name="${name}">${Object.entries(EVENT_TYPES).map(([k, t]) => `<option value="${k}" ${k === value ? "selected" : ""}>${t.label}</option>`).join("")}</select>`;
    if (type === "company") return `<select class="input" name="${name}"><option value="">(선택 안 함)</option>${list("companies").map((c) => `<option value="${c.id}" ${c.id === value ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`;
    if (type.startsWith("area")) { const size = type.split("-")[1] || ""; return `<textarea class="input ${size}" name="${name}">${v}</textarea>`; }
    return `<input class="input" type="${type}" name="${name}" value="${v}">`;
  }
  function fieldHTML([name, label, type, opts = {}], value) {
    return `<div class="field ${opts.full || type.startsWith("area") ? "full" : ""}"><label>${label}</label>${inputHTML(name, type, value)}${opts.hint ? `<span class="hint">${opts.hint}</span>` : ""}</div>`;
  }

  const LISTS = {
    issues: { add: "+ 이슈 추가", fields: [["date", "날짜 (예: 2026-10)", "text"], ["title", "제목", "text"], ["note", "내용 · 내 생각", "area-sm"]] },
    applications: { add: "+ 문항 추가", fields: [["q", "문항", "text", { full: true }], ["limit", "글자수 제한", "number"], ["a", "답변", "area-lg"]] },
    interview: { add: "+ 질문 추가", fields: [["q", "질문", "text", { full: true }], ["a", "답변 포인트", "area-sm"]] },
    links: { add: "+ 링크 추가", fields: [["label", "이름 (예: 최종 제출본 PDF)", "text"], ["url", "URL 또는 파일 경로", "text"]] },
  };
  const repRow = (key, item = {}) => `
    <div class="rep-row" data-list="${key}">
      <button type="button" class="icon-btn rm" data-action="rep-remove" title="삭제">×</button>
      <div class="form-grid">${LISTS[key].fields.map((f) => fieldHTML(f, item[f[0]])).join("")}</div>
    </div>`;
  const repHTML = (key, items = []) => `
    <div class="rep" data-rep="${key}">${items.map((it) => repRow(key, it)).join("")}</div>
    <button type="button" class="btn ghost sm" data-action="rep-add" data-key="${key}">${LISTS[key].add}</button>`;
  const collectRep = (key) => $$(`.rep-row[data-list="${key}"]`).map((row) => {
    const o = {};
    LISTS[key].fields.forEach(([n, , t]) => { const v = row.querySelector(`[name="${n}"]`).value.trim(); o[n] = t === "number" ? (v ? Number(v) : null) : v; });
    return o;
  }).filter((o) => Object.values(o).some((v) => v !== null && v !== ""));

  /* 기업 편집 섹션 정의 — 탭별로 해당 섹션만 편집 */
  const SECTIONS = {
    basic: { title: "기본 정보 · 지원 상태", fields: [
      ["name", "기업명", "text"], ["industry", "업종", "text"],
      ["role", "지원 직무", "text"], ["status", "진행 상태", "status"],
      ["resultNote", "결과 메모 (예: SKCT 탈락, 1차 면접 대기)", "text", { full: true }],
      ["appliedAt", "지원일", "date"], ["deadline", "서류 마감일", "date", { hint: "입력하면 달력에 자동 표시돼요" }],
      ["url", "채용공고 링크", "url", { full: true }], ["summary", "한 줄 요약", "text", { full: true }],
    ] },
    analysis: { title: "기업 분석", wide: true, fields: [
      ["analysis.overview", "기업 개요 (비전 · 규모 · 계열)", "area"],
      ["analysis.business", "사업 구조 · 주력 제품", "area"],
      ["analysis.financials", "실적 · 재무 포인트", "area"],
      ["analysis.strategy", "전략 · 미래 방향 · 투자", "area"],
      ["analysis.talent", "인재상 · 핵심가치", "area"],
      ["analysis.competitors", "경쟁사 · 업계 비교", "area"],
      ["analysis.swot.s", "SWOT — Strength", "area-sm"], ["analysis.swot.w", "SWOT — Weakness", "area-sm"],
      ["analysis.swot.o", "SWOT — Opportunity", "area-sm"], ["analysis.swot.t", "SWOT — Threat", "area-sm"],
    ], list: "issues", listTitle: "최근 이슈 · 뉴스" },
    fit: { title: "직무 · 나와의 연결고리", wide: true, fields: [
      ["jobFit.job", "직무 분석 (하는 일 · 필요 역량)", "area"],
      ["jobFit.fit", "내 경험 매칭", "area"],
      ["jobFit.why", "지원 동기 핵심 문장", "area-sm"],
    ] },
    apps: { title: "자소서 문항", wide: true, fields: [], list: "applications" },
    interview: { title: "면접 준비", wide: true, fields: [], list: "interview" },
    files: { title: "자료 · 메모", wide: true, fields: [["memo", "메모", "area"]], list: "links", listTitle: "지원서 · 자료 링크" },
  };

  function editCompany(id, section = "basic") {
    const isNew = !id;
    const c = isNew ? { ...clone(blankCompany()), id: uid("co") } : clone(get("companies", id));
    const sec = isNew ? SECTIONS.basic : SECTIONS[section];
    const body = `
      <div class="form-grid">${sec.fields.map((f) => fieldHTML(f, getPath(c, f[0]))).join("")}</div>
      ${sec.list ? `${sec.listTitle ? `<div class="field"><label>${sec.listTitle}</label></div>` : ""}${repHTML(sec.list, c[sec.list] || [])}` : ""}
      <p class="hint" style="font-size:12px;color:var(--muted);margin-top:14px">"- "로 시작하면 글머리 목록, **텍스트**는 굵게 표시돼요.</p>`;
    openModal({
      title: isNew ? "기업 추가" : `${c.name} · ${sec.title}`,
      body, wide: !!sec.wide,
      onSubmit: () => {
        sec.fields.forEach(([n]) => setPath(c, n, $(`#modalBody [name="${n}"]`).value.trim()));
        if (sec.list) c[sec.list] = collectRep(sec.list);
        if (!c.name) return toast("기업명을 입력해 주세요");
        upsert("companies", c); closeModal(); toast("저장했어요");
        if (isNew) location.hash = `#/companies/${c.id}`; else render();
      },
      onDelete: isNew || section !== "basic" ? null : () => {
        if (!confirm(`${c.name}을(를) 삭제할까요?`)) return;
        remove("companies", c.id); closeModal(); location.hash = "#/companies"; toast("삭제했어요");
      },
    });
  }
  function blankCompany() {
    return {
      name: "", industry: "", role: "", status: "interest", appliedAt: "", deadline: "", url: "", summary: "",
      analysis: { overview: "", business: "", financials: "", strategy: "", talent: "", competitors: "", swot: { s: "", w: "", o: "", t: "" } },
      jobFit: { job: "", fit: "", why: "" }, issues: [], applications: [], interview: [], links: [], memo: "",
    };
  }

  function editEvent(id, presetDate) {
    const isNew = !id;
    const ev = isNew ? { id: uid("ev"), date: presetDate || today(), type: "deadline", title: "", companyId: "", memo: "" } : clone(get("events", id));
    const fields = [["date", "날짜", "date"], ["type", "종류", "evtype"], ["title", "제목", "text", { full: true }], ["companyId", "관련 기업", "company"], ["time", "시간 (선택)", "time"], ["memo", "메모", "area-sm"]];
    openModal({
      title: isNew ? "일정 추가" : "일정 수정",
      body: `<div class="form-grid">${fields.map((f) => fieldHTML(f, ev[f[0]])).join("")}</div>`,
      onSubmit: () => {
        fields.forEach(([n]) => (ev[n] = $(`#modalBody [name="${n}"]`).value.trim()));
        if (!ev.date || !ev.title) return toast("날짜와 제목을 입력해 주세요");
        upsert("events", ev); closeModal(); render(); toast("저장했어요");
      },
      onDelete: isNew ? null : () => { remove("events", ev.id); closeModal(); render(); toast("삭제했어요"); },
    });
  }

  /* ---------------- Views ---------------- */
  const P = BASE.profile;
  const pageHead = (eyebrow, title, sub, actions = "") => `
    <div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>
    ${actions ? `<div class="head-actions">${actions}</div>` : ""}</div>`;

  function eventItem(ev) {
    const d = parseDate(ev.date), t = EVENT_TYPES[ev.type] || EVENT_TYPES.etc;
    const attr = ev.auto ? `href="#/companies/${ev.companyId}"` : `data-action="edit-event" data-id="${ev.id}"`;
    return `<a class="list-item" ${attr} style="color:inherit;text-decoration:none;cursor:pointer">
      <div class="date-box"><b>${d.getDate()}</b><span>${d.getMonth() + 1}월 ${"일월화수목금토"[d.getDay()]}</span></div>
      <div class="grow"><div class="title">${esc(ev.title)}</div>
        <div class="desc"><span class="badge" style="background:${t.bg};color:${t.fg}">${t.label}</span> ${ev.time ? esc(ev.time) : ""} ${ev.companyId && !ev.auto ? esc(companyName(ev.companyId)) : ""}</div></div>
      ${ddayHTML(ev.date)}</a>`;
  }

  /* 오늘의 구절: 날짜 기준으로 매일 하나씩 돌아가며 표시 */
  function todayQuote() {
    const qs = list("quotes");
    if (!qs.length) return null;
    const day = Math.floor(parseDate(today()).getTime() / 86400000);
    return qs[((day % qs.length) + qs.length) % qs.length];
  }

  const newsSearchLinks = (name) => [
    ["네이버 뉴스", `https://search.naver.com/search.naver?where=news&sort=1&query=${encodeURIComponent(name)}`],
    ["구글 뉴스", `https://news.google.com/search?q=${encodeURIComponent(name)}&hl=ko&gl=KR&ceid=KR:ko`],
    ["채용공고", `https://www.saramin.co.kr/zf_user/search?searchword=${encodeURIComponent(name)}`],
  ];

  function newsCard(nw) {
    return `<article class="news-card">
      <div class="news-meta"><span>${esc(nw.source || "")}</span><span>${esc(dot(nw.date))}</span></div>
      <h4>${nw.url ? `<a href="${esc(nw.url)}" target="_blank" rel="noopener">${esc(nw.title)}</a>` : esc(nw.title)}</h4>
      ${nw.summary ? `<p>${esc(nw.summary)}</p>` : ""}
      <div class="news-foot">
        ${nw.companyId ? `<a class="chip" href="#/companies/${nw.companyId}">${esc(companyName(nw.companyId))}</a>` : "<span></span>"}
        <span>${nw.url ? `<a href="${esc(nw.url)}" target="_blank" rel="noopener">기사 ↗</a>` : ""}<button class="icon-btn" data-action="edit-news" data-id="${nw.id}" title="수정">✎</button></span>
      </div></article>`;
  }
  const sortedNews = () => list("news").sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  function viewDashboard() {
    const cs = list("companies"), todos = list("todos"), q = todayQuote(), now = new Date();
    const evs = allEvents().filter((e) => daysUntil(e.date) >= 0);
    const pipe = STATUSES.map((s) => ({ ...s, n: cs.filter((c) => c.status === s.key).length })).filter((s) => s.n);
    const sum = pipe.reduce((a, s) => a + s.n, 0) || 1;
    const order = STATUSES.map((s) => s.key);
    const tracked = [...cs].sort((a, b) => order.indexOf(b.status) - order.indexOf(a.status) || (b.appliedAt || "").localeCompare(a.appliedAt || ""));
    const featured = [...cs].sort((a, b) => completeness(b) - completeness(a)).slice(0, 6);
    const news = sortedNews().slice(0, 3);

    return `
      <header class="board-head">
        <div class="board-date">${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${"일월화수목금토"[now.getDay()]}요일 · 오늘의 구절</div>
        ${q ? `<blockquote class="quote" data-action="edit-quote" data-id="${q.id}" title="눌러서 수정">${esc(q.text)}</blockquote>
               <div class="quote-src">— ${esc(q.author || "")}${q.book ? `, 『${esc(q.book)}』` : ""}</div>`
            : `<blockquote class="quote muted">읽다가 밑줄 그은 문장을 모아두면, 매일 하나씩 여기에 보여드려요.</blockquote>`}
        <button class="btn ghost sm quote-add" data-action="add-quote">+ 구절 추가</button>
      </header>

      <section class="board-sec">
        <div class="sec-title"><h2>할 일</h2><span class="meta">${todos.filter((t) => t.done).length}/${todos.length} 완료</span></div>
        <div class="card">
          <form class="todo-form" data-action="add-todo"><input class="input" name="todo" placeholder="할 일 입력 후 Enter" autocomplete="off"><button class="btn">추가</button></form>
          <div class="todo-grid">${todos.map((t) => `<div class="todo ${t.done ? "done" : ""}"><input type="checkbox" data-action="toggle-todo" data-id="${t.id}" ${t.done ? "checked" : ""}><div class="grow">${esc(t.text)}</div><button class="icon-btn" data-action="del-todo" data-id="${t.id}">×</button></div>`).join("")}</div>
        </div>
      </section>

      <section class="board-sec">
        <div class="sec-title"><h2>지원 현황</h2><a href="#/applications" class="meta">전체 보기 →</a></div>
        <div class="card">
          <div class="pipeline">${pipe.map((s) => `<span style="width:${(s.n / sum) * 100}%;background:${s.color}" title="${s.label} ${s.n}"></span>`).join("")}</div>
          <div class="legend">${pipe.map((s) => `<span><i style="background:${s.color}"></i>${s.label} ${s.n}</span>`).join("") || '<span class="placeholder">아직 등록된 기업이 없어요</span>'}</div>
          <div class="list" style="margin-top:14px">${tracked.slice(0, 6).map((c) => { const nx = evs.find((e) => e.companyId === c.id); return `<a class="list-item" href="#/companies/${c.id}" style="color:inherit;text-decoration:none">
            <div class="grow"><div class="title">${esc(c.name)}</div><div class="desc">${esc(c.role || c.industry || "")}${c.resultNote ? ` · ${esc(c.resultNote)}` : ""}</div></div>
            ${nx ? `<span class="desc">${esc(nx.title)} ${ddayHTML(nx.date)}</span>` : ""}${badge(c.status)}</a>`; }).join("")}</div>
        </div>
      </section>

      <section class="board-sec">
        <div class="sec-title"><h2>기업 분석</h2><a href="#/companies" class="meta">전체 보기 →</a></div>
        <div class="grid g-3">${featured.map((c) => `<a class="card company-card mini" href="#/companies/${c.id}">
          <div class="top"><h3>${esc(c.name)}</h3>${badge(c.status)}</div>
          <div class="role">${esc([c.industry, c.role].filter(Boolean).join(" · ")) || "업종 · 직무 미입력"}</div>
          <div class="foot"><div class="progress"><span style="width:${completeness(c)}%"></span></div><span>${completeness(c)}%</span></div></a>`).join("")}</div>
      </section>

      <section class="board-sec">
        <div class="sec-title"><h2>뉴스 · 이슈</h2><span><button class="btn ghost sm" data-action="add-news">+ 뉴스 저장</button> <a href="#/news" class="meta">전체 보기 →</a></span></div>
        ${news.length ? `<div class="grid g-3">${news.map(newsCard).join("")}</div>` : `<div class="card empty">읽은 기사를 저장하면 카드로 모여요.</div>`}
        <div class="card news-links">
          <div class="card-title"><h3>기업별 최신 뉴스 바로가기</h3></div>
          ${cs.map((c) => `<div class="nl-row"><b>${esc(c.name)}</b><span>${newsSearchLinks(c.name).map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l} ↗</a>`).join("")}</span></div>`).join("")}
        </div>
      </section>`;
  }

  let newsFilter = "";
  function viewNews() {
    const cs = list("companies"), all = sortedNews();
    const shown = newsFilter ? all.filter((n) => n.companyId === newsFilter) : all;
    return `
      ${pageHead("News", "뉴스 · 이슈", "읽은 기사를 카드로 저장하고, 기업별 최신 뉴스로 바로 이동해요.", `<button class="btn" data-action="add-news">+ 뉴스 저장</button>`)}
      <div class="chips" style="margin-bottom:14px"><button class="chip ${!newsFilter ? "on" : ""}" data-action="news-filter" data-k="">전체 ${all.length}</button>
        ${cs.filter((c) => all.some((n) => n.companyId === c.id)).map((c) => `<button class="chip ${newsFilter === c.id ? "on" : ""}" data-action="news-filter" data-k="${c.id}">${esc(c.name)} ${all.filter((n) => n.companyId === c.id).length}</button>`).join("")}</div>
      ${shown.length ? `<div class="grid g-3">${shown.map(newsCard).join("")}</div>` : `<div class="card empty">저장한 뉴스가 없어요.<br><button class="btn sm" data-action="add-news">+ 뉴스 저장</button></div>`}
      <div class="card news-links section-gap">
        <div class="card-title"><h3>기업별 최신 뉴스 바로가기</h3><span class="meta">최신순 검색 결과로 열려요</span></div>
        ${cs.map((c) => `<div class="nl-row"><b>${esc(c.name)}</b><span>${newsSearchLinks(c.name).map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l} ↗</a>`).join("")}</span></div>`).join("")}
      </div>`;
  }

  function editNews(id) {
    const isNew = !id;
    const nw = isNew ? { id: uid("nw"), date: today(), title: "", source: "", url: "", summary: "", companyId: "" } : clone(get("news", id));
    const fields = [["title", "기사 제목", "text", { full: true }], ["url", "기사 링크", "url", { full: true }], ["source", "언론사", "text"], ["date", "날짜", "date"], ["companyId", "관련 기업", "company"], ["summary", "요약 · 내 생각 (면접에서 쓸 포인트)", "area-sm"]];
    openModal({
      title: isNew ? "뉴스 저장" : "뉴스 수정",
      body: `<div class="form-grid">${fields.map((f) => fieldHTML(f, nw[f[0]])).join("")}</div>`,
      onSubmit: () => {
        fields.forEach(([n]) => (nw[n] = $(`#modalBody [name="${n}"]`).value.trim()));
        if (!nw.title) return toast("제목을 입력해 주세요");
        upsert("news", nw); closeModal(); render(); toast("저장했어요");
      },
      onDelete: isNew ? null : () => { remove("news", nw.id); closeModal(); render(); toast("삭제했어요"); },
    });
  }

  function editQuote(id) {
    const isNew = !id;
    const q = isNew ? { id: uid("qt"), text: "", author: "", book: "" } : clone(get("quotes", id));
    const fields = [["text", "구절", "area", { full: true }], ["author", "작가", "text"], ["book", "책 제목", "text"]];
    openModal({
      title: isNew ? "구절 추가" : "구절 수정",
      body: `<div class="form-grid">${fields.map((f) => fieldHTML(f, q[f[0]])).join("")}</div><p class="hint" style="font-size:12px;color:var(--muted)">저장된 구절이 날짜마다 하나씩 돌아가며 보여요.</p>`,
      onSubmit: () => {
        fields.forEach(([n]) => (q[n] = $(`#modalBody [name="${n}"]`).value.trim()));
        if (!q.text) return toast("구절을 입력해 주세요");
        upsert("quotes", q); closeModal(); render(); toast("저장했어요");
      },
      onDelete: isNew ? null : () => { remove("quotes", q.id); closeModal(); render(); toast("삭제했어요"); },
    });
  }

  function viewProfile() {
    const rows = (arr, fmtRow) => arr.map(fmtRow).join("") || `<p class="placeholder">없음</p>`;
    return `
      ${pageHead("Profile", "프로필", "이력서 기준 기본 정보 — data.js의 profile에서 수정")}
      <div class="grid g-3">
        <div class="card">
          <div class="card-title"><h3>기본 정보</h3></div>
          <dl class="kv"><dt>이름</dt><dd>${esc(P.name)} (${esc(P.nameEn)})</dd>
          <dt>학교</dt><dd>${esc(P.education[0]?.school)}</dd><dt>전공</dt><dd>${esc(P.education[0]?.major)}</dd>
          <dt>졸업</dt><dd>${esc(P.education[0]?.period)}</dd><dt>학점</dt><dd>${esc(P.education[0]?.note)}</dd>
          <dt>이메일</dt><dd>${esc(P.email)}</dd></dl>
        </div>
        <div class="card"><div class="card-title"><h3>어학</h3></div>
          ${rows(P.languages, (l) => `<div class="row-item"><div><b>${esc(l.name)}</b> ${esc(l.score)}</div><span class="r">${esc(l.date)}</span></div>`)}
          <div class="card-title" style="margin-top:18px"><h3>주요 이수 과목</h3></div>
          ${rows(P.coursework, (c) => `<div class="row-item"><div>${esc(c.name)}</div><span class="r">${esc(c.grade)}</span></div>`)}
        </div>
        <div class="card"><div class="card-title"><h3>자격증</h3></div>
          ${rows(P.certificates, (c) => `<div class="row-item"><div><b>${esc(c.name)}</b><div class="d">${esc(c.org)}</div></div><span class="r">${esc(c.date)}</span></div>`)}
        </div>
      </div>
      <div class="grid g-2 section-gap">
        <div class="card"><div class="card-title"><h3>학력 · 교육</h3></div>
          ${rows([...P.education, ...P.trainings.map((t) => ({ school: t.name, major: t.org, period: t.date }))], (e) => `<div class="row-item"><div><b>${esc(e.school)}</b><div class="d">${esc(e.major)}${e.note ? ` · ${esc(e.note)}` : ""}</div></div><span class="r">${esc(e.period)}</span></div>`)}
        </div>
        <div class="card"><div class="card-title"><h3>수상</h3></div>
          ${rows(P.awards, (a) => `<div class="row-item"><div><b>${esc(a.name)}</b><div class="d">${esc(a.org)} · ${esc(a.note)}</div></div><span class="r">${esc(a.date)}</span></div>`)}
        </div>
      </div>
      <div class="card section-gap"><div class="card-title"><h3>기술 · 툴</h3></div>
        <div class="grid g-4">${Object.entries(P.skills).map(([k, v]) => `<div><div style="font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:8px">${esc(k)}</div><div class="chips">${v.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div></div>`).join("")}</div>
      </div>`;
  }

  let expFilter = "";
  function viewStrengths() {
    const exps = BASE.experiences;
    const tags = [...new Set(exps.flatMap((e) => e.tags))];
    const shown = expFilter ? exps.filter((e) => e.tags.includes(expFilter)) : exps;
    const expTitle = (id) => exps.find((e) => e.id === id)?.title || id;
    return `
      ${pageHead("Strengths", "강점 · 경험", "자소서와 면접에서 반복해서 쓸 핵심 메시지와 경험 소재")}
      <div class="grid g-2">
        ${BASE.strengths.map((s, i) => `<div class="card strength"><div class="num">STRENGTH ${String(i + 1).padStart(2, "0")}</div><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p>
          <div class="chips" style="margin-top:10px">${(s.evidence || []).map((id) => `<a class="chip" href="#exp-${id}" data-action="jump-exp" data-id="${id}">${esc(expTitle(id))}</a>`).join("")}</div></div>`).join("")}
      </div>
      <div class="toolbar section-gap" style="margin-top:34px"><h2 style="font-size:19px">경험 소재 은행 <span style="color:var(--muted);font-size:14px;font-weight:500">STAR</span></h2>
        <div class="chips"><button class="chip ${!expFilter ? "on" : ""}" data-action="exp-filter" data-tag="">전체</button>${tags.map((t) => `<button class="chip ${expFilter === t ? "on" : ""}" data-action="exp-filter" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div></div>
      <div class="grid g-2">
        ${shown.map((e) => `<div class="card exp" id="exp-${e.id}"><h3>${esc(e.title)}</h3>
          <div class="meta">${esc(e.org)} · ${esc(e.period)} · ${esc(e.role)}</div>
          <dl class="star"><dt>상황</dt><dd>${esc(e.s)}</dd><dt>행동</dt><dd>${esc(e.a)}</dd></dl>
          <div class="result-line">${esc(e.r)}</div>
          <div class="chips" style="margin-top:12px">${e.tags.map((t) => `<span class="chip">#${esc(t)}</span>`).join("")}</div></div>`).join("")}
      </div>`;
  }

  let calCursor = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();

  /** 달력 블록 (취업 달력 페이지 + 첫 화면 아래 큰 달력에서 같이 사용) */
  function calendarBlock({ maxPer = 3, big = false } = {}) {
    const y = calCursor.getFullYear(), m = calCursor.getMonth();
    const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
    const byDate = {};
    allEvents().forEach((e) => (byDate[e.date] = byDate[e.date] || []).push(e));
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), key = ymd(d);
      if (i === 35 && d.getMonth() !== m) break;
      const items = byDate[key] || [];
      cells.push(`<div class="day ${d.getMonth() !== m ? "other" : ""} ${key === today() ? "today" : ""}" data-action="cal-day" data-date="${key}">
        <span class="num">${d.getDate()}</span>
        ${items.slice(0, maxPer).map((e) => { const t = EVENT_TYPES[e.type] || EVENT_TYPES.etc; return `<div class="ev" style="background:${t.bg};color:${t.fg}" data-action="${e.auto ? "goto-company" : "edit-event"}" data-id="${e.auto ? e.companyId : e.id}" title="${esc(e.title)}">${esc(e.title)}</div>`; }).join("")}
        ${items.length > maxPer ? `<span class="more">+${items.length - maxPer}</span>` : ""}</div>`);
    }
    return `
      <div class="cal-head">
        ${big ? `<h2 class="cal-title">${y}. ${String(m + 1).padStart(2, "0")}</h2>` : `<h2>${y}년 ${m + 1}월</h2>`}
        <button class="icon-btn" data-action="cal-prev" aria-label="이전 달">‹</button><button class="icon-btn" data-action="cal-next" aria-label="다음 달">›</button>
        <button class="btn ghost sm" data-action="cal-today">오늘</button>
        ${big ? `<button class="btn sm" data-action="add-event">+ 일정</button>` : ""}
        <div class="chips cal-legend">${Object.values(EVENT_TYPES).map((t) => `<span class="chip" style="background:${t.bg};color:${t.fg};border-color:transparent">${t.label}</span>`).join("")}</div>
      </div>
      <div class="cal ${big ? "big" : ""}">${["일", "월", "화", "수", "목", "금", "토"].map((d, i) => `<div class="dow ${i === 0 ? "sun" : i === 6 ? "sat" : ""}">${d}</div>`).join("")}${cells.join("")}</div>`;
  }

  function viewCalendar() {
    const y = calCursor.getFullYear(), m = calCursor.getMonth();
    const monthEvs = allEvents().filter((e) => e.date.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`));
    return `
      ${pageHead("Calendar", "취업 달력", "서류 마감 · 인적성 · 면접 · 발표 일정. 날짜를 누르면 바로 추가돼요.", `<button class="btn" data-action="add-event">+ 일정 추가</button>`)}
      <div class="card">${calendarBlock()}</div>
      <div class="card section-gap"><div class="card-title"><h3>${m + 1}월 일정 목록</h3><span class="meta">${monthEvs.length}건</span></div>
        ${monthEvs.length ? `<div class="list">${monthEvs.map(eventItem).join("")}</div>` : `<div class="empty">이번 달 일정이 없어요.</div>`}
      </div>`;
  }

  /* ---------------- 첫 화면 아래: 큰 달력 + 요약 두 줄 ---------------- */
  function viewOverview() {
    const cs = list("companies");
    const n = (keys) => cs.filter((c) => keys.includes(c.status)).length;
    const applied = cs.filter((c) => !["interest", "writing"].includes(c.status)).length;
    const weekDeadlines = allEvents().filter((e) => e.type === "deadline" && daysUntil(e.date) >= 0 && daysUntil(e.date) <= 7).length;
    const item = (label, v) => `<span class="strip-item">${label} <b>${v}</b></span>`;
    return `
      <div class="ov-inner">
        <div class="ov-cal">${calendarBlock({ maxPer: 4, big: true })}</div>
        <a class="strip" href="#/companies">
          <span class="strip-label">전체 공고</span>
          <span class="strip-nums">${item("전체", cs.length)}${item("관심", n(["interest"]))}${item("작성중", n(["writing"]))}${item("7일 내 마감", weekDeadlines)}</span>
        </a>
        <a class="strip" href="#/applications">
          <span class="strip-label">지원 현황</span>
          <span class="strip-nums">${item("지원", applied)}${item("진행 중", n(ACTIVE))}${item("서류합격", n(["passed"]))}${item("면접", n(["test", "interview"]))}${item("최종합격", n(["offer"]))}${item("불합격", n(["rejected"]))}${item("포기", n(["dropped"]))}</span>
        </a>
      </div>`;
  }

  let appFilter = "all";
  function viewApplications() {
    const cs = list("companies").sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || ""));
    const shown = appFilter === "all" ? cs : appFilter === "active" ? cs.filter((c) => ACTIVE.includes(c.status)) : cs.filter((c) => c.status === appFilter);
    const evs = allEvents().filter((e) => daysUntil(e.date) >= 0);
    const nextOf = (id) => evs.find((e) => e.companyId === id);
    const chip = (k, label, n) => `<button class="chip ${appFilter === k ? "on" : ""}" data-action="app-filter" data-k="${k}">${label} ${n}</button>`;
    return `
      ${pageHead("Applications", "지원 현황", "상태는 표에서 바로 바꿀 수 있어요.", `<button class="btn" data-action="add-company">+ 기업 추가</button>`)}
      <div class="chips" style="margin-bottom:14px">${chip("all", "전체", cs.length)}${chip("active", "진행 중", cs.filter((c) => ACTIVE.includes(c.status)).length)}
        ${STATUSES.map((s) => chip(s.key, s.label, cs.filter((c) => c.status === s.key).length)).join("")}</div>
      <div class="card" style="padding:8px 10px">
        ${shown.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>기업</th><th>직무</th><th>상태</th><th>지원일</th><th>다음 일정</th><th>분석</th><th></th></tr></thead><tbody>
          ${shown.map((c) => { const nx = nextOf(c.id); return `<tr>
            <td class="company-cell"><a href="#/companies/${c.id}">${esc(c.name)}</a><div style="font-size:12.5px;color:var(--muted)">${esc(c.industry)}</div></td>
            <td>${esc(c.role) || '<span class="placeholder">-</span>'}</td>
            <td><select class="input" data-action="set-status" data-id="${c.id}">${STATUSES.map((s) => `<option value="${s.key}" ${s.key === c.status ? "selected" : ""}>${s.label}</option>`).join("")}</select>${c.resultNote ? `<div class="result-note">${esc(c.resultNote)}</div>` : ""}</td>
            <td style="white-space:nowrap">${dot(c.appliedAt) || '<span class="placeholder">-</span>'}</td>
            <td>${nx ? `${esc(nx.title)} ${ddayHTML(nx.date)}` : '<span class="placeholder">-</span>'}</td>
            <td style="min-width:90px"><div class="progress"><span style="width:${completeness(c)}%"></span></div></td>
            <td style="white-space:nowrap">${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">공고</a>` : ""}</td></tr>`; }).join("")}
        </tbody></table></div>` : `<div class="empty">해당 상태의 기업이 없어요.</div>`}
      </div>`;
  }

  let coQuery = "";
  function viewCompanies() {
    const cs = list("companies");
    return `
      ${pageHead("Company Research", "기업 분석", "기업별 분석 · 직무 · 자소서 · 면접 준비를 한곳에", `
        <div class="search">${icon("search")}<input class="input" data-action="co-search" placeholder="기업·업종·직무 검색" value="${esc(coQuery)}"></div>
        <button class="btn" data-action="add-company">+ 기업 추가</button>`)}
      <div class="grid g-3">
        ${cs.map((c) => `<a class="card company-card" href="#/companies/${c.id}" data-search="${esc([c.name, c.industry, c.role, c.summary].join(" ").toLowerCase())}">
          <div class="top"><div style="display:flex;gap:12px;align-items:center"><div class="logo">${initials(c.name)}</div>
            <div><h3>${esc(c.name)}</h3><div class="role">${esc([c.industry, c.role].filter(Boolean).join(" · ")) || "업종 · 직무 미입력"}</div></div></div>${badge(c.status)}</div>
          <div class="summary">${esc(c.summary) || '<span class="placeholder">한 줄 요약을 적어보세요</span>'}</div>
          <div class="foot"><span>분석</span><div class="progress"><span style="width:${completeness(c)}%"></span></div><span>${completeness(c)}%</span>
            <span>· 자소서 ${(c.applications || []).length}</span></div></a>`).join("")}
        <button class="card company-card add" data-action="add-company" style="align-items:center;justify-content:center;cursor:pointer;color:var(--muted);min-height:150px;font-size:15px">+ 기업 추가</button>
      </div>`;
  }

  let coTab = "analysis";
  function viewCompanyDetail(id) {
    const c = get("companies", id);
    if (!c) return `<div class="empty">기업을 찾을 수 없어요. <a href="#/companies">목록으로</a></div>`;
    const A = c.analysis || {}, J = c.jobFit || {}, sw = A.swot || {};
    const editBtn = (sec) => `<button class="btn ghost sm" data-action="edit-company" data-id="${c.id}" data-sec="${sec}">편집</button>`;
    const block = (title, text) => `<div class="card"><div class="card-title"><h3>${title}</h3></div><div class="prose">${fmt(text)}</div></div>`;
    const tabs = [["analysis", "기업 분석"], ["fit", "직무 · 연결고리"], ["apps", `자소서 ${(c.applications || []).length}`], ["interview", "면접 준비"], ["files", "자료 · 메모"]];

    let body = "";
    if (coTab === "analysis") body = `
      <div class="toolbar"><span class="placeholder" style="font-style:normal">최종 업데이트는 직접 기록하세요</span>${editBtn("analysis")}</div>
      <div class="grid g-2">${block("기업 개요", A.overview)}${block("사업 구조 · 주력 제품", A.business)}${block("실적 · 재무 포인트", A.financials)}${block("전략 · 미래 방향", A.strategy)}${block("인재상 · 핵심가치", A.talent)}${block("경쟁사 · 업계 비교", A.competitors)}</div>
      <div class="grid g-2 section-gap">
        <div class="card"><div class="card-title"><h3>SWOT</h3></div><div class="swot">
          ${[["s", "Strength"], ["w", "Weakness"], ["o", "Opportunity"], ["t", "Threat"]].map(([k, l]) => `<div class="${k}"><h4>${l}</h4>${fmt(sw[k], "-")}</div>`).join("")}</div></div>
        <div class="card"><div class="card-title"><h3>최근 이슈 · 뉴스</h3><span class="meta">${(c.issues || []).length}건</span></div>
          ${(c.issues || []).length ? `<div class="timeline">${[...c.issues].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((i) => `<div class="tl-item"><div class="when">${esc(dot(i.date))}</div><div class="what">${esc(i.title)}</div><div class="note">${esc(i.note)}</div></div>`).join("")}</div>` : `<p class="placeholder">이슈를 추가해 보세요.</p>`}</div>
      </div>`;
    else if (coTab === "fit") body = `
      <div class="toolbar"><span></span>${editBtn("fit")}</div>
      ${J.why ? `<div class="card" style="background:var(--navy-tint);border-color:var(--navy-soft);margin-bottom:16px"><div class="eyebrow">지원 동기 핵심 문장</div><div style="font-size:16px;font-weight:600;color:var(--navy-deep)">${esc(J.why)}</div></div>` : ""}
      <div class="grid g-2">${block("직무 분석", J.job)}${block("내 경험 매칭", J.fit)}</div>`;
    else if (coTab === "apps") body = `
      <div class="toolbar"><span class="placeholder" style="font-style:normal">글자수는 공백 포함 기준</span>${editBtn("apps")}</div>
      <div class="card">${(c.applications || []).length ? c.applications.map((e, i) => essayHTML(e, i)).join("") : `<div class="empty">자소서 문항이 없어요.<br><button class="btn sm" data-action="edit-company" data-id="${c.id}" data-sec="apps">+ 문항 추가</button></div>`}</div>`;
    else if (coTab === "interview") body = `
      <div class="toolbar"><span></span>${editBtn("interview")}</div>
      <div class="card">${(c.interview || []).length ? c.interview.map((x) => `<div class="qa"><div class="q">${esc(x.q)}</div>${x.a ? `<div class="a">${fmt(x.a)}</div>` : ""}</div>`).join("") : `<div class="empty">예상 질문을 정리해 보세요.</div>`}</div>`;
    else body = `
      <div class="toolbar"><span></span>${editBtn("files")}</div>
      <div class="grid g-2">
        <div class="card"><div class="card-title"><h3>지원서 · 자료 링크</h3></div>
          ${(c.links || []).length ? `<div class="list">${c.links.map((l) => `<div class="list-item"><div class="grow"><a href="${esc(l.url)}" target="_blank" rel="noopener" class="title">${esc(l.label || l.url)}</a><div class="desc">${esc(l.url)}</div></div></div>`).join("")}</div>` : `<p class="placeholder">공고, IR 자료, 제출한 지원서 파일 링크를 모아두세요.</p>`}</div>
        ${block("메모", c.memo)}</div>`;

    return `
      <a href="#/companies" class="back">← 기업 분석 목록</a>
      <div class="detail-head"><div class="logo">${initials(c.name)}</div>
        <div style="flex:1;min-width:200px"><h1>${esc(c.name)}</h1>
          <div class="meta">${badge(c.status)}${c.resultNote ? `<span class="result-note">${esc(c.resultNote)}</span>` : ""}${c.industry ? `<span>${esc(c.industry)}</span>` : ""}${c.role ? `<span>· ${esc(c.role)}</span>` : ""}${c.appliedAt ? `<span>· 지원 ${dot(c.appliedAt)}</span>` : ""}${isFullDate(c.deadline) ? `<span>· 마감 ${dot(c.deadline)} ${ddayHTML(c.deadline)}</span>` : ""}</div>
          ${c.summary ? `<div style="margin-top:8px;color:var(--text-2)">${esc(c.summary)}</div>` : ""}</div>
        <div class="head-actions">${newsSearchLinks(c.name).slice(0, 1).map(([l, u]) => `<a class="btn ghost" href="${u}" target="_blank" rel="noopener">${l} ↗</a>`).join("")}${c.url ? `<a class="btn ghost" href="${esc(c.url)}" target="_blank" rel="noopener">채용공고</a>` : ""}<button class="btn ghost" data-action="edit-company" data-id="${c.id}" data-sec="basic">기본 정보 · 상태</button></div>
      </div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${coTab === k ? "on" : ""}" data-action="co-tab" data-tab="${k}">${l}</button>`).join("")}</div>
      ${body}`;
  }

  function essayHTML(e, i, from, collapsed) {
    const n = (e.a || "").length, over = e.limit && n > e.limit;
    return `<details class="essay" ${from || collapsed ? "" : "open"} data-search="${esc([e.q, e.a, from || ""].join(" ").toLowerCase())}"><summary class="q"><div><span class="n">Q${i + 1}.</span>${esc(e.q)}${from ? `<div class="from">${from}</div>` : ""}</div>
      <span class="count ${over ? "over" : ""}">${n.toLocaleString()}${e.limit ? ` / ${Number(e.limit).toLocaleString()}` : ""}자</span></summary>
      <div class="a">${esc(e.a) || '<span class="placeholder">답변 미작성</span>'}</div></details>`;
  }

  let essayQuery = "";
  function viewEssays() {
    const order = STATUSES.map((s) => s.key);
    const groups = list("companies").filter((c) => (c.applications || []).length)
      .sort((a, b) => order.indexOf(b.status) - order.indexOf(a.status) || a.name.localeCompare(b.name));
    const total = groups.reduce((n, c) => n + c.applications.length, 0);
    return `
      ${pageHead("Essays", "자소서 보관함", `기업 ${groups.length}곳 · 문항 ${total}개. 키워드로 재활용할 문장을 찾아요.`, `<div class="search">${icon("search")}<input class="input" data-action="essay-search" placeholder="예: FT4, 책임감, 지원동기" value="${esc(essayQuery)}"></div>`)}
      <div class="chips" style="margin-bottom:16px">${groups.map((c) => `<a class="chip" href="#eg-${c.id}" data-action="jump-group" data-id="${c.id}">${esc(c.name)} ${c.applications.length}</a>`).join("")}</div>
      ${groups.length ? groups.map((c) => `
        <section class="card essay-group" id="eg-${c.id}">
          <div class="eg-head">
            <div><h3><a href="#/companies/${c.id}">${esc(c.name)}</a></h3><div class="eg-role">${esc(c.role || "")}${c.resultNote ? ` · ${esc(c.resultNote)}` : ""}</div></div>
            ${badge(c.status)}
          </div>
          ${c.applications.map((e, i) => essayHTML(e, i, "", true)).join("")}
        </section>`).join("") : `<div class="card empty">기업 상세 › 자소서 탭에서 문항을 추가하면 기업별로 모여요.</div>`}`;
  }

  /* ---------------- Router ---------------- */
  const VIEWS = { news: viewNews, dashboard: viewDashboard, profile: viewProfile, strengths: viewStrengths, calendar: viewCalendar, applications: viewApplications, companies: viewCompanies, essays: viewEssays };
  let lastRoute = "";
  function render() {
    const [, route = "dashboard", id] = location.hash.split("/");
    const r = VIEWS[route] ? route : "dashboard";
    const routeKey = `${r}/${id || ""}`;
    if (routeKey !== lastRoute && r === "companies" && id && lastRoute.split("/")[1] !== id) coTab = "analysis";
    $("#view").innerHTML = r === "companies" && id ? viewCompanyDetail(decodeURIComponent(id)) : VIEWS[r]();
    applySearch();
    $$("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === r));
    const label = NAV.find((n) => n.route === r)?.label || "";
    $("#topTitle").textContent = label;
    document.title = r === "dashboard" ? "preparing for" : `${label} · preparing for`;

    // 첫 화면(intro)은 대시보드에서만 보이고, 다른 메뉴로 가면 숨김
    const intro = $("#intro"), ov = $("#overview"), firstLoad = !lastRoute;
    intro.hidden = ov.hidden = r !== "dashboard";
    if (r === "dashboard") ov.innerHTML = viewOverview();
    if (routeKey !== lastRoute) {
      if (r === "dashboard" && !firstLoad) window.scrollTo(0, $("#board").offsetTop);
      else if (!firstLoad || r !== "dashboard") window.scrollTo(0, 0);
    }
    lastRoute = routeKey;
    $("#sidebar").classList.remove("open");
  }

  /** 검색: 다시 그리지 않고 숨김 처리 (한글 입력 조합이 끊기지 않도록) */
  function applySearch() {
    const input = $('[data-action="co-search"], [data-action="essay-search"]');
    if (!input) return;
    const q = input.value.trim().toLowerCase();
    $$("[data-search]").forEach((el) => (el.hidden = !!q && !el.dataset.search.includes(q)));
    // 자소서 보관함: 검색어가 있으면 맞는 문항만 펼치고, 맞는 문항이 없는 기업은 숨김
    $$(".essay-group").forEach((g) => {
      const items = $$(".essay", g);
      g.hidden = !!q && items.every((x) => x.hidden);
      if (q) items.forEach((x) => (x.open = !x.hidden));
    });
  }

  /* ---------------- Export / Import ---------------- */
  function exportDataJs() {
    const merged = { ...BASE, version: today() };
    COLLECTIONS.forEach((k) => (merged[k] = list(k)));
    const src = `/* 내보낸 날짜: ${today()} — 이 파일로 assets/js/data.js를 교체한 뒤 [브라우저 수정 초기화]를 눌러주세요. */\nwindow.SITE_DATA = ${JSON.stringify(merged, null, 2)};\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    a.download = "data.js"; a.click(); URL.revokeObjectURL(a.href);
    toast("data.js를 내려받았어요");
  }
  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result).replace(/^[\s\S]*?window\.SITE_DATA\s*=\s*/, "").replace(/;\s*$/, "");
        const data = JSON.parse(text);
        COLLECTIONS.forEach((k) => { overlay[k] = {}; (data[k] || []).forEach((x) => (overlay[k][x.id] = x)); (BASE[k] || []).forEach((x) => { if (!overlay[k][x.id]) overlay[k][x.id] = null; }); });
        persist(); render(); toast("가져오기 완료");
      } catch { toast("파일 형식을 읽지 못했어요 (JSON/data.js)"); }
    };
    reader.readAsText(file);
  }

  /* ---------------- Events ---------------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) { if (e.target.id === "modal") closeModal(); return; }
    const { action, id } = el.dataset;
    switch (action) {
      case "to-board": e.preventDefault(); window.scrollTo({ top: $("#overview").offsetTop, behavior: "smooth" }); break;
      case "add-news": editNews(); break;
      case "edit-news": editNews(id); break;
      case "news-filter": newsFilter = el.dataset.k; render(); break;
      case "add-quote": editQuote(); break;
      case "edit-quote": editQuote(id); break;
      case "modal-close": closeModal(); break;
      case "modal-submit": modalSubmit?.(); break;
      case "modal-delete": modalDelete?.(); break;
      case "rep-add": { const box = $(`[data-rep="${el.dataset.key}"]`); box.insertAdjacentHTML("beforeend", repRow(el.dataset.key)); box.lastElementChild.querySelector("input,textarea")?.focus(); break; }
      case "rep-remove": el.closest(".rep-row").remove(); break;
      case "add-event": editEvent(); break;
      case "edit-event": e.preventDefault(); e.stopPropagation(); editEvent(id); break;
      case "goto-company": e.stopPropagation(); location.hash = `#/companies/${id}`; break;
      case "cal-day": editEvent(null, el.dataset.date); break;
      case "cal-prev": calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1); render(); break;
      case "cal-next": calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1); render(); break;
      case "cal-today": { const d = new Date(); calCursor = new Date(d.getFullYear(), d.getMonth(), 1); render(); break; }
      case "add-company": e.preventDefault(); editCompany(null); break;
      case "edit-company": editCompany(id, el.dataset.sec); break;
      case "co-tab": coTab = el.dataset.tab; render(); break;
      case "app-filter": appFilter = el.dataset.k; render(); break;
      case "exp-filter": expFilter = el.dataset.tag; render(); break;
      case "jump-group": e.preventDefault(); document.getElementById(`eg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); break;
      case "jump-exp": e.preventDefault(); expFilter = ""; render(); document.getElementById(`exp-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); break;
      case "del-todo": remove("todos", id); render(); break;
    }
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.action === "set-status") { const c = clone(get("companies", el.dataset.id)); c.status = el.value; upsert("companies", c); render(); toast(`${c.name} → ${statusOf(c.status).label}`); }
    if (el.dataset.action === "toggle-todo") { const t = clone(get("todos", el.dataset.id)); t.done = el.checked; upsert("todos", t); render(); }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.dataset.action !== "add-todo") return;
    e.preventDefault();
    const text = e.target.todo.value.trim();
    if (text) { upsert("todos", { id: uid("td"), text, done: false }); render(); $(".todo-form input")?.focus(); }
  });
  document.addEventListener("input", (e) => {
    const a = e.target.dataset.action;
    if (a !== "co-search" && a !== "essay-search") return;
    if (a === "co-search") coQuery = e.target.value; else essayQuery = e.target.value;
    applySearch();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#modal").hidden) closeModal();
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !$("#modal").hidden) modalSubmit?.();
  });

  $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#exportBtn").addEventListener("click", exportDataJs);
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (e) => e.target.files[0] && importFile(e.target.files[0]));
  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("브라우저에서 수정한 내용을 지우고 data.js 기본값으로 돌아갈까요?\n(먼저 [data.js 내보내기]로 백업하는 걸 권장해요)")) return;
    overlay = {}; COLLECTIONS.forEach((k) => (overlay[k] = {})); persist(); render(); toast("초기화했어요");
  });

  window.addEventListener("hashchange", () => { closeModal(); render(); });
  if ("scrollRestoration" in history) history.scrollRestoration = "manual"; // 새로고침하면 항상 첫 화면부터

  // 스크롤하면 첫 화면 글자가 천천히 흐려지며 올라감
  const introTitle = $(".intro-title");
  window.addEventListener("scroll", () => {
    if ($("#intro").hidden) return;
    const p = Math.min(window.scrollY / window.innerHeight, 1);
    introTitle.style.opacity = String(1 - p * 1.1);
    introTitle.style.transform = `translateY(${p * -60}px)`;
  }, { passive: true });
  renderNav();
  render();
})();
