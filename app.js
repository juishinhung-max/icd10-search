/**
 * ICD-10-CM 速查 · 主應用程式
 *
 * 功能：
 *  - 多欄位模糊搜尋（代碼 / 中文 / 英文 / 關鍵字）
 *  - 類別篩選
 *  - 我的最愛（localStorage）
 *  - 複製代碼
 *  - 匯入/匯出 JSON（最愛清單備份）
 *  - 視圖切換（搜尋 / 最愛 / 關於）
 */

(function () {
  "use strict";

  // ============ 常數與狀態 ============
  const STORAGE_KEY = "icd10cm_favorites_v1";
  const SEARCH_MIN_LENGTH = 1;
  const MAX_RESULTS = 200; // 避免一次渲染太多

  const state = {
    query: "",
    category: "all",
    favorites: loadFavorites(),
    view: "search",
  };

  // ============ Fuse.js 設定 ============
  // 多語言搜尋：中、英、代碼、關鍵字都納入索引
  const fuse = new Fuse(ICD_DATA, {
    keys: [
      { name: "code", weight: 2.0 },   // 代碼權重最高
      { name: "zh",   weight: 1.6 },
      { name: "en",   weight: 1.0 },
      { name: "kw",   weight: 0.8 },
      { name: "cat",  weight: 0.5 },
    ],
    threshold: 0.35,       // 0=完全符合，1=全部比對；0.35 兼顧容錯
    ignoreLocation: true,  // 不限制匹配位置
    minMatchCharLength: 1,
    includeScore: true,
    includeMatches: true,
    useExtendedSearch: false,
  });

  // ============ DOM 參照 ============
  const el = {
    search: document.getElementById("search-input"),
    hint: document.getElementById("search-hint"),
    chips: document.getElementById("category-chips"),
    stats: document.getElementById("stats"),
    results: document.getElementById("results"),
    favStats: document.getElementById("favorites-stats"),
    favResults: document.getElementById("favorites-results"),
    favCount: document.getElementById("fav-count"),
    toast: document.getElementById("toast"),
    btnExport: document.getElementById("btn-export"),
    btnImport: document.getElementById("btn-import"),
    importFile: document.getElementById("import-file"),
    navLinks: document.querySelectorAll(".nav-link"),
    views: document.querySelectorAll(".view"),
  };

  // ============ 初始化 ============
  function init() {
    renderCategoryChips();
    renderResults();
    renderFavorites();
    updateFavCount();
    bindEvents();
    handleHashChange();
  }

  // ============ 事件綁定 ============
  function bindEvents() {
    // 搜尋輸入
    el.search.addEventListener("input", (e) => {
      state.query = e.target.value.trim();
      renderResults();
    });

    // 鍵盤快捷鍵：Cmd/Ctrl+K 快速聚焦
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        el.search.focus();
        el.search.select();
      }
    });

    // 導覽
    el.navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        setView(view);
        history.replaceState(null, "", "#" + view);
      });
    });

    // Hash 變化
    window.addEventListener("hashchange", handleHashChange);

    // 匯出/匯入
    el.btnExport.addEventListener("click", exportFavorites);
    el.btnImport.addEventListener("click", () => el.importFile.click());
    el.importFile.addEventListener("change", importFavorites);
  }

  function handleHashChange() {
    const hash = location.hash.slice(1);
    const validViews = ["search", "favorites", "about"];
    if (validViews.includes(hash)) setView(hash);
  }

  // ============ 視圖切換 ============
  function setView(view) {
    state.view = view;
    el.navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.view === view);
    });
    el.views.forEach((v) => {
      v.classList.toggle("active", v.id === "view-" + view);
    });
    if (view === "favorites") renderFavorites();
    if (view === "search") el.search.focus();
  }

  // ============ 最愛管理 ============
  function loadFavorites() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      console.warn("載入最愛失敗", e);
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.favorites]));
    } catch (e) {
      console.warn("儲存最愛失敗", e);
      toast("儲存最愛失敗（瀏覽器儲存空間可能已滿）");
    }
  }

  function toggleFavorite(code) {
    if (state.favorites.has(code)) {
      state.favorites.delete(code);
      toast("已移除最愛");
    } else {
      state.favorites.add(code);
      toast("已加入最愛");
    }
    saveFavorites();
    updateFavCount();
    renderResults();
    if (state.view === "favorites") renderFavorites();
  }

  function updateFavCount() {
    el.favCount.textContent = state.favorites.size;
  }

  function exportFavorites() {
    if (state.favorites.size === 0) {
      toast("尚未加入任何最愛");
      return;
    }
    const favCodes = [...state.favorites];
    const favData = ICD_DATA.filter((item) => state.favorites.has(item.code));
    const exportObj = {
      version: 1,
      exportedAt: new Date().toISOString(),
      codes: favCodes,
      data: favData,
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `icd10-favorites-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`已匯出 ${favCodes.length} 筆最愛`);
  }

  function importFavorites(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        const codes = Array.isArray(obj) ? obj : (obj.codes || []);
        if (!Array.isArray(codes)) throw new Error("格式錯誤");
        let added = 0;
        codes.forEach((c) => {
          if (typeof c === "string" && !state.favorites.has(c)) {
            state.favorites.add(c);
            added++;
          }
        });
        saveFavorites();
        updateFavCount();
        renderResults();
        renderFavorites();
        toast(`已匯入 ${added} 筆（原有 ${codes.length - added} 筆已存在）`);
      } catch (err) {
        toast("匯入失敗：檔案格式錯誤");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // 允許同檔重選
  }

  // ============ 類別篩選 ============
  function renderCategoryChips() {
    const catCounts = {};
    ICD_DATA.forEach((item) => {
      catCounts[item.cat] = (catCounts[item.cat] || 0) + 1;
    });

    let html = `<button class="chip ${state.category === 'all' ? 'active' : ''}" data-cat="all">全部<span class="chip-count">${ICD_DATA.length}</span></button>`;

    const cats = CATEGORY_ORDER.filter((c) => catCounts[c]);
    cats.forEach((cat) => {
      html += `<button class="chip ${state.category === cat ? 'active' : ''}" data-cat="${escapeAttr(cat)}">${escapeHtml(cat)}<span class="chip-count">${catCounts[cat]}</span></button>`;
    });

    el.chips.innerHTML = html;
    el.chips.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        state.category = chip.dataset.cat;
        el.chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderResults();
      });
    });
  }

  // ============ 搜尋與渲染 ============
  function renderResults() {
    let items = [];
    let matches = null;

    if (state.query.length >= SEARCH_MIN_LENGTH) {
      const fuseResults = fuse.search(state.query).slice(0, MAX_RESULTS);
      items = fuseResults.map((r) => r.item);
      matches = new Map(fuseResults.map((r) => [r.item.code, r.matches]));
      el.hint.textContent = `找到 ${fuseResults.length} 筆符合「${state.query}」的結果`;
    } else {
      items = ICD_DATA;
      el.hint.textContent = `目前收錄 ${ICD_DATA.length} 筆代碼 · 輸入關鍵字開始搜尋`;
    }

    // 類別過濾
    if (state.category !== "all") {
      items = items.filter((item) => item.cat === state.category);
    }

    // 限制總數
    const displayItems = items.slice(0, MAX_RESULTS);
    const total = items.length;

    // 顯示統計
    if (state.query) {
      el.stats.textContent = `顯示 ${displayItems.length} / ${total} 筆${state.category !== 'all' ? ` · 分類：${state.category}` : ''}`;
    } else {
      el.stats.textContent = state.category !== "all" ? `分類：${state.category}（${total} 筆）` : "";
    }

    // 渲染結果
    if (displayItems.length === 0) {
      el.results.innerHTML = renderEmpty(
        state.query ? "找不到符合的代碼" : "目前沒有資料",
        state.query ? "試試其他關鍵字，或切換到其他分類" : ""
      );
    } else {
      el.results.innerHTML = displayItems.map((item) => renderCard(item, matches)).join("");
      bindCardEvents(el.results);
    }
  }

  function renderCard(item, matches) {
    const isFav = state.favorites.has(item.code);
    const matchInfo = matches ? matches.get(item.code) : null;
    const codeWithDot = item.code;
    const codeNoDot = item.code.replace(/\./g, "");
    const hasDot = codeWithDot !== codeNoDot;
    return `
      <div class="code-card">
        <div class="code-main">
          <div class="code-number">${highlight(item.code, matchInfo, "code")}</div>
          <div class="code-zh">${highlight(item.zh, matchInfo, "zh")}</div>
          <div class="code-en">${highlight(item.en, matchInfo, "en")}</div>
          <span class="code-cat">${escapeHtml(item.cat)}</span>
        </div>
        <div class="actions">
          <button class="icon-btn ${isFav ? 'favorited' : ''}" data-fav="${escapeAttr(item.code)}" title="${isFav ? '移除最愛' : '加入最愛'}" aria-label="${isFav ? '移除最愛' : '加入最愛'}">
            <svg class="star" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </button>
          <div class="copy-group">
            <button class="copy-pill" data-copy="${escapeAttr(codeWithDot)}" title="複製：${escapeAttr(codeWithDot)}（含小數點）" aria-label="複製代碼 ${escapeAttr(codeWithDot)} 含小數點">
              <svg class="copy-pill-icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>${escapeHtml(codeWithDot)}</span>
            </button>
            ${hasDot ? `
            <button class="copy-pill copy-pill-alt" data-copy="${escapeAttr(codeNoDot)}" title="複製：${escapeAttr(codeNoDot)}（無小數點）" aria-label="複製代碼 ${escapeAttr(codeNoDot)} 無小數點">
              <svg class="copy-pill-icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>${escapeHtml(codeNoDot)}</span>
            </button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function renderEmpty(title, desc) {
    return `
      <div class="empty" style="grid-column: 1 / -1;">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">${escapeHtml(title)}</div>
        ${desc ? `<div class="empty-desc">${escapeHtml(desc)}</div>` : ""}
      </div>
    `;
  }

  function bindCardEvents(container) {
    container.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.addEventListener("click", () => toggleFavorite(btn.dataset.fav));
    });
    container.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", () => copyCode(btn.dataset.copy));
    });
  }

  function renderFavorites() {
    const items = ICD_DATA.filter((item) => state.favorites.has(item.code));
    el.favStats.textContent = items.length > 0 ? `共 ${items.length} 筆最愛代碼` : "";

    if (items.length === 0) {
      el.favResults.innerHTML = renderEmpty(
        "尚未加入任何最愛",
        "在搜尋結果中點擊 ★ 圖示，把常用代碼加入這裡"
      );
      return;
    }

    // 按類別分組
    const groups = {};
    items.forEach((item) => {
      if (!groups[item.cat]) groups[item.cat] = [];
      groups[item.cat].push(item);
    });

    let html = "";
    CATEGORY_ORDER.forEach((cat) => {
      if (!groups[cat]) return;
      html += `<h3 style="font-size:14px;color:var(--color-text-secondary);margin:18px 0 8px;padding-left:4px;">${escapeHtml(cat)}（${groups[cat].length}）</h3>`;
      html += `<div class="results" style="margin-bottom:8px;">`;
      html += groups[cat].map((item) => renderCard(item, null)).join("");
      html += `</div>`;
    });

    el.favResults.innerHTML = html;
    bindCardEvents(el.favResults);
  }

  // ============ 工具函式 ============
  function copyCode(code) {
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast("已複製：" + code);
      } catch (e) {
        toast("複製失敗");
      }
      document.body.removeChild(ta);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code)
        .then(() => toast("已複製：" + code))
        .catch(fallback);
    } else {
      fallback();
    }
  }

  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1600);
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  /**
   * 依照 Fuse.js 的 matches 資料高亮顯示命中字元
   */
  function highlight(text, matchInfo, key) {
    const safe = escapeHtml(text);
    if (!matchInfo) return safe;
    const m = matchInfo.find((x) => x.key === key);
    if (!m || !m.indices || m.indices.length === 0) return safe;

    // 組合 indices 區段
    const indices = m.indices.slice().sort((a, b) => a[0] - b[0]);
    let result = "";
    let pos = 0;
    indices.forEach(([start, end]) => {
      if (start > pos) result += escapeHtml(text.slice(pos, start));
      result += `<span class="match">${escapeHtml(text.slice(start, end + 1))}</span>`;
      pos = end + 1;
    });
    if (pos < text.length) result += escapeHtml(text.slice(pos));
    return result;
  }

  // ============ 啟動 ============
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
