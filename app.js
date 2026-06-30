(() => {
  "use strict";

  const STORAGE_KEY = "quiz.playedQuestionIds.v1";
  const SETTINGS_KEY = "quiz.settings.v1";
  const DEFAULT_QUESTION_COUNT = 20;

  const app = document.getElementById("app");
  const navLinks = Array.from(document.querySelectorAll("[data-view-link]"));
  const heroKicker = document.getElementById("hero-kicker");
  const heroTitle = document.getElementById("hero-title");
  const heroDescription = document.getElementById("hero-description");
  const themeColorMeta = document.getElementById("theme-color");
  const quiz = window.QUIZ_DATA;

  let memoryPlayedIds = new Set();
  let round = null;

  if (!quiz || !Array.isArray(quiz.categories)) {
    app.innerHTML = `<section class="panel"><h2>Kunde inte läsa quizdata</h2><p class="lead">Kontrollera att <code>quiz-data.js</code> laddas före <code>app.js</code>.</p></section>`;
    return;
  }

  const categories = quiz.categories;
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const questionById = new Map();

  categories.forEach((category) => {
    category.questions.forEach((question) => {
      question.categoryId = category.id;
      question.categoryTitle = cleanCategoryTitle(category.title);
      questionById.set(question.id, question);
    });
  });

  syncQuestionPlayedFlags(getPlayedIds());

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cleanCategoryTitle(title) {
    const cleaned = String(title || "Kategori").replace(/^\d+\s+/, "").trim();
    return cleaned ? cleaned.charAt(0).toLocaleUpperCase("sv-SE") + cleaned.slice(1) : "Kategori";
  }

  function getCurrentView() {
    const hash = window.location.hash.replace("#", "").trim().toLowerCase();
    return hash === "quiz" || hash === "custom" ? "custom" : "football";
  }

  function getViewLabel(view) {
    return view === "football" ? "Fotbollsquiz" : "Quiz";
  }

  function getFootballCategoryIds() {
    return categories
      .filter((category) => category.group === "football" || category.id.includes("fotboll") || category.id.includes("svenska_landslaget"))
      .map((category) => category.id);
  }

  function getAllCategoryIds() {
    return categories.map((category) => category.id);
  }

  function getPlayedIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set(memoryPlayedIds);
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set(memoryPlayedIds);
    }
  }

  function savePlayedIds(ids) {
    memoryPlayedIds = new Set(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // In private browsing or locked-down webviews, in-memory state still works for the session.
    }
    syncQuestionPlayedFlags(ids);
  }

  function syncQuestionPlayedFlags(ids) {
    questionById.forEach((question, id) => {
      question.played = ids.has(id);
    });
  }

  function markAsPlayed(questionId) {
    const ids = getPlayedIds();
    if (ids.has(questionId)) return;
    ids.add(questionId);
    savePlayedIds(ids);
  }

  function resetPlayedIds() {
    savePlayedIds(new Set());
  }

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Non-critical.
    }
  }

  function questionsForCategoryIds(categoryIds) {
    return categoryIds.flatMap((id) => {
      const category = categoryById.get(id);
      return category ? category.questions : [];
    });
  }

  function countPlayedIn(questionList) {
    const playedIds = getPlayedIds();
    return questionList.filter((question) => playedIds.has(question.id)).length;
  }

  function shuffleCopy(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  function updateShell(view = getCurrentView()) {
    document.body.classList.toggle("view-football", view === "football");
    document.body.classList.toggle("view-custom", view === "custom");

    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", view === "football" ? "#07131c" : "#8a5a2b");
    }

    if (!heroKicker || !heroTitle || !heroDescription) return;

    if (view === "football") {
      heroKicker.textContent = "Sverige - Frankrike på lokal • fotbollsquiz";
      heroTitle.textContent = "Fotbollsquiz";
      heroDescription.textContent = "Konstruera en runda med fotbollsfrågor.";
      return;
    }

    heroKicker.textContent = "Pubquiz • Mobilvänligt • Offlinekompatibelt";
    heroTitle.textContent = "Quiz";
    heroDescription.textContent = "Bygg en egen runda av kategorierna. Appen håller (*i bästa fall, med viss reservation) reda på vilka frågor som redan har visats på den här enheten.";
  }

  function updateNavigation(view = getCurrentView()) {
    updateShell(view);
    navLinks.forEach((link) => {
      const isCurrent = link.dataset.viewLink === view;
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function renderSetup(view = getCurrentView()) {
    round = null;
    updateNavigation(view);

    const settings = loadSettings();
    const footballIds = getFootballCategoryIds();
    const availableCategoryIds = view === "football" ? footballIds : getAllCategoryIds();
    const storedIds = view === "football" ? settings.footballCategoryIds : settings.customCategoryIds;
    const defaultIds = Array.isArray(storedIds) && storedIds.length
      ? storedIds.filter((id) => availableCategoryIds.includes(id))
      : availableCategoryIds;

    const selectedIds = defaultIds.length ? defaultIds : availableCategoryIds;
    const totalQuestions = questionsForCategoryIds(availableCategoryIds).length;
    const modeQuestions = questionsForCategoryIds(selectedIds);
    const playedInMode = countPlayedIn(modeQuestions);
    const heading = view === "football" ? "Fotbollsquiz" : "Quiz";
    const lead = view === "football"
      ? "Konstruera en runda med fotbollsfrågor."
      : "Välj fritt bland alla kategorier och bygg en lagom lång runda. Kategorierna kan blandas, och redan visade frågor kan filtreras bort.";

    app.innerHTML = `
      <section class="panel" aria-labelledby="setup-title">
        <div class="panel-header">
          <div>
            <p class="kicker">${escapeHtml(getViewLabel(view))}</p>
            <h2 id="setup-title">${escapeHtml(heading)}</h2>
            <p class="lead">${escapeHtml(lead)}</p>
          </div>
          <div class="stat-pill" aria-label="Spelade frågor i detta läge">
            <strong>${playedInMode}</strong>
            <span>visade av ${totalQuestions}</span>
          </div>
        </div>

        <form id="setup-form" class="setup-grid" autocomplete="off">
          <div>
            ${view === "football" ? renderCategoryPicker(selectedIds, footballIds, "Fotbollskategorier") : renderCategoryPicker(selectedIds, getAllCategoryIds(), "Kategorier")}
          </div>

          <aside class="options-card" aria-label="Quizinställningar">
            <label class="field-label" for="question-count">Antal frågor i rundan</label>
            <div class="count-row">
              <div>
                <input id="question-count" name="questionCount" type="number" inputmode="numeric" min="1" step="1" value="${Number(settings.questionCount) || DEFAULT_QUESTION_COUNT}">
              </div>
              <button class="btn btn-secondary" type="button" data-action="max-count">Max</button>
            </div>

            <label class="option-row">
              <input id="only-unplayed" name="onlyUnplayed" type="checkbox" ${settings.onlyUnplayed === false ? "" : "checked"}>
              <span class="option-copy">
                <strong>Använd bara ospelade frågor</strong>
                <span>Frågor markeras som spelade när de visas, inte först när svaret öppnas.</span>
              </span>
            </label>

            <div class="actions">
              <button id="start-button" class="btn btn-primary" type="submit">Starta runda</button>
              <button class="btn btn-ghost" type="button" data-action="reset-played">Nollställ spelade</button>
            </div>
            <p id="setup-warning" class="warning" role="status" aria-live="polite"></p>
          </aside>
        </form>
      </section>
    `;

    bindSetup(view);
    app.focus({ preventScroll: true });
  }

  function renderIncludedCategories(categoryIds) {
    const cards = categoryIds.map((id) => {
      const category = categoryById.get(id);
      if (!category) return "";
      return `
        <div class="included-card">
          <span class="category-title">${escapeHtml(cleanCategoryTitle(category.title))}</span>
          <span class="category-count">${category.questions.length} frågor</span>
          <input type="hidden" name="category" value="${escapeHtml(category.id)}">
        </div>
      `;
    }).join("");

    return `
      <fieldset>
        <legend>Ingår i fotbollsquizet</legend>
        <div class="included-list">${cards}</div>
      </fieldset>
    `;
  }

  function renderCategoryPicker(selectedIds, allowedCategoryIds = getAllCategoryIds(), label = "Kategorier") {
    const selected = new Set(selectedIds);
    const cards = allowedCategoryIds.map((id) => categoryById.get(id)).filter(Boolean).map((category) => `
      <label class="category-card">
        <input type="checkbox" name="category" value="${escapeHtml(category.id)}" ${selected.has(category.id) ? "checked" : ""}>
        <span class="category-title">${escapeHtml(cleanCategoryTitle(category.title))}</span>
        <span class="category-count">${category.questions.length}</span>
      </label>
    `).join("");

    return `
      <fieldset>
        <legend>${escapeHtml(label)}</legend>
        <div class="category-tools">
          <button class="btn btn-secondary" type="button" data-action="select-all">Välj alla</button>
          <button class="btn btn-ghost" type="button" data-action="select-none">Avmarkera alla</button>
        </div>
        <div class="category-grid">${cards}</div>
      </fieldset>
    `;
  }

  function bindSetup(view) {
    const form = document.getElementById("setup-form");
    const countInput = document.getElementById("question-count");
    const onlyUnplayedInput = document.getElementById("only-unplayed");
    const warning = document.getElementById("setup-warning");
    const startButton = document.getElementById("start-button");

    function selectedCategoryIds() {
      return Array.from(form.querySelectorAll('input[name="category"]'))
        .filter((input) => input.type === "hidden" || input.checked)
        .map((input) => input.value);
    }

    function currentAvailability() {
      const categoryIds = selectedCategoryIds();
      const allQuestions = questionsForCategoryIds(categoryIds);
      const playedIds = getPlayedIds();
      const unplayed = allQuestions.filter((question) => !playedIds.has(question.id));
      const useOnlyUnplayed = onlyUnplayedInput.checked;
      return {
        categoryIds,
        allQuestions,
        availableQuestions: useOnlyUnplayed ? unplayed : allQuestions,
        unplayedCount: unplayed.length,
        playedCount: allQuestions.length - unplayed.length,
        useOnlyUnplayed
      };
    }

    function updateAvailability() {
      const info = currentAvailability();
      const max = info.availableQuestions.length;
      const currentValue = Number(countInput.value) || DEFAULT_QUESTION_COUNT;
      countInput.min = max === 0 ? "0" : "1";
      countInput.max = String(max);
      countInput.value = String(max === 0 ? 0 : Math.min(Math.max(1, currentValue), max));
      startButton.disabled = max === 0 || info.categoryIds.length === 0;
      warning.textContent = "";

      if (info.categoryIds.length === 0) {
        warning.textContent = "Välj minst en kategori.";
        return;
      }

      if (max === 0) {
        warning.textContent = info.useOnlyUnplayed
          ? "Det finns inga ospelade frågor i det här urvalet."
          : "Det finns inga frågor i det här urvalet.";
      }
    }

    form.addEventListener("change", (event) => {
      if (event.target.matches('input[name="category"], #only-unplayed')) {
        updateAvailability();
      }
    });

    countInput.addEventListener("input", updateAvailability);

    form.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      if (action === "select-all" || action === "select-none") {
        form.querySelectorAll('input[name="category"][type="checkbox"]').forEach((input) => {
          input.checked = action === "select-all";
        });
        updateAvailability();
      }

      if (action === "max-count") {
        countInput.value = countInput.max || countInput.value;
        updateAvailability();
      }

      if (action === "reset-played") {
        const confirmed = window.confirm("Nollställa spelhistoriken på den här enheten?");
        if (!confirmed) return;
        resetPlayedIds();
        updateAvailability();
        warning.textContent = "Spelhistoriken är nollställd.";
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const info = currentAvailability();
      const requestedCount = Number(countInput.value);
      const count = Math.min(Math.max(1, requestedCount || DEFAULT_QUESTION_COUNT), info.availableQuestions.length);

      if (!info.categoryIds.length) {
        warning.textContent = "Välj minst en kategori först.";
        return;
      }
      if (!info.availableQuestions.length) {
        warning.textContent = "Det finns inga valbara frågor med nuvarande filter. Nollställ spelade frågor eller stäng av filtret.";
        return;
      }

      const previousSettings = loadSettings();
      saveSettings({
        ...previousSettings,
        footballCategoryIds: view === "football" ? info.categoryIds : previousSettings.footballCategoryIds,
        customCategoryIds: view === "custom" ? info.categoryIds : previousSettings.customCategoryIds,
        onlyUnplayed: onlyUnplayedInput.checked,
        questionCount: count
      });

      const pool = shuffleCopy(info.availableQuestions);
      startRound({
        view,
        categoryIds: info.categoryIds,
        questions: pool.slice(0, count),
        onlyUnplayed: onlyUnplayedInput.checked,
        shuffled: true
      });
    });

    updateAvailability();
  }

  function startRound(config) {
    round = {
      ...config,
      index: 0,
      highestSeenIndex: 0,
      revealedQuestionIds: new Set(),
      startedAt: new Date().toISOString()
    };
    renderRound();
    app.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderRound() {
    if (!round || !round.questions.length) {
      renderSetup(getCurrentView());
      return;
    }

    const question = round.questions[round.index];
    round.highestSeenIndex = Math.max(round.highestSeenIndex, round.index);
    markAsPlayed(question.id);

    const total = round.questions.length;
    const current = round.index + 1;
    const progress = Math.round((current / total) * 100);
    const isRevealed = round.revealedQuestionIds.has(question.id);
    const canGoPrevious = round.index > 0;
    const isLast = round.index === total - 1;

    app.innerHTML = `
      <section class="round-card" aria-labelledby="question-title">
        <div class="round-top">
          <div class="progress-meta">
            <span>Fråga ${current} av ${total}</span>
            <span>${round.highestSeenIndex + 1}/${total} visade i rundan</span>
          </div>
          <div class="progress-bar" aria-hidden="true"><span style="--progress: ${progress}%"></span></div>
        </div>

        <div class="question-area">
          <span class="category-badge">${escapeHtml(question.categoryTitle)}</span>
          <h2 id="question-title" class="question-text">${escapeHtml(question.q)}</h2>
          ${isRevealed ? `
            <div id="answer" class="answer-box">
              <p class="answer-label">Svar</p>
              <p class="answer-text">${escapeHtml(question.a)}</p>
            </div>
          ` : ""}
        </div>

        <div class="round-controls">
          <button class="arrow-btn" type="button" data-action="previous-question" ${canGoPrevious ? "" : "disabled"} aria-label="Föregående fråga">
            <span class="arrow-symbol" aria-hidden="true">←</span>
            <span class="arrow-label">Föregående</span>
          </button>
          <button class="toggle-answer" type="button" data-action="toggle-answer" aria-expanded="${isRevealed ? "true" : "false"}" aria-controls="answer">${isRevealed ? "Dölj svar" : "Visa svar"}</button>
          <button class="arrow-btn" type="button" data-action="next-question" aria-label="${isLast ? "Avsluta runda" : "Nästa fråga"}">
            <span class="arrow-label">${isLast ? "Klar" : "Nästa"}</span>
            <span class="arrow-symbol" aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <div class="round-exit-actions">
        <button class="btn btn-quiet" type="button" data-action="end-round">Avsluta och gå till start</button>
      </div>
    `;
  }

  function renderDone() {
    if (!round) {
      renderSetup(getCurrentView());
      return;
    }

    const playedIds = getPlayedIds();
    const totalQuestions = questionsForCategoryIds(getAllCategoryIds()).length;
    const modeQuestions = questionsForCategoryIds(round.categoryIds).length;
    const playedInMode = questionsForCategoryIds(round.categoryIds).filter((question) => playedIds.has(question.id)).length;

    app.innerHTML = `
      <section class="panel done-card" aria-labelledby="done-title">
        <p class="kicker">Runda klar</p>
        <h2 id="done-title">Bra spelat.</h2>
        <p>Alla frågor som visades i rundan är nu markerade som spelade på den här enheten.</p>

        <div class="done-stats" aria-label="Sammanfattning">
          <div class="done-stat"><strong>${round.questions.length}</strong><span>frågor i rundan</span></div>
          <div class="done-stat"><strong>${playedInMode}</strong><span>visade i urvalet</span></div>
          <div class="done-stat"><strong>${playedIds.size}/${totalQuestions}</strong><span>visade totalt</span></div>
        </div>

        <div class="actions" style="justify-content:center">
          <button class="btn btn-primary" type="button" data-action="new-round-same">${round.view === "football" ? "Nytt fotbollsquiz" : "Nytt quiz"}</button>
          <button class="btn btn-secondary" type="button" data-action="go-football">Fotbollsquiz</button>
          <button class="btn btn-ghost" type="button" data-action="go-custom">Quiz</button>
        </div>
      </section>
    `;
  }

  app.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;

    if (action === "toggle-answer" && round) {
      const question = round.questions[round.index];
      if (round.revealedQuestionIds.has(question.id)) round.revealedQuestionIds.delete(question.id);
      else round.revealedQuestionIds.add(question.id);
      renderRound();
    }

    if (action === "previous-question" && round && round.index > 0) {
      round.index -= 1;
      renderRound();
    }

    if (action === "next-question" && round) {
      if (round.index >= round.questions.length - 1) {
        renderDone();
      } else {
        round.index += 1;
        renderRound();
      }
    }

    if (action === "end-round") {
      renderSetup(round?.view || getCurrentView());
    }

    if (action === "new-round-same") {
      renderSetup(round?.view || getCurrentView());
    }

    if (action === "go-football") {
      window.location.hash = "football";
      renderSetup("football");
    }

    if (action === "go-custom") {
      window.location.hash = "quiz";
      renderSetup("custom");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!round) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

    if (event.key === "ArrowLeft" && round.index > 0) {
      event.preventDefault();
      round.index -= 1;
      renderRound();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (round.index >= round.questions.length - 1) renderDone();
      else {
        round.index += 1;
        renderRound();
      }
    }

    if (event.key.toLowerCase() === "s" || event.key === " ") {
      event.preventDefault();
      const question = round.questions[round.index];
      if (round.revealedQuestionIds.has(question.id)) round.revealedQuestionIds.delete(question.id);
      else round.revealedQuestionIds.add(question.id);
      renderRound();
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const requestedView = link.dataset.viewLink;
      if (requestedView === getCurrentView()) {
        event.preventDefault();
        renderSetup(requestedView);
      }
    });
  });

  window.addEventListener("hashchange", () => {
    renderSetup(getCurrentView());
  });

  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // The quiz still works online without service worker support.
      });
    });
  }

  if (!window.location.hash) {
    window.location.hash = "football";
    renderSetup("football");
  } else {
    renderSetup(getCurrentView());
  }
})();
