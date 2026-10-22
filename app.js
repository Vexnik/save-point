(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "save-point-data-v1";
  const STATUSES = ["Playing", "Completed", "Backlog", "On hold", "Dropped"];
  const RATINGS = { "Loved it": 5, "Liked it": 4, "It was okay": 3, "Disliked it": 2, "Not for me": 1 };
  const KNOWN_PLATFORMS = ["Nintendo Switch", "Nintendo 3DS", "PC", "PlayStation", "Xbox", "Mobile"];

  let games = [];
  let entries = [];
  let currentView = "all";
  let currentPlatform = "All";
  let journalMode = false;

  /* ---------- Helpers ---------- */

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }

  function safeImageUrl(value = "") {
    try {
      const u = new URL(value);
      return ["https:", "http:"].includes(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  }

  function dateLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function ratingValue(rating) {
    return RATINGS[rating] || 0;
  }

  /* ---------- Data validation ---------- */
  // Anything coming from localStorage or an imported file is untrusted:
  // it may be hand-edited, from an older version, or just malformed.

  const text = (value) => (typeof value === "string" ? value.trim() : "");
  const isoOrNow = (value) => (typeof value === "string" && !Number.isNaN(new Date(value).getTime()) ? value : new Date().toISOString());

  function normalizeGame(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = text(raw.title);
    if (!title) return null;
    const hours = Number(raw.hours);
    const created = isoOrNow(raw.created);
    return {
      id: text(raw.id) || uid(),
      title,
      platform: text(raw.platform) || "Other",
      status: STATUSES.includes(raw.status) ? raw.status : "Backlog",
      hours: Number.isFinite(hours) ? Math.max(0, hours) : 0,
      rating: Object.hasOwn(RATINGS, raw.rating) ? raw.rating : "",
      cover: safeImageUrl(text(raw.cover)),
      note: text(raw.note),
      created,
      updated: isoOrNow(raw.updated || created),
    };
  }

  function normalizeEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = text(raw.title);
    const body = text(raw.body);
    if (!title || !body) return null;
    const created = isoOrNow(raw.created);
    return {
      id: text(raw.id) || uid(),
      title,
      gameId: text(raw.gameId),
      body,
      created,
      updated: isoOrNow(raw.updated || created),
    };
  }

  // Returns clean arrays plus a count of items that had to be dropped.
  function normalizeLibrary(rawGames, rawEntries) {
    const gameList = Array.isArray(rawGames) ? rawGames : [];
    const entryList = Array.isArray(rawEntries) ? rawEntries : [];
    const seenGames = new Set();
    const seenEntries = new Set();
    const cleanGames = [];
    const cleanEntries = [];

    for (const raw of gameList) {
      const game = normalizeGame(raw);
      if (!game) continue;
      if (seenGames.has(game.id)) game.id = uid();
      seenGames.add(game.id);
      cleanGames.push(game);
    }
    for (const raw of entryList) {
      const entry = normalizeEntry(raw);
      if (!entry) continue;
      if (seenEntries.has(entry.id)) entry.id = uid();
      seenEntries.add(entry.id);
      if (entry.gameId && !seenGames.has(entry.gameId)) entry.gameId = "";
      cleanEntries.push(entry);
    }

    return {
      games: cleanGames,
      entries: cleanEntries,
      skipped: gameList.length - cleanGames.length + (entryList.length - cleanEntries.length),
    };
  }

  /* ---------- Storage ---------- */

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
      const saved = JSON.parse(raw || "{}");
      ({ games, entries } = normalizeLibrary(saved?.games, saved?.entries));
    } catch {
      games = [];
      entries = [];
      // Keep unreadable data around instead of letting the next save overwrite it.
      try {
        if (raw) localStorage.setItem(`${STORAGE_KEY}-unreadable`, raw);
      } catch {
        /* storage is full or blocked; nothing more we can do */
      }
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ games, entries }));
    } catch {
      alert("Your browser couldn't save this data. Try exporting a backup and freeing some browser storage.");
    }
  }

  /* ---------- Rendering ---------- */

  function counts() {
    const count = (status) => games.filter((g) => g.status === status).length;
    $("stat-total").textContent = games.length;
    $("stat-playing").textContent = count("Playing");
    $("stat-completed").textContent = count("Completed");
    $("stat-entries").textContent = entries.length;
    $("nav-all").textContent = games.length;
    $("nav-playing").textContent = count("Playing");
    $("nav-backlog").textContent = count("Backlog");
    $("nav-completed").textContent = count("Completed");
    $("nav-hold").textContent = count("On hold");
    $("nav-dropped").textContent = count("Dropped");
  }

  function renderGames() {
    counts();
    const query = $("search").value.trim().toLowerCase();
    const filtered = games.filter((g) => {
      const matchesView = currentView === "all" || g.status === currentView;
      const matchesPlatform =
        currentPlatform === "All" ||
        g.platform === currentPlatform ||
        (currentPlatform === "Other" && !KNOWN_PLATFORMS.includes(g.platform));
      const matchesQuery = `${g.title} ${g.platform} ${g.note || ""} ${g.status}`.toLowerCase().includes(query);
      return matchesView && matchesPlatform && matchesQuery;
    });

    const sort = $("sort").value;
    filtered.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "rating") return ratingValue(b.rating) - ratingValue(a.rating);
      if (sort === "hours") return (b.hours || 0) - (a.hours || 0);
      return (b.updated || b.created || "").localeCompare(a.updated || a.created || "");
    });

    $("game-grid").innerHTML = filtered
      .map((g) => {
        const cover = safeImageUrl(g.cover);
        return `<article class="game-card">
        <div class="cover">${cover ? `<img src="${escapeHTML(cover)}" alt="Cover art for ${escapeHTML(g.title)}" loading="lazy">` : ""}<span class="cover-placeholder" aria-hidden="true">✧</span><span class="status-pill">${escapeHTML(g.status)}</span></div>
        <div class="card-content"><div class="game-platform">${escapeHTML(g.platform)}</div><div class="game-title">${escapeHTML(g.title)}</div>
        <div class="game-meta"><span>◷ ${Number(g.hours) || 0} hrs</span><span>${g.created ? dateLabel(g.created) : "Just added"}</span></div>
        <div class="game-rating">${g.rating ? `✦ ${escapeHTML(g.rating)}` : "Not rated yet"}</div>
        ${g.note ? `<div class="card-note">${escapeHTML(g.note)}</div>` : `<div class="card-note"></div>`}
        <div class="card-actions"><button class="small-btn" data-edit-game="${escapeHTML(g.id)}">Edit</button><button class="small-btn" data-journal-game="${escapeHTML(g.id)}">＋ Journal</button><button class="small-btn danger" data-delete-game="${escapeHTML(g.id)}" aria-label="Delete ${escapeHTML(g.title)}">×</button></div></div></article>`;
      })
      .join("");

    const empty = filtered.length === 0;
    $("game-grid").style.display = empty ? "none" : "grid";
    $("empty-state").style.display = empty ? "block" : "none";
    $("empty-state").querySelector("h3").textContent = games.length === 0 ? "Your next favorite is waiting." : "No games found. A plot twist.";
    $("empty-state").querySelector("p").textContent =
      games.length === 0
        ? "Add a game to start building your library. No backlog shame allowed."
        : "Try another search or filter—or add a new game.";
    $("empty-add-btn").style.display = games.length === 0 ? "inline-block" : "none";
  }

  function renderEntries() {
    counts();
    const sorted = [...entries].sort((a, b) => (b.updated || b.created || "").localeCompare(a.updated || a.created || ""));
    $("journal-list").innerHTML = sorted
      .map((e) => {
        const game = games.find((g) => g.id === e.gameId);
        return `<article class="journal-entry"><div class="journal-entry-head"><div><h3>${escapeHTML(e.title)}</h3><div class="entry-meta">${escapeHTML(game ? game.title : "GENERAL GAMING")} · ${dateLabel(e.updated || e.created)}</div></div><div class="entry-actions"><button data-edit-entry="${escapeHTML(e.id)}">Edit</button><button data-delete-entry="${escapeHTML(e.id)}">Delete</button></div></div><p>${escapeHTML(e.body)}</p></article>`;
      })
      .join("");
    $("journal-empty").style.display = sorted.length ? "none" : "block";
    $("journal-list").style.display = sorted.length ? "grid" : "none";
  }

  /* ---------- Views and dialogs ---------- */

  function setView(view) {
    currentView = view;
    journalMode = false;
    $("library-view").hidden = false;
    $("journal-view").hidden = true;
    $("current-section").textContent = view === "all" ? "ALL GAMES" : view.toUpperCase();
    $("library-title").innerHTML = `${view === "all" ? "Your library" : escapeHTML(view)}<span class="heading-dot">.</span>`;
    document.querySelectorAll(".nav-item[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    $("journal-nav").classList.remove("active");
    renderGames();
  }

  function showJournal() {
    journalMode = true;
    $("library-view").hidden = true;
    $("journal-view").hidden = false;
    $("current-section").textContent = "JOURNAL";
    document.querySelectorAll(".nav-item[data-view]").forEach((b) => b.classList.remove("active"));
    $("journal-nav").classList.add("active");
    renderEntries();
  }

  function openGame(id = "") {
    $("game-form").reset();
    $("game-id").value = id;
    $("game-modal-title").textContent = id ? "Edit game" : "Add a game";
    const g = games.find((x) => x.id === id);
    if (g) {
      $("game-title").value = g.title || "";
      $("game-platform").value = g.platform || "Nintendo Switch";
      $("game-status").value = g.status || "Backlog";
      $("game-hours").value = g.hours || 0;
      $("game-rating").value = g.rating || "";
      $("game-cover").value = g.cover || "";
      $("game-note").value = g.note || "";
    }
    $("game-dialog").showModal();
    $("game-title").focus();
  }

  function openEntry(id = "", gameId = "") {
    $("entry-form").reset();
    $("entry-id").value = id;
    $("entry-modal-title").textContent = id ? "Edit journal entry" : "New journal entry";
    $("entry-game").innerHTML =
      `<option value="">General gaming thoughts</option>` +
      games
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((g) => `<option value="${escapeHTML(g.id)}">${escapeHTML(g.title)}</option>`)
        .join("");
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      $("entry-title").value = entry.title || "";
      $("entry-game").value = entry.gameId || "";
      $("entry-body").value = entry.body || "";
    } else if (gameId) {
      $("entry-game").value = gameId;
    }
    $("entry-dialog").showModal();
    $("entry-title").focus();
  }

  /* ---------- Backup: export / import ---------- */

  function exportData() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), games, entries };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `save-point-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.games) || !Array.isArray(data.entries)) {
        throw new Error("This file doesn't look like a Save Point backup.");
      }
      const clean = normalizeLibrary(data.games, data.entries);
      const skippedNote = clean.skipped ? ` ${clean.skipped} invalid item(s) will be skipped.` : "";
      const message = `Import ${clean.games.length} games and ${clean.entries.length} journal entries?${skippedNote} This replaces the data currently saved in this browser.`;
      if (!confirm(message)) return;
      games = clean.games;
      entries = clean.entries;
      save();
      renderGames();
      renderEntries();
      alert("Backup imported. Your library has respawned.");
    } catch (err) {
      alert(err instanceof SyntaxError ? "That file isn't valid JSON." : err.message || "Could not import that file.");
    } finally {
      $("import-file").value = "";
    }
  }

  /* ---------- Events ---------- */

  document.querySelectorAll(".nav-item[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  $("journal-nav").addEventListener("click", showJournal);
  $("add-btn").addEventListener("click", () => openGame());
  $("empty-add-btn").addEventListener("click", () => openGame());
  $("journal-add-btn").addEventListener("click", () => openEntry());
  $("journal-empty-add").addEventListener("click", () => openEntry());
  $("search").addEventListener("input", renderGames);
  $("sort").addEventListener("change", renderGames);

  document.querySelectorAll("[data-platform]").forEach((b) =>
    b.addEventListener("click", () => {
      currentPlatform = b.dataset.platform;
      document.querySelectorAll("[data-platform]").forEach((x) => x.classList.toggle("active", x === b));
      renderGames();
    })
  );

  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => $(b.dataset.close).close()));

  $("game-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = $("game-id").value;
    const old = games.find((g) => g.id === id);
    const now = new Date().toISOString();
    const game = {
      id: id || uid(),
      title: $("game-title").value.trim(),
      platform: $("game-platform").value,
      status: $("game-status").value,
      hours: Math.max(0, Number($("game-hours").value) || 0),
      rating: $("game-rating").value,
      cover: safeImageUrl($("game-cover").value.trim()),
      note: $("game-note").value.trim(),
      created: old?.created || now,
      updated: now,
    };
    if (!game.title) return;
    if (old) games = games.map((g) => (g.id === id ? game : g));
    else games.push(game);
    save();
    $("game-dialog").close();
    renderGames();
    if (journalMode) renderEntries();
  });

  $("entry-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = $("entry-id").value;
    const old = entries.find((e) => e.id === id);
    const now = new Date().toISOString();
    const entry = {
      id: id || uid(),
      title: $("entry-title").value.trim(),
      gameId: $("entry-game").value,
      body: $("entry-body").value.trim(),
      created: old?.created || now,
      updated: now,
    };
    if (!entry.title || !entry.body) return;
    if (old) entries = entries.map((e) => (e.id === id ? entry : e));
    else entries.push(entry);
    save();
    $("entry-dialog").close();
    renderEntries();
    renderGames();
  });

  $("game-grid").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.editGame) openGame(button.dataset.editGame);
    if (button.dataset.journalGame) openEntry("", button.dataset.journalGame);
    if (button.dataset.deleteGame) {
      const game = games.find((g) => g.id === button.dataset.deleteGame);
      if (!game) return;
      if (!confirm(`Delete "${game.title}"? Related journal entries will stay, but won't be linked to this game.`)) return;
      games = games.filter((g) => g.id !== game.id);
      entries = entries.map((e) => (e.gameId === game.id ? { ...e, gameId: "" } : e));
      save();
      renderGames();
      if (journalMode) renderEntries();
    }
  });

  // Remove cover images that fail to load. "error" doesn't bubble, so listen in the capture phase.
  // (This replaces an inline onerror attribute, which would block a strict Content-Security-Policy.)
  $("game-grid").addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLImageElement) event.target.remove();
    },
    true
  );

  $("journal-list").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.editEntry) openEntry(button.dataset.editEntry);
    if (button.dataset.deleteEntry) {
      const entry = entries.find((x) => x.id === button.dataset.deleteEntry);
      if (entry && confirm(`Delete "${entry.title}"?`)) {
        entries = entries.filter((x) => x.id !== entry.id);
        save();
        renderEntries();
      }
    }
  });

  $("export-btn").addEventListener("click", exportData);
  $("import-file").addEventListener("change", (event) => {
    if (event.target.files[0]) importData(event.target.files[0]);
  });

  // Visible Import button next to Add, so import works on touch screens too.
  const importButton = document.createElement("button");
  importButton.className = "ghost-btn";
  importButton.textContent = "↧ Import";
  importButton.addEventListener("click", () => $("import-file").click());
  document.querySelector(".top-actions")?.insertBefore(importButton, $("add-btn"));

  // Keep multiple open tabs in sync.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    load();
    renderGames();
    renderEntries();
  });

  load();
  renderGames();
  renderEntries();
})();
ment.querySelectorAll("[data-platform]").forEach(b=>b.addEventListener("click",()=>{
    currentPlatform=b.dataset.platform;
    document.querySelectorAll("[data-platform]").forEach(x=>x.classList.toggle("active",x===b));
    renderGames();
  }));
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
  $("game-form").addEventListener("submit",event=>{
    event.preventDefault();
    const id=$("game-id").value, old=games.find(g=>g.id===id), now=new Date().toISOString();
    const game={id:id||uid(),title:$("game-title").value.trim(),platform:$("game-platform").value,status:$("game-status").value,hours:Math.max(0,Number($("game-hours").value)||0),rating:$("game-rating").value,cover:safeImageUrl($("game-cover").value.trim()),note:$("game-note").value.trim(),created:old?.created||now,updated:now};
    if(!game.title)return;
    if(old)games=games.map(g=>g.id===id?game:g);else games.push(game);
    save();$("game-dialog").close();renderGames();if(journalMode)renderEntries();
  });
  $("entry-form").addEventListener("submit",event=>{
    event.preventDefault();
    const id=$("entry-id").value,old=entries.find(e=>e.id===id),now=new Date().toISOString();
    const entry={id:id||uid(),title:$("entry-title").value.trim(),gameId:$("entry-game").value,body:$("entry-body").value.trim(),created:old?.created||now,updated:now};
    if(!entry.title||!entry.body)return;
    if(old)entries=entries.map(e=>e.id===id?entry:e);else entries.push(entry);
    save();$("entry-dialog").close();renderEntries();renderGames();
  });
  $("game-grid").addEventListener("click",event=>{
    const button=event.target.closest("button");if(!button)return;
    if(button.dataset.editGame)openGame(button.dataset.editGame);
    if(button.dataset.journalGame)openEntry("",button.dataset.journalGame);
    if(button.dataset.deleteGame){
      const game=games.find(g=>g.id===button.dataset.deleteGame);if(!game)return;
      if(!confirm(`Delete "${game.title}"? Related journal entries will stay, but won't be linked to this game.`))return;
      games=games.filter(g=>g.id!==game.id);save();renderGames();if(journalMode)renderEntries();
    }
  });
  $("journal-list").addEventListener("click",event=>{
    const button=event.target.closest("button");if(!button)return;
    if(button.dataset.editEntry)openEntry(button.dataset.editEntry);
    if(button.dataset.deleteEntry){const e=entries.find(x=>x.id===button.dataset.deleteEntry);if(e&&confirm(`Delete "${e.title}"?`)){entries=entries.filter(x=>x.id!==e.id);save();renderEntries();}}
  });
  $("export-btn").addEventListener("click",exportData);
  $("export-btn").addEventListener("contextmenu",event=>{event.preventDefault();$("import-file").click();});
  $("export-btn").title="Click to export a backup. Right-click to import one on desktop.";
  $("import-file").addEventListener("change",event=>{if(event.target.files[0])importData(event.target.files[0]);});
  // Also expose import in a predictable place for touch screens.
  const importButton=document.createElement("button");importButton.className="ghost-btn";importButton.textContent="↧ Import";importButton.addEventListener("click",()=>$("import-file").click());$("topbar-placeholder");
  document.querySelector(".top-actions").insertBefore(importButton,$("add-btn"));
  load();renderGames();renderEntries();
})();
