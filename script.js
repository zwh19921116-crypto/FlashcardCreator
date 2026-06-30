(() => {
  "use strict";

  const STORAGE_KEYS = {
    sets: "edgeducate_flashcards_sets",
    progress: "edgeducate_flashcards_progress",
    settings: "edgeducate_flashcards_settings"
  };

  const LIMITS = {
    maxImportSize: 1024 * 1024,
    maxSets: 100,
    maxCardsPerSet: 200,
    maxFrontLength: 500,
    maxBackLength: 1000,
    maxTitleLength: 100,
    maxSubjectLength: 80,
    maxYearLevelLength: 50,
    maxDescriptionLength: 250
  };

  const PUBLIC_MANIFEST = [
    { filename: "fractions-basics.json", title: "Fractions Basics" },
    { filename: "algebra-basics.json", title: "Algebra Basics" },
    { filename: "science-forces.json", title: "Science Forces" }
  ];

  // Fallback data helps local file opening when browser blocks fetch on file://
  const PUBLIC_FALLBACK = {
    "fractions-basics.json": {
      title: "Fractions Basics",
      subject: "Mathematics",
      yearLevel: "Year 5",
      description: "Introduction to fractions",
      cards: [
        { id: 1, front: "What is a numerator?", back: "The top number in a fraction." },
        { id: 2, front: "What is a denominator?", back: "The bottom number in a fraction." },
        { id: 3, front: "What are equivalent fractions?", back: "Fractions that represent the same value, like 1/2 and 2/4." },
        { id: 4, front: "How do you simplify a fraction?", back: "Divide the numerator and denominator by the same greatest factor." },
        { id: 5, front: "What is the lowest common multiple used for with fractions?", back: "To find a common denominator when adding or subtracting." },
        { id: 6, front: "Add 1/4 + 2/4", back: "3/4" },
        { id: 7, front: "Subtract 5/6 - 1/6", back: "4/6, which simplifies to 2/3." },
        { id: 8, front: "What is 3/9 in simplest form?", back: "1/3" }
      ]
    },
    "algebra-basics.json": {
      title: "Algebra Basics",
      subject: "Mathematics",
      yearLevel: "Year 7",
      description: "Core algebra concepts for beginners",
      cards: [
        { id: 1, front: "What is a variable?", back: "A symbol, often a letter, that represents a number." },
        { id: 2, front: "What is an expression?", back: "A mathematical phrase with numbers, variables, and operations." },
        { id: 3, front: "What is an equation?", back: "A statement that two expressions are equal." },
        { id: 4, front: "What are like terms?", back: "Terms with the same variable part, such as 3x and -2x." },
        { id: 5, front: "Simplify: 4x + 3x", back: "7x" },
        { id: 6, front: "Substitute x = 5 into x + 2", back: "7" },
        { id: 7, front: "Solve: x + 4 = 10", back: "x = 6" },
        { id: 8, front: "Solve: 3x = 21", back: "x = 7" }
      ]
    },
    "science-forces.json": {
      title: "Science Forces",
      subject: "Science",
      yearLevel: "Year 8",
      description: "Understanding contact and non-contact forces",
      cards: [
        { id: 1, front: "What is a force?", back: "A push or pull that can change motion." },
        { id: 2, front: "What does gravity do?", back: "It pulls objects toward Earth." },
        { id: 3, front: "What is friction?", back: "A force that opposes movement between surfaces." },
        { id: 4, front: "Give an example of a push force.", back: "Pushing a shopping trolley." },
        { id: 5, front: "Give an example of a pull force.", back: "Pulling a door open." },
        { id: 6, front: "What are balanced forces?", back: "Equal forces in opposite directions, causing no change in motion." },
        { id: 7, front: "What are unbalanced forces?", back: "Forces that are not equal, causing acceleration or change in direction." },
        { id: 8, front: "How does force affect motion?", back: "A net force can start, stop, speed up, slow down, or change direction." }
      ]
    }
  };

  const state = {
    userSets: [],
    publicSets: [],
    progress: {},
    settings: { studentName: "", defaultMode: "study" },
    editingSetId: null,
    pendingImportSet: null,
    study: {
      activeSet: null,
      activeSource: "",
      cards: [],
      index: 0,
      flipped: false,
      mode: "study"
    }
  };

  const el = {
    navButtons: document.querySelectorAll(".nav-btn"),
    panels: document.querySelectorAll(".panel"),
    dashboardStats: document.getElementById("dashboardStats"),
    publicSetsList: document.getElementById("publicSetsList"),
    mySetsList: document.getElementById("mySetsList"),
    searchInput: document.getElementById("searchInput"),
    setForm: document.getElementById("setForm"),
    setTitle: document.getElementById("setTitle"),
    setSubject: document.getElementById("setSubject"),
    setYear: document.getElementById("setYear"),
    setDescription: document.getElementById("setDescription"),
    cardInputs: document.getElementById("cardInputs"),
    addCardBtn: document.getElementById("addCardBtn"),
    cancelEditBtn: document.getElementById("cancelEditBtn"),
    importFile: document.getElementById("importFile"),
    previewImportBtn: document.getElementById("previewImportBtn"),
    importPreview: document.getElementById("importPreview"),
    importPreviewContent: document.getElementById("importPreviewContent"),
    confirmImportBtn: document.getElementById("confirmImportBtn"),
    exportSelect: document.getElementById("exportSelect"),
    exportBtn: document.getElementById("exportBtn"),
    exportAllBtn: document.getElementById("exportAllBtn"),
    statisticsGrid: document.getElementById("statisticsGrid"),
    setProgressList: document.getElementById("setProgressList"),
    studentName: document.getElementById("studentName"),
    defaultMode: document.getElementById("defaultMode"),
    saveSettingsBtn: document.getElementById("saveSettingsBtn"),
    resetProgressBtn: document.getElementById("resetProgressBtn"),
    studyModal: document.getElementById("studyModal"),
    closeStudyBtn: document.getElementById("closeStudyBtn"),
    studyMode: document.getElementById("studyMode"),
    studyMeta: document.getElementById("studyMeta"),
    progressBar: document.getElementById("progressBar"),
    flashcardFace: document.getElementById("flashcardFace"),
    flipCardBtn: document.getElementById("flipCardBtn"),
    prevCardBtn: document.getElementById("prevCardBtn"),
    nextCardBtn: document.getElementById("nextCardBtn"),
    shuffleBtn: document.getElementById("shuffleBtn"),
    restartBtn: document.getElementById("restartBtn"),
    knownBtn: document.getElementById("knownBtn"),
    revisionBtn: document.getElementById("revisionBtn"),
    toast: document.getElementById("toast")
  };

  init();

  function init() {
    loadFromStorage();
    attachEvents();
    ensureCreateFormHasTwoCards();
    loadPublicSets().then(() => {
      renderAll();
    });
  }

  function attachEvents() {
    el.navButtons.forEach((btn) => {
      btn.addEventListener("click", () => switchSection(btn.dataset.section));
    });

    el.searchInput.addEventListener("input", renderMySets);
    el.addCardBtn.addEventListener("click", () => addCardInput());
    el.setForm.addEventListener("submit", onSaveSet);
    el.cancelEditBtn.addEventListener("click", cancelEdit);

    el.previewImportBtn.addEventListener("click", onPreviewImport);
    el.confirmImportBtn.addEventListener("click", onConfirmImport);

    el.exportBtn.addEventListener("click", onExportSelected);
    el.exportAllBtn.addEventListener("click", onExportAll);

    el.saveSettingsBtn.addEventListener("click", onSaveSettings);
    el.resetProgressBtn.addEventListener("click", onResetProgress);

    el.closeStudyBtn.addEventListener("click", closeStudyModal);
    el.studyMode.addEventListener("change", onStudyModeChanged);
    el.flipCardBtn.addEventListener("click", flipCard);
    el.prevCardBtn.addEventListener("click", () => moveCard(-1));
    el.nextCardBtn.addEventListener("click", () => moveCard(1));
    el.shuffleBtn.addEventListener("click", shuffleStudyCards);
    el.restartBtn.addEventListener("click", restartStudy);
    el.knownBtn.addEventListener("click", () => markCard("known"));
    el.revisionBtn.addEventListener("click", () => markCard("revision"));

    document.addEventListener("keydown", (event) => {
      if (!el.studyModal.classList.contains("hidden") && event.key === "Escape") {
        closeStudyModal();
      }
    });
  }

  async function loadPublicSets() {
    const loaded = [];

    for (const item of PUBLIC_MANIFEST) {
      const path = `PublicLibrary/${item.filename}`;
      let data = null;

      try {
        const response = await fetch(path, { cache: "no-store" });
        if (response.ok) {
          data = await response.json();
        }
      } catch (error) {
        data = null;
      }

      if (!data && PUBLIC_FALLBACK[item.filename]) {
        data = PUBLIC_FALLBACK[item.filename];
      }

      const validated = validateFlashcardSet(data, true);
      if (validated.valid) {
        loaded.push({
          ...validated.data,
          source: path,
          isPublic: true,
          internalId: `public_${item.filename}`
        });
      }
    }

    state.publicSets = loaded;
    if (loaded.length === 0) {
      showToast("No public library sets could be loaded.");
    }
  }

  function loadFromStorage() {
    state.userSets = readStorage(STORAGE_KEYS.sets, []);
    state.progress = readStorage(STORAGE_KEYS.progress, {});
    const storedSettings = readStorage(STORAGE_KEYS.settings, state.settings);
    state.settings = {
      studentName: safeText(storedSettings.studentName, 60),
      defaultMode: storedSettings.defaultMode === "review" ? "review" : "study"
    };
  }

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function saveStorage() {
    localStorage.setItem(STORAGE_KEYS.sets, JSON.stringify(state.userSets));
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(state.progress));
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  }

  function switchSection(id) {
    el.navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.section === id));
    el.panels.forEach((panel) => panel.classList.toggle("active", panel.id === id));
  }

  function ensureCreateFormHasTwoCards() {
    if (el.cardInputs.children.length === 0) {
      addCardInput();
      addCardInput();
    }
  }

  function addCardInput(card = { front: "", back: "" }) {
    const wrapper = document.createElement("div");
    wrapper.className = "card-input";

    const frontLabel = document.createElement("label");
    frontLabel.textContent = "Front";
    const frontInput = document.createElement("textarea");
    frontInput.maxLength = LIMITS.maxFrontLength;
    frontInput.required = true;
    frontInput.rows = 2;
    frontInput.value = card.front;

    const backLabel = document.createElement("label");
    backLabel.textContent = "Back";
    const backInput = document.createElement("textarea");
    backInput.maxLength = LIMITS.maxBackLength;
    backInput.required = true;
    backInput.rows = 3;
    backInput.value = card.back;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn secondary";
    removeBtn.textContent = "Remove Card";
    removeBtn.addEventListener("click", () => {
      if (el.cardInputs.children.length <= 1) {
        showToast("At least one card is required.");
        return;
      }
      wrapper.remove();
    });

    frontLabel.appendChild(frontInput);
    backLabel.appendChild(backInput);

    wrapper.appendChild(frontLabel);
    wrapper.appendChild(backLabel);
    wrapper.appendChild(removeBtn);
    el.cardInputs.appendChild(wrapper);
  }

  function onSaveSet(event) {
    event.preventDefault();

    if (state.userSets.length >= LIMITS.maxSets && state.editingSetId === null) {
      showToast("Set limit reached (100).");
      return;
    }

    const setPayload = {
      title: safeText(el.setTitle.value, LIMITS.maxTitleLength),
      subject: safeText(el.setSubject.value, LIMITS.maxSubjectLength),
      yearLevel: safeText(el.setYear.value, LIMITS.maxYearLevelLength),
      description: safeText(el.setDescription.value, LIMITS.maxDescriptionLength),
      cards: []
    };

    const cardInputs = Array.from(el.cardInputs.querySelectorAll(".card-input"));
    cardInputs.forEach((node, idx) => {
      const textareas = node.querySelectorAll("textarea");
      const front = safeText(textareas[0].value, LIMITS.maxFrontLength);
      const back = safeText(textareas[1].value, LIMITS.maxBackLength);
      if (front && back) {
        setPayload.cards.push({ id: idx + 1, front, back });
      }
    });

    const validated = validateFlashcardSet(setPayload, false);
    if (!validated.valid) {
      showToast(validated.error);
      return;
    }

    if (state.editingSetId !== null) {
      const target = state.userSets.find((set) => set.internalId === state.editingSetId);
      if (target) {
        target.title = validated.data.title;
        target.subject = validated.data.subject;
        target.yearLevel = validated.data.yearLevel;
        target.description = validated.data.description;
        target.cards = validated.data.cards;
      }
      showToast("Set updated.");
    } else {
      state.userSets.push({
        ...validated.data,
        internalId: createSetId(),
        isPublic: false
      });
      showToast("Set created.");
    }

    cancelEdit();
    saveStorage();
    renderAll();
    switchSection("myFlashcards");
  }

  function cancelEdit() {
    state.editingSetId = null;
    el.cancelEditBtn.classList.add("hidden");
    el.setForm.reset();
    el.cardInputs.textContent = "";
    ensureCreateFormHasTwoCards();
  }

  function renderAll() {
    renderDashboard();
    renderPublicSets();
    renderMySets();
    renderExportOptions();
    renderStatistics();
    renderSettings();
  }

  function renderDashboard() {
    const totalCards = state.userSets.reduce((sum, set) => sum + set.cards.length, 0);
    const allSets = state.userSets.length + state.publicSets.length;

    const stats = [
      { label: "My Sets", value: state.userSets.length },
      { label: "Public Sets", value: state.publicSets.length },
      { label: "My Cards", value: totalCards },
      { label: "Total Sets", value: allSets }
    ];

    el.dashboardStats.textContent = "";
    stats.forEach((s) => el.dashboardStats.appendChild(createStatCard(s.label, String(s.value))));
  }

  function renderPublicSets() {
    el.publicSetsList.textContent = "";

    state.publicSets.forEach((set) => {
      const item = buildSetCard(set);
      const controls = document.createElement("div");
      controls.className = "row wrap gap";

      const studyBtn = document.createElement("button");
      studyBtn.className = "btn";
      studyBtn.type = "button";
      studyBtn.textContent = "Study";
      studyBtn.addEventListener("click", () => openStudy(set, "public"));

      const readOnly = document.createElement("span");
      readOnly.className = "muted";
      readOnly.textContent = "Read-only public set";

      controls.appendChild(studyBtn);
      controls.appendChild(readOnly);
      item.appendChild(controls);
      el.publicSetsList.appendChild(item);
    });
  }

  function renderMySets() {
    el.mySetsList.textContent = "";
    const query = safeText(el.searchInput.value || "", 120).toLowerCase();

    const filtered = state.userSets.filter((set) => {
      if (!query) {
        return true;
      }
      const cardMatch = set.cards.some((card) => `${card.front} ${card.back}`.toLowerCase().includes(query));
      return `${set.title} ${set.subject} ${set.description}`.toLowerCase().includes(query) || cardMatch;
    });

    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No sets found.";
      el.mySetsList.appendChild(empty);
      return;
    }

    filtered.forEach((set) => {
      const item = buildSetCard(set);
      const controls = document.createElement("div");
      controls.className = "row wrap gap";

      const studyBtn = createControlBtn("Study", () => openStudy(set, "user"));
      const editBtn = createControlBtn("Edit", () => startEdit(set.internalId));
      const duplicateBtn = createControlBtn("Duplicate", () => duplicateSet(set.internalId));
      const deleteBtn = createControlBtn("Delete", () => deleteSet(set.internalId), "warn");

      controls.appendChild(studyBtn);
      controls.appendChild(editBtn);
      controls.appendChild(duplicateBtn);
      controls.appendChild(deleteBtn);

      item.appendChild(controls);
      el.mySetsList.appendChild(item);
    });
  }

  function buildSetCard(set) {
    const item = document.createElement("article");
    item.className = "list-item";

    const title = document.createElement("h3");
    title.className = "list-title";
    title.textContent = set.title;

    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = `${set.subject} | ${set.yearLevel} | ${set.cards.length} cards`;

    const desc = document.createElement("p");
    desc.textContent = set.description;

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(desc);
    return item;
  }

  function createControlBtn(label, onClick, kind = "secondary") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = kind === "warn" ? "btn warn" : "btn secondary";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function startEdit(setId) {
    const set = state.userSets.find((s) => s.internalId === setId);
    if (!set) {
      return;
    }

    state.editingSetId = setId;
    el.cancelEditBtn.classList.remove("hidden");

    el.setTitle.value = set.title;
    el.setSubject.value = set.subject;
    el.setYear.value = set.yearLevel;
    el.setDescription.value = set.description;

    el.cardInputs.textContent = "";
    set.cards.forEach((card) => addCardInput(card));

    switchSection("create");
    showToast("Editing set.");
  }

  function duplicateSet(setId) {
    if (state.userSets.length >= LIMITS.maxSets) {
      showToast("Set limit reached (100).");
      return;
    }

    const source = state.userSets.find((s) => s.internalId === setId);
    if (!source) {
      return;
    }

    const copy = {
      ...source,
      title: safeText(`${source.title} (Copy)`, LIMITS.maxTitleLength),
      cards: source.cards.map((card, idx) => ({ id: idx + 1, front: card.front, back: card.back })),
      internalId: createSetId(),
      isPublic: false
    };

    state.userSets.push(copy);
    saveStorage();
    renderAll();
    showToast("Set duplicated.");
  }

  function deleteSet(setId) {
    const source = state.userSets.find((s) => s.internalId === setId);
    if (!source) {
      return;
    }

    if (!window.confirm(`Delete set "${source.title}"?`)) {
      return;
    }

    state.userSets = state.userSets.filter((set) => set.internalId !== setId);
    delete state.progress[setId];
    saveStorage();
    renderAll();
    showToast("Set deleted.");
  }

  function onPreviewImport() {
    const file = el.importFile.files && el.importFile.files[0];
    if (!file) {
      showToast("Choose a JSON file first.");
      return;
    }

    const extOk = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
    if (!extOk) {
      showToast("Only .json files are allowed.");
      return;
    }

    if (file.size > LIMITS.maxImportSize) {
      showToast("File is too large. Maximum 1 MB.");
      return;
    }

    if (state.userSets.length >= LIMITS.maxSets) {
      showToast("Set limit reached (100). Delete a set before importing.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => showToast("Unable to read file.");
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch (error) {
        showToast("Invalid JSON file.");
        return;
      }

      const validated = validateFlashcardSet(parsed, false);
      if (!validated.valid) {
        showToast(validated.error);
        return;
      }

      validated.data.cards = validated.data.cards.map((card, idx) => ({
        id: idx + 1,
        front: card.front,
        back: card.back
      }));

      state.pendingImportSet = validated.data;
      renderImportPreview(validated.data);
      el.importPreview.classList.remove("hidden");
      showToast("Preview ready. Confirm to import.");
    };

    reader.readAsText(file);
  }

  function renderImportPreview(set) {
    el.importPreviewContent.textContent = "";

    const title = document.createElement("p");
    title.textContent = `Title: ${set.title}`;
    const meta = document.createElement("p");
    meta.textContent = `Subject: ${set.subject} | Year: ${set.yearLevel} | Cards: ${set.cards.length}`;

    const list = document.createElement("div");
    const previewCount = Math.min(5, set.cards.length);
    for (let i = 0; i < previewCount; i += 1) {
      const line = document.createElement("p");
      line.textContent = `${i + 1}. Q: ${set.cards[i].front} | A: ${set.cards[i].back}`;
      list.appendChild(line);
    }

    el.importPreviewContent.appendChild(title);
    el.importPreviewContent.appendChild(meta);
    el.importPreviewContent.appendChild(list);
  }

  function onConfirmImport() {
    if (!state.pendingImportSet) {
      showToast("No validated import to confirm.");
      return;
    }

    const ok = window.confirm("Import this flashcard set into My Flashcards?");
    if (!ok) {
      return;
    }

    if (state.userSets.length >= LIMITS.maxSets) {
      showToast("Set limit reached (100).");
      return;
    }

    state.userSets.push({
      ...state.pendingImportSet,
      internalId: createSetId(),
      isPublic: false
    });

    state.pendingImportSet = null;
    el.importPreview.classList.add("hidden");
    el.importPreviewContent.textContent = "";
    el.importFile.value = "";

    saveStorage();
    renderAll();
    switchSection("myFlashcards");
    showToast("Import complete.");
  }

  function onExportSelected() {
    const value = el.exportSelect.value;
    if (!value || value === "none") {
      showToast("Choose a set to export.");
      return;
    }

    const set = state.userSets.find((s) => s.internalId === value);
    if (!set) {
      showToast("Set not found.");
      return;
    }

    downloadJSON(cleanSetForExport(set), `${safeFilename(set.title)}.json`);
  }

  function onExportAll() {
    if (state.userSets.length === 0) {
      showToast("No user sets to export.");
      return;
    }

    const all = state.userSets.map((set) => cleanSetForExport(set));
    downloadJSON(all, "my-flashcards-export.json");
  }

  function cleanSetForExport(set) {
    return {
      title: set.title,
      subject: set.subject,
      yearLevel: set.yearLevel,
      description: set.description,
      cards: set.cards.map((c, i) => ({
        id: i + 1,
        front: c.front,
        back: c.back
      }))
    };
  }

  function downloadJSON(payload, filename) {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    URL.revokeObjectURL(url);
    showToast("Export complete.");
  }

  function renderExportOptions() {
    el.exportSelect.textContent = "";

    const placeholder = document.createElement("option");
    placeholder.value = "none";
    placeholder.textContent = state.userSets.length ? "Select a set" : "No sets available";
    el.exportSelect.appendChild(placeholder);

    state.userSets.forEach((set) => {
      const opt = document.createElement("option");
      opt.value = set.internalId;
      opt.textContent = set.title;
      el.exportSelect.appendChild(opt);
    });
  }

  function openStudy(set, source) {
    state.study.activeSet = set;
    state.study.activeSource = source;
    state.study.mode = state.settings.defaultMode === "review" ? "review" : "study";
    el.studyMode.value = state.study.mode;

    prepareStudyCards();
    el.studyModal.classList.remove("hidden");
    renderStudyCard();
  }

  function prepareStudyCards() {
    if (!state.study.activeSet) {
      return;
    }

    const baseCards = state.study.activeSet.cards.map((card) => ({ ...card }));
    if (state.study.mode === "review" && state.study.activeSource === "user") {
      const progress = getSetProgress(state.study.activeSet.internalId);
      const revisionSet = new Set(progress.revisionIds);
      state.study.cards = baseCards.filter((card) => revisionSet.has(card.id));
    } else {
      state.study.cards = baseCards;
    }

    if (state.study.cards.length === 0) {
      state.study.cards = baseCards;
    }

    state.study.index = 0;
    state.study.flipped = false;
  }

  function renderStudyCard() {
    const cards = state.study.cards;
    if (!cards.length) {
      el.flashcardFace.textContent = "No cards in this set.";
      el.studyMeta.textContent = "0/0";
      updateProgressBar();
      return;
    }

    const card = cards[state.study.index];
    const total = cards.length;

    const faceText = state.study.flipped ? card.back : card.front;
    el.flashcardFace.textContent = faceText;
    el.flashcardFace.classList.toggle("flipped", state.study.flipped);

    const modeLabel = state.study.mode === "review" ? "Review mode" : "Study mode";
    el.studyMeta.textContent = `${state.study.activeSet.title} | ${modeLabel} | Card ${state.study.index + 1}/${total}`;

    updateProgressBar();
  }

  function onStudyModeChanged() {
    state.study.mode = el.studyMode.value === "review" ? "review" : "study";
    prepareStudyCards();
    renderStudyCard();
  }

  function flipCard() {
    state.study.flipped = !state.study.flipped;
    renderStudyCard();
  }

  function moveCard(offset) {
    if (!state.study.cards.length) {
      return;
    }

    const total = state.study.cards.length;
    state.study.index = (state.study.index + offset + total) % total;
    state.study.flipped = false;
    renderStudyCard();
  }

  function shuffleStudyCards() {
    shuffle(state.study.cards);
    state.study.index = 0;
    state.study.flipped = false;
    renderStudyCard();
    showToast("Cards shuffled.");
  }

  function restartStudy() {
    prepareStudyCards();
    renderStudyCard();
    showToast("Study session restarted.");
  }

  function markCard(type) {
    if (state.study.activeSource !== "user") {
      showToast("Progress tracking is available for your own sets.");
      return;
    }

    if (!state.study.cards.length || !state.study.activeSet) {
      return;
    }

    const card = state.study.cards[state.study.index];
    const setId = state.study.activeSet.internalId;
    const progress = getSetProgress(setId);

    const known = new Set(progress.knownIds);
    const revision = new Set(progress.revisionIds);

    if (type === "known") {
      known.add(card.id);
      revision.delete(card.id);
    } else {
      revision.add(card.id);
      known.delete(card.id);
    }

    state.progress[setId] = {
      knownIds: Array.from(known),
      revisionIds: Array.from(revision)
    };

    saveStorage();
    renderStatistics();
    showToast(type === "known" ? "Marked as known." : "Marked for revision.");
  }

  function updateProgressBar() {
    const total = state.study.cards.length;
    if (total === 0) {
      el.progressBar.style.width = "0%";
      return;
    }
    const progress = ((state.study.index + 1) / total) * 100;
    el.progressBar.style.width = `${progress}%`;
  }

  function closeStudyModal() {
    el.studyModal.classList.add("hidden");
  }

  function renderStatistics() {
    const totalSets = state.userSets.length;
    const totalCards = state.userSets.reduce((sum, set) => sum + set.cards.length, 0);

    let knownCount = 0;
    let revisionCount = 0;

    Object.keys(state.progress).forEach((setId) => {
      const p = state.progress[setId];
      knownCount += p.knownIds.length;
      revisionCount += p.revisionIds.length;
    });

    const overallProgress = totalCards === 0 ? 0 : Math.round((knownCount / totalCards) * 100);

    const stats = [
      { label: "My Sets", value: String(totalSets) },
      { label: "My Cards", value: String(totalCards) },
      { label: "Known", value: String(knownCount) },
      { label: "Overall Progress", value: `${overallProgress}%` }
    ];

    el.statisticsGrid.textContent = "";
    stats.forEach((s) => el.statisticsGrid.appendChild(createStatCard(s.label, s.value)));

    el.setProgressList.textContent = "";
    state.userSets.forEach((set) => {
      const progress = getSetProgress(set.internalId);
      const known = progress.knownIds.length;
      const revision = progress.revisionIds.length;
      const percent = set.cards.length ? Math.round((known / set.cards.length) * 100) : 0;

      const line = document.createElement("p");
      line.textContent = `${set.title}: ${percent}% known (${known}/${set.cards.length}), needs revision: ${revision}`;
      el.setProgressList.appendChild(line);
    });
  }

  function createStatCard(label, value) {
    const card = document.createElement("div");
    card.className = "card stat-card";

    const valueEl = document.createElement("span");
    valueEl.className = "stat-value";
    valueEl.textContent = value;

    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    card.appendChild(valueEl);
    card.appendChild(labelEl);
    return card;
  }

  function renderSettings() {
    el.studentName.value = state.settings.studentName;
    el.defaultMode.value = state.settings.defaultMode;
  }

  function onSaveSettings() {
    state.settings.studentName = safeText(el.studentName.value, 60);
    state.settings.defaultMode = el.defaultMode.value === "review" ? "review" : "study";
    saveStorage();
    showToast("Settings saved.");
  }

  function onResetProgress() {
    const confirmed = window.confirm("Reset all study progress for your sets?");
    if (!confirmed) {
      return;
    }

    state.progress = {};
    saveStorage();
    renderStatistics();
    showToast("Progress reset.");
  }

  function getSetProgress(setId) {
    if (!state.progress[setId]) {
      state.progress[setId] = { knownIds: [], revisionIds: [] };
    }
    return state.progress[setId];
  }

  function validateFlashcardSet(candidate, isPublic) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return { valid: false, error: "Set format must be a JSON object." };
    }

    const title = safeText(candidate.title, LIMITS.maxTitleLength);
    const subject = safeText(candidate.subject, LIMITS.maxSubjectLength);
    const yearLevel = safeText(candidate.yearLevel, LIMITS.maxYearLevelLength);
    const description = safeText(candidate.description, LIMITS.maxDescriptionLength);

    if (!title || !subject || !yearLevel || !description) {
      return { valid: false, error: "Set must include title, subject, year level, and description." };
    }

    if (!Array.isArray(candidate.cards)) {
      return { valid: false, error: "Set must include a cards array." };
    }

    if (candidate.cards.length === 0) {
      return { valid: false, error: "Set must include at least one card." };
    }

    if (candidate.cards.length > LIMITS.maxCardsPerSet) {
      return { valid: false, error: "Too many cards. Maximum is 200." };
    }

    const usedIds = new Set();
    const cards = [];

    for (let i = 0; i < candidate.cards.length; i += 1) {
      const rawCard = candidate.cards[i];
      if (!rawCard || typeof rawCard !== "object" || Array.isArray(rawCard)) {
        return { valid: false, error: `Card ${i + 1} is invalid.` };
      }

      const front = safeText(rawCard.front, LIMITS.maxFrontLength);
      const back = safeText(rawCard.back, LIMITS.maxBackLength);

      if (!front || !back) {
        return { valid: false, error: `Card ${i + 1} must include front and back text.` };
      }

      let id = Number(rawCard.id);
      if (!Number.isFinite(id) || id < 1 || usedIds.has(id)) {
        id = i + 1;
      }
      while (usedIds.has(id)) {
        id += 1;
      }
      usedIds.add(id);

      cards.push({ id, front, back });
    }

    const validated = {
      title,
      subject,
      yearLevel,
      description,
      cards
    };

    if (isPublic) {
      return { valid: true, data: validated };
    }

    return { valid: true, data: validated };
  }

  function safeText(value, maxLen) {
    const raw = typeof value === "string" ? value : String(value || "");
    const withoutTags = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return withoutTags.slice(0, maxLen);
  }

  function safeFilename(name) {
    const cleaned = safeText(name, 80)
      .toLowerCase()
      .replace(/[^a-z0-9-_\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return cleaned || "flashcards";
  }

  function createSetId() {
    return `set_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.remove("hidden");
    window.clearTimeout(showToast.timerId);
    showToast.timerId = window.setTimeout(() => {
      el.toast.classList.add("hidden");
    }, 2400);
  }
})();
