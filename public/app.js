(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

  const TITLES = {
    home: "Bosh sahifa", tutor: "AI ustoz", subjects: "Fanlar",
    tests: "Testlar", results: "Natijalarim", plan: "O‘quv rejam"
  };
  const DAY_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
  const DAY_NAMES = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

  /* ---------- Storage (xatoga chidamli) ---------- */
  const ls = {
    get(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } }
  };

  /* ---------- Sana yordamchilari ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const mondayOf = (d = new Date()) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2800);
  }

  /* ---------- Navigatsiya (hash: orqaga tugmasi va yangilash ishlaydi) ---------- */
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function showView(name) {
    if (!TITLES[name]) name = "home";
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    $$(".nav [data-view]").forEach((b) => {
      const active = b.dataset.view === name;
      b.classList.toggle("active", active);
      if (active) {
        b.setAttribute("aria-current", "page");
        b.scrollIntoView({ inline: "center", block: "nearest" });
      } else b.removeAttribute("aria-current");
    });
    $("#pageTitle").textContent = TITLES[name];
    document.title = `${TITLES[name]} — EduAI`;
    if (name === "tutor" && canHover) setTimeout(() => $("#chatInput")?.focus(), 60);
    window.scrollTo({ top: 0 });
  }
  function go(name) {
    if (location.hash.slice(1) === name) showView(name);
    else location.hash = name;
  }
  window.addEventListener("hashchange", () => showView(location.hash.slice(1)));
  $$("[data-view]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); go(b.dataset.view); }));
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));

  /* ---------- Mavzu (dark / light) ---------- */
  function applyTheme(mode) {
    const light = mode === "light";
    document.body.classList.toggle("light", light);
    $("#themeToggle").textContent = light ? "☾" : "☼";
    $("#themeColor")?.setAttribute("content", light ? "#f4f7fc" : "#101426");
  }
  const savedTheme = ls.get("eduai-theme-v2", null);
  applyTheme(savedTheme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  $("#themeToggle").addEventListener("click", () => {
    const next = document.body.classList.contains("light") ? "dark" : "light";
    applyTheme(next);
    ls.set("eduai-theme-v2", next);
  });

  /* ---------- Fanlar va tavsiyalar ---------- */
  function prefillChat(text) {
    go("tutor");
    const input = $("#chatInput");
    input.value = text;
    if (canHover) input.focus();
  }
  $$("[data-subject]").forEach((b) => b.addEventListener("click", () =>
    prefillChat(`${b.dataset.subject} fanidan boshlang‘ich darajadagi mavzuni tushuntir.`)));
  $$("[data-prompt]").forEach((b) => b.addEventListener("click", () => prefillChat(b.dataset.prompt)));

  /* ---------- Faollik, seriya va haftalik grafik (haqiqiy ma'lumot) ---------- */
  let activity = ls.get("eduai-activity", {});
  function bumpActivity() {
    const k = dayKey();
    activity[k] = (activity[k] || 0) + 1;
    // 120 kundan eski yozuvlarni tozalash
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 120);
    const cutKey = dayKey(cutoff);
    Object.keys(activity).forEach((key) => { if (key < cutKey) delete activity[key]; });
    ls.set("eduai-activity", activity);
    renderActivity();
  }
  function renderActivity() {
    let streak = 0;
    const d = new Date();
    if (!activity[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (activity[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
    $("#streakCount").textContent = `${streak} kun`;

    const monday = mondayOf();
    const counts = DAY_SHORT.map((_, i) => {
      const day = new Date(monday); day.setDate(monday.getDate() + i);
      return activity[dayKey(day)] || 0;
    });
    const max = Math.max(1, ...counts);
    const todayIdx = (new Date().getDay() + 6) % 7;
    const box = $("#weekBars");
    box.replaceChildren();
    counts.forEach((count, i) => {
      const bar = el("div", `bar${i === todayIdx ? " today" : ""}`);
      bar.title = `${DAY_SHORT[i]}: ${count}`;
      const track = el("div", "track");
      const fill = el("span", "fill");
      fill.style.height = count ? `${Math.max(12, Math.round(count / max * 100))}%` : "4%";
      track.append(fill);
      const label = el("small");
      label.textContent = DAY_SHORT[i];
      bar.append(track, label);
      box.append(bar);
    });
  }

  /* ---------- Vazifalar (saqlanadi: kunlik va haftalik) ---------- */
  const checks = (() => {
    const today = dayKey(), week = dayKey(mondayOf());
    const daily = ls.get("eduai-daily", {}), weekly = ls.get("eduai-weekly", {});
    return {
      daily: daily.date === today ? daily.done || [] : [],
      weekly: weekly.week === week ? weekly.done || [] : [],
      today, week
    };
  })();
  function renderGoal() {
    const boxes = $$('.task-check[data-scope="weekly"]');
    $("#goalCount").textContent = `${boxes.filter((b) => b.checked).length}/${boxes.length}`;
  }
  $$(".task-check").forEach((box) => {
    const scope = box.dataset.scope;
    box.checked = checks[scope].includes(box.dataset.task);
    box.addEventListener("change", () => {
      const done = $$(`.task-check[data-scope="${scope}"]`).filter((b) => b.checked).map((b) => b.dataset.task);
      checks[scope] = done;
      if (scope === "daily") ls.set("eduai-daily", { date: checks.today, done });
      else ls.set("eduai-weekly", { week: checks.week, done });
      renderGoal();
    });
  });

  /* ---------- Xavfsiz markdown (innerHTML ishlatilmaydi) ---------- */
  function mathText(m) {
    return m.trim()
      .replace(/\\(left|right)/g, "")
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
      .replace(/\\times/g, "×").replace(/\\cdot/g, "·").replace(/\\div/g, "÷")
      .replace(/\\leq?/g, "≤").replace(/\\geq?/g, "≥").replace(/\\neq/g, "≠").replace(/\\pi/g, "π")
      .replace(/\\text\{([^{}]*)\}/g, "$1")
      .replace(/\^2/g, "²").replace(/\^3/g, "³")
      .replace(/\\,/g, " ").replace(/[{}]/g, "");
  }
  function cleanMath(t) {
    return t
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n${mathText(m)}\n`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => mathText(m))
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => `\n${mathText(m)}\n`);
  }
  function inline(parent, text) {
    const re = /(`[^`\n]+`|\*\*[^\s*][^*\n]*\*\*|\*[^\s*][^*\n]*\*)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.append(text.slice(last, m.index));
      const tok = m[0];
      let node;
      if (tok[0] === "`") { node = el("code"); node.textContent = tok.slice(1, -1); }
      else if (tok.startsWith("**")) { node = el("strong"); node.textContent = tok.slice(2, -2); }
      else { node = el("em"); node.textContent = tok.slice(1, -1); }
      parent.append(node);
      last = m.index + tok.length;
    }
    if (last < text.length) parent.append(text.slice(last));
  }
  function renderMarkdown(src, root) {
    const lines = cleanMath(src).replace(/\r/g, "").split("\n");
    const listRe = /^\s*(?:[-*•]|\d+[.)])\s+/;
    const hrRe = /^\s*([-*_])\1{2,}\s*$/;
    const fenceRe = /^\s*```/;
    const isSep = (s) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(s);
    const special = (s) => fenceRe.test(s) || /^#{1,6}\s/.test(s) || listRe.test(s) || /^\s*\|/.test(s) || hrRe.test(s);
    const cells = (s) => s.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (fenceRe.test(line)) {
        const buf = []; i++;
        while (i < lines.length && !fenceRe.test(lines[i])) buf.push(lines[i++]);
        i++;
        const pre = el("pre"), code = el("code");
        code.textContent = buf.join("\n");
        pre.append(code); root.append(pre);
        continue;
      }
      const h = line.match(/^#{1,6}\s+(.*)$/);
      if (h) { const n = el("h4"); inline(n, h[1].replace(/\s*#+\s*$/, "")); root.append(n); i++; continue; }
      if (hrRe.test(line)) { root.append(el("hr")); i++; continue; }
      if (/^\s*\|/.test(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
        const head = cells(line); i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
        const wrap = el("div", "table-wrap"), table = el("table"), thead = el("thead"), tbody = el("tbody");
        const hr = el("tr");
        head.forEach((c) => { const th = el("th"); inline(th, c); hr.append(th); });
        thead.append(hr);
        rows.forEach((r) => { const tr = el("tr"); r.forEach((c) => { const td = el("td"); inline(td, c); tr.append(td); }); tbody.append(tr); });
        table.append(thead, tbody); wrap.append(table); root.append(wrap);
        continue;
      }
      if (listRe.test(line)) {
        const list = el(/^\s*\d/.test(line) ? "ol" : "ul");
        while (i < lines.length && listRe.test(lines[i])) {
          const li = el("li"); inline(li, lines[i].replace(listRe, "")); list.append(li); i++;
        }
        root.append(list);
        continue;
      }
      const buf = [line]; i++;
      while (i < lines.length && lines[i].trim() && !special(lines[i])) buf.push(lines[i++]);
      const p = el("p"); inline(p, buf.join("\n")); root.append(p);
    }
  }

  /* ---------- Chat ---------- */
  const chatHistory = [];
  let busy = false;
  let session = null;
  const messagesBox = $("#messages");
  const scrollDown = () => { messagesBox.scrollTop = messagesBox.scrollHeight; };

  function addBubble(role) {
    const node = el("div", `bubble ${role}`);
    messagesBox.append(node);
    scrollDown();
    return node;
  }
  function setText(node, text, role) {
    node.replaceChildren();
    if (role === "assistant") renderMarkdown(text, node); else node.textContent = text;
    scrollDown();
  }
  function showTyping(node) {
    node.replaceChildren();
    const t = el("span", "typing");
    t.append(el("i"), el("i"), el("i"));
    node.append(t);
    scrollDown();
  }
  function fallbackAnswer(question) {
    const q = question.toLowerCase();
    if (q.includes("pifagor")) return "Pifagor teoremasi to‘g‘ri burchakli uchburchakda ishlaydi: a² + b² = c². Masalan, katetlar 3 va 4 bo‘lsa, c² = 9 + 16 = 25, demak gipotenuza 5 ga teng.\n\nMashq: katetlar 6 va 8 bo‘lsa, gipotenuza nechaga teng?";
    if (q.includes("present simple") || q.includes("past simple") || q.includes("ingliz")) return "Present Simple odatlar uchun ishlatiladi: “I play football every day.” Past Simple o‘tmishda tugagan ish uchun: “I played football yesterday.” “Go” fe’lining Past Simple shakli “went”.\n\nMashq: “Men kecha kitob o‘qidim” gapini inglizchaga tarjima qilib ko‘r.";
    if (q.includes("javascript") || q.includes("dasturlash")) return "JavaScript — veb-sahifalarga interaktivlik qo‘shadigan dasturlash tili. Masalan, tugma bosilganda xabar chiqarish yoki test javoblarini tekshirish mumkin.\n\nMisol: `const ism = 'Ali'; console.log('Salom, ' + ism + '!');`\n\nBu kod konsolga “Salom, Ali!” chiqaradi.";
    return "EduAI serveri hozircha AI kalitisiz ishlayapti (demo rejim). Haqiqiy javoblarni yoqish uchun `.env` fayliga `OLLAMA_API_KEY` kiriting va serverni qayta ishga tushiring. Hozircha Pifagor teoremasi, ingliz tili grammatikasi yoki JavaScript haqida so‘rab ko‘rishingiz mumkin.";
  }

  async function sendMessage(question) {
    if (busy) return;
    busy = true;
    const send = $("#sendButton");
    send.disabled = true; send.textContent = "Kutilmoqda…";

    const prior = chatHistory.slice(-8);
    const userBubble = addBubble("user");
    setText(userBubble, question, "user");
    const pending = addBubble("assistant");
    showTyping(pending);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 100000);
    try {
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const response = await fetch("/api/ai/chat", {
        method: "POST", headers, signal: controller.signal,
        body: JSON.stringify({ message: question, history: prior })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(data.error || "AI xizmati hozir javob bermadi.");
        err.code = data.code;
        throw err;
      }
      setText(pending, data.answer, "assistant");
      chatHistory.push({ role: "user", content: question }, { role: "assistant", content: data.answer });
      bumpActivity();
    } catch (error) {
      if (error.code === "AI_NOT_CONFIGURED") {
        const answer = fallbackAnswer(question);
        setText(pending, answer, "assistant");
        chatHistory.push({ role: "user", content: question }, { role: "assistant", content: answer });
      } else {
        let text = error.message;
        if (error.name === "AbortError") text = "Javob juda uzoq kutildi. Qayta urinib ko‘ring.";
        else if (error instanceof TypeError) text = "Serverga ulanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.";
        pending.classList.add("error");
        setText(pending, text, "error");
        if (error.code === "LOGIN_REQUIRED") $("#authOpen").click();
      }
    } finally {
      clearTimeout(timer);
      busy = false;
      send.disabled = false; send.textContent = "Yuborish ↑";
    }
  }
  $("#chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const question = input.value.trim();
    if (!question || busy) return;
    input.value = "";
    await sendMessage(question);
  });
  $("#clearChat").addEventListener("click", async () => {
    chatHistory.length = 0;
    messagesBox.replaceChildren();
    const b = addBubble("assistant");
    setText(b, "Suhbat tozalandi. 😊 Yangi savolingni yozishing mumkin.", "assistant");
    if (session && supabaseClient) {
      const { error } = await supabaseClient.from("chat_messages").delete().eq("user_id", session.user.id);
      if (error) { console.warn(error.message); toast("Saqlangan suhbat o‘chirilmadi."); }
    }
  });

  async function loadChatHistory() {
    if (!session || !supabaseClient || chatHistory.length) return;
    const { data, error } = await supabaseClient
      .from("chat_messages").select("role,content").order("created_at", { ascending: false }).limit(30);
    if (error || !data?.length || chatHistory.length) return;
    messagesBox.replaceChildren();
    data.reverse().forEach((m) => {
      setText(addBubble(m.role), m.content, m.role);
      chatHistory.push({ role: m.role, content: m.content });
    });
  }

  /* ---------- Test ---------- */
  const QUESTIONS = [
    { subject: "Matematika", q: "12 × 8 nechaga teng?", options: ["96", "86", "108", "92"], answer: "96", explanation: "12 × 8 = 96." },
    { subject: "Matematika", q: "Uchburchak ichki burchaklari yig‘indisi nechaga teng?", options: ["90°", "180°", "270°", "360°"], answer: "180°", explanation: "Har qanday uchburchakda ichki burchaklar yig‘indisi 180°." },
    { subject: "Matematika", q: "Katetlari 3 va 4 bo‘lgan to‘g‘ri burchakli uchburchakning gipotenuzasi nechaga teng?", options: ["5", "6", "7", "12"], answer: "5", explanation: "Pifagor teoremasi: 3² + 4² = 25, √25 = 5." },
    { subject: "Ingliz tili", q: "“Go” fe’lining Past Simple shakli qaysi?", options: ["Goed", "Went", "Gone", "Going"], answer: "Went", explanation: "“Go” noto‘g‘ri fe’l; uning Past Simple shakli “went”." },
    { subject: "Ingliz tili", q: "“She ___ to school every day.” Bo‘sh joyga qaysi so‘z mos?", options: ["go", "goes", "going", "gone"], answer: "goes", explanation: "Present Simple’da she/he/it bilan fe’lga -s/-es qo‘shiladi: “goes”." },
    { subject: "Informatika", q: "HTML asosan nima uchun ishlatiladi?", options: ["Veb-sahifa tuzilishi", "Rasm chizish", "Kompyuterni ta’mirlash", "Internet tezligini oshirish"], answer: "Veb-sahifa tuzilishi", explanation: "HTML veb-sahifadagi sarlavha, matn, rasm va boshqa elementlarning tuzilishini belgilaydi." },
    { subject: "Informatika", q: "1 bayt nechta bitdan iborat?", options: ["4", "8", "16", "10"], answer: "8", explanation: "1 bayt = 8 bit." },
    { subject: "Biologiya", q: "O‘simliklar fotosintezda qaysi gazni yutadi?", options: ["Kislorod", "Karbonat angidrid", "Azot", "Vodorod"], answer: "Karbonat angidrid", explanation: "Fotosintezda o‘simlik karbonat angidrid yutib, kislorod ajratadi." },
    { subject: "Fizika", q: "Tezlik qaysi formula bilan topiladi?", options: ["v = s · t", "v = s / t", "v = t / s", "v = s + t"], answer: "v = s / t", explanation: "Tezlik = yo‘l / vaqt, ya’ni v = s / t." },
    { subject: "Tarix", q: "Amir Temur o‘z davlatining poytaxti qilgan shahar qaysi?", options: ["Buxoro", "Samarqand", "Xiva", "Toshkent"], answer: "Samarqand", explanation: "Amir Temur davlatining poytaxti Samarqand bo‘lgan." }
  ];
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  let order = [], orderPos = 0, current = null, locked = false;
  let local = ls.get("eduai-quiz", { tests: 0, correct: 0 });
  let remote = null; // hisobga kirganda Supabase'dagi jami natija

  function renderTotals() {
    const t = remote || local;
    const acc = t.tests ? Math.round(t.correct / t.tests * 100) : 0;
    $("#testCount").textContent = t.tests;
    $("#resultTests").textContent = t.tests;
    $("#correctCount").textContent = t.correct;
    $("#accuracy").textContent = `${acc}%`;
    $("#resultBar").style.width = `${acc}%`;
    $("#resultNote").textContent = session
      ? "Natijalaringiz hisobingizda saqlanadi."
      : "Natijalar shu qurilmada saqlanadi. Hisobga kirsangiz, keyingi natijalar hisobingizda saqlanadi.";
  }
  function nextQuestion() {
    if (orderPos >= order.length) { order = shuffle(QUESTIONS.map((_, i) => i)); orderPos = 0; }
    current = { ...QUESTIONS[order[orderPos++]] };
    current.options = shuffle(current.options);
    locked = false;
    $("#quizStep").textContent = `${orderPos}-SAVOL · ${current.subject.toUpperCase()}`;
    $("#quizQuestion").textContent = current.q;
    const box = $("#quizOptions");
    box.replaceChildren();
    current.options.forEach((option) => {
      const b = el("button", "quiz-option");
      b.type = "button"; b.textContent = option;
      b.addEventListener("click", () => chooseAnswer(b));
      box.append(b);
    });
    $("#quizFeedback").textContent = "To‘g‘ri javobni tanla.";
    $("#nextQuestion").hidden = true;
  }
  async function chooseAnswer(button) {
    if (locked) return;
    locked = true;
    const q = current;
    const correct = button.textContent === q.answer;
    $$(".quiz-option").forEach((o) => {
      o.disabled = true;
      if (o.textContent === q.answer) o.classList.add("correct");
      else if (o === button) o.classList.add("wrong");
    });
    $("#quizFeedback").textContent = `${correct ? "To‘g‘ri! 🎉 " : "Hali emas. "}${q.explanation}`;
    $("#nextQuestion").hidden = false;

    local = { tests: local.tests + 1, correct: local.correct + (correct ? 1 : 0) };
    ls.set("eduai-quiz", local);
    bumpActivity();
    if (session && supabaseClient) {
      const { error } = await supabaseClient.from("learning_progress").insert({
        user_id: session.user.id, subject: q.subject, activity_type: "quiz",
        score: correct ? 1 : 0, details: { question: q.q }
      });
      if (error) { console.warn(error.message); toast("Natija hisobga saqlanmadi."); }
      else if (remote) remote = { tests: remote.tests + 1, correct: remote.correct + (correct ? 1 : 0) };
    }
    renderTotals();
  }
  $("#nextQuestion").addEventListener("click", nextQuestion);

  /* ---------- Supabase / hisob ---------- */
  const cfg = window.EDUAI_CONFIG || {};
  const supabaseReady = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  let supabaseClient = null;

  function updateAuthUI() {
    const email = session?.user?.email;
    $("#authOpen").textContent = email ? `👤 ${email}` : "Kirish / Ro‘yxatdan o‘tish";
    $("#authForm").hidden = Boolean(session);
    $("#authUser").hidden = !session;
    $("#authUserEmail").textContent = email || "";
  }
  async function loadRemoteData() {
    if (!session || !supabaseClient) { remote = null; renderTotals(); return; }
    const [stats, act, prof] = await Promise.all([
      supabaseClient.rpc("get_my_stats"),
      supabaseClient.rpc("get_my_activity", { p_days: 120 }),
      supabaseClient.from("profiles").select("display_name").maybeSingle()
    ]);
    if (stats.error) { console.warn(stats.error.message); remote = null; }
    else remote = { tests: stats.data?.tests || 0, correct: stats.data?.correct || 0 };
    if (!act.error && Array.isArray(act.data)) {
      act.data.forEach((r) => { activity[r.day] = Math.max(activity[r.day] || 0, r.count); });
      ls.set("eduai-activity", activity);
      renderActivity();
    }
    const name = prof.data?.display_name;
    $("#heroTitle").textContent = name ? `Salom, ${name}! 👋` : "Salom, bilim izlovchi! 👋";
    renderTotals();
    await loadChatHistory();
  }
  function onSession(newSession) {
    const wasLoggedIn = Boolean(session);
    session = newSession;
    updateAuthUI();
    if (wasLoggedIn && !newSession) {
      // umumiy qurilmada boshqa odam ko'rmasligi uchun chatni tozalash
      chatHistory.length = 0;
      messagesBox.replaceChildren();
      setText(addBubble("assistant"), "Salom! 😊 Men EduAI ustozman. Qaysi mavzuni o‘rganamiz?", "assistant");
      $("#heroTitle").textContent = "Salom, bilim izlovchi! 👋";
    }
    setTimeout(loadRemoteData, 0); // onAuthStateChange ichida to'g'ridan-to'g'ri so'rov yubormaslik uchun
  }
  if (supabaseReady) {
    supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    supabaseClient.auth.onAuthStateChange((_event, s) => onSession(s));
  }

  const authModal = $("#authModal");
  function openAuth() {
    authModal.hidden = false;
    $("#authMessage").textContent = supabaseReady ? "" : "Supabase sozlanmagan. public/config.js ga URL va anon key kiriting.";
    if (!session) setTimeout(() => canHover && $("#authEmail").focus(), 30);
  }
  function closeAuth() { authModal.hidden = true; }
  $("#authOpen").addEventListener("click", openAuth);
  $("#authClose").addEventListener("click", closeAuth);
  authModal.addEventListener("click", (e) => { if (e.target === authModal) closeAuth(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !authModal.hidden) closeAuth(); });

  async function authAction(mode) {
    const message = $("#authMessage");
    if (!supabaseClient) { message.textContent = "Supabase sozlanmagan. README.md dagi ko‘rsatmalarni bajaring."; return; }
    const form = $("#authForm");
    if (!form.reportValidity()) return;
    const email = $("#authEmail").value.trim(), password = $("#authPassword").value;
    message.textContent = "Biroz kuting…";
    try {
      const result = mode === "signup"
        ? await supabaseClient.auth.signUp({ email, password })
        : await supabaseClient.auth.signInWithPassword({ email, password });
      if (result.error) { message.textContent = result.error.message; return; }
      if (mode === "signup" && !result.data.session) {
        message.textContent = "Ro‘yxatdan o‘tildi. Emailingizni tasdiqlash talab qilinishi mumkin.";
        return;
      }
      $("#authPassword").value = "";
      message.textContent = "";
      closeAuth();
      toast("EduAI hisobiga xush kelibsiz.");
    } catch {
      message.textContent = "Tarmoq xatosi. Qayta urinib ko‘ring.";
    }
  }
  $("#authForm").addEventListener("submit", (e) => { e.preventDefault(); authAction("login"); });
  $("#signupBtn").addEventListener("click", () => authAction("signup"));
  $("#logoutBtn").addEventListener("click", async () => {
    await supabaseClient?.auth.signOut();
    closeAuth();
    toast("Tizimdan chiqdingiz.");
  });

  /* ---------- Boshlash ---------- */
  const now = new Date();
  $("#dateLabel").textContent = `${DAY_NAMES[now.getDay()]}, ${now.getDate()}-${MONTHS[now.getMonth()]} · BUGUNGI O‘QUV MAYDONINGIZ`.toUpperCase();

  fetch("/api/health").then((r) => r.json()).then((data) => {
    $("#aiStatus").textContent = data.aiConfigured
      ? `AI ulangan · ${data.model}${data.requireLogin ? " · kirish talab qilinadi" : ""}`
      : "Demo rejim · AI API sozlanmagan";
  }).catch(() => { $("#aiStatus").textContent = "Server bilan aloqa yo‘q"; });

  renderActivity();
  renderGoal();
  renderTotals();
  nextQuestion();
  updateAuthUI();
  showView(location.hash.slice(1));
})();
