(() => {
  "use strict";

  // Resolve asset URLs from the script location so subpath hosting works
  // even when the app is visited without a trailing slash.
  const APP_BASE_URL = new URL(".", document.currentScript?.src || window.location.href);

  const STORAGE_KEYS = {
    sets: "edgeducate_flashcards_sets",
    progress: "edgeducate_flashcards_progress",
    settings: "edgeducate_flashcards_settings"
  };

  const LIMITS = {
    maxImportSize: 15 * 1024 * 1024,
    maxSets: 100,
    maxCardsPerSet: 200,
    maxImageFileSize: 5 * 1024 * 1024,
    maxImageDataUrlLength: 1300000,
    maxImageDimension: 1600,
    maxPackLength: 80,
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
    pendingImportSets: [],
    pendingImportMeta: { progress: {}, settings: null },
    pendingImportFileName: "",
    lastImportedFileName: "",
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
    dashboardImportNotice: document.getElementById("dashboardImportNotice"),
    publicSetsList: document.getElementById("publicSetsList"),
    mySetsList: document.getElementById("mySetsList"),
    myCreateBtn: document.getElementById("myCreateBtn"),
    myImportBtn: document.getElementById("myImportBtn"),
    myExportBtn: document.getElementById("myExportBtn"),
    searchInput: document.getElementById("searchInput"),
    packFilter: document.getElementById("packFilter"),
    setForm: document.getElementById("setForm"),
    setTitle: document.getElementById("setTitle"),
    setPack: document.getElementById("setPack"),
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
    openImportModalBtn: document.getElementById("openImportModalBtn"),
    openImportFromExportBtn: document.getElementById("openImportFromExportBtn"),
    importModal: document.getElementById("importModal"),
    closeImportBtn: document.getElementById("closeImportBtn"),
    exportSelect: document.getElementById("exportSelect"),
    exportBtn: document.getElementById("exportBtn"),
    exportAllBtn: document.getElementById("exportAllBtn"),
    clearLibraryBtn: document.getElementById("clearLibraryBtn"),
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
    printCurrentBtn: document.getElementById("printCurrentBtn"),
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
      btn.addEventListener("click", () => {
        if (btn.dataset.section === "import") {
          openImportModal();
          return;
        }
        switchSection(btn.dataset.section);
      });
    });

    el.dashboardStats.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const card = target.closest("[data-go]");
      if (!(card instanceof HTMLElement)) {
        return;
      }
      const section = card.dataset.go;
      if (section) {
        switchSection(section);
      }
    });

    el.searchInput.addEventListener("input", renderMySets);
    el.packFilter.addEventListener("change", renderMySets);
    if (el.myCreateBtn) {
      el.myCreateBtn.addEventListener("click", () => switchSection("create"));
    }
    if (el.myImportBtn) {
      el.myImportBtn.addEventListener("click", () => openImportModal());
    }
    if (el.myExportBtn) {
      el.myExportBtn.addEventListener("click", () => switchSection("export"));
    }
    el.addCardBtn.addEventListener("click", () => addCardInput());
    el.setForm.addEventListener("submit", onSaveSet);
    el.cancelEditBtn.addEventListener("click", cancelEdit);

    el.previewImportBtn.addEventListener("click", onPreviewImport);
    el.confirmImportBtn.addEventListener("click", onConfirmImport);
    el.openImportModalBtn.addEventListener("click", openImportModal);
    if (el.openImportFromExportBtn) {
      el.openImportFromExportBtn.addEventListener("click", openImportModal);
    }
    el.closeImportBtn.addEventListener("click", closeImportModal);

    if (el.exportBtn) {
      el.exportBtn.addEventListener("click", onExportSelected);
    }
    el.exportAllBtn.addEventListener("click", onExportAll);
    if (el.clearLibraryBtn) {
      el.clearLibraryBtn.addEventListener("click", onClearLibrary);
    }

    el.saveSettingsBtn.addEventListener("click", onSaveSettings);
    el.resetProgressBtn.addEventListener("click", onResetProgress);

    el.closeStudyBtn.addEventListener("click", closeStudyModal);
    el.studyMode.addEventListener("change", onStudyModeChanged);
    el.flipCardBtn.addEventListener("click", flipCard);
    el.prevCardBtn.addEventListener("click", () => moveCard(-1));
    el.nextCardBtn.addEventListener("click", () => moveCard(1));
    el.shuffleBtn.addEventListener("click", shuffleStudyCards);
    el.restartBtn.addEventListener("click", restartStudy);
    el.printCurrentBtn.addEventListener("click", () => {
      if (state.study.activeSet) {
        printDeck(state.study.activeSet, "standard");
      }
    });
    el.knownBtn.addEventListener("click", () => markCard("known"));
    el.revisionBtn.addEventListener("click", () => markCard("revision"));

    document.addEventListener("keydown", (event) => {
      if (!el.studyModal.classList.contains("hidden") && event.key === "Escape") {
        closeStudyModal();
      }

      if (!el.studyModal.classList.contains("hidden")) {
        const target = event.target;
        const isTypingTarget =
          target instanceof HTMLElement &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable);

        if (!isTypingTarget) {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveCard(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveCard(1);
          } else if (event.code === "Space" || event.key === " ") {
            event.preventDefault();
            flipCard();
          }
        }
      }

      if (!el.importModal.classList.contains("hidden") && event.key === "Escape") {
        closeImportModal();
      }
    });
  }

  async function loadPublicSets() {
    const loaded = [];

    for (const item of PUBLIC_MANIFEST) {
      const path = new URL(`PublicLibrary/${item.filename}`, APP_BASE_URL).toString();
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

      const validated = validateFlashcardSet(data, { isPublic: true, defaultPack: item.title.includes("Fractions") || item.title.includes("Algebra") ? "Mathematics Pack" : "Science Pack" });
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
    const storedSets = readStorage(STORAGE_KEYS.sets, []);
    state.userSets = Array.isArray(storedSets)
      ? storedSets
          .map((set) => {
            const validated = validateFlashcardSet(set, { isPublic: false, defaultPack: "General Pack" });
            if (!validated.valid) {
              return null;
            }
            return {
              ...validated.data,
              internalId: typeof set.internalId === "string" ? set.internalId : createSetId(),
              isPublic: false
            };
          })
          .filter(Boolean)
      : [];
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
    if (id === "import") {
      openImportModal();
      return;
    }
    el.navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.section === id));
    el.panels.forEach((panel) => panel.classList.toggle("active", panel.id === id));
  }

  function openImportModal() {
    el.importModal.classList.remove("hidden");
  }

  function closeImportModal() {
    el.importModal.classList.add("hidden");
  }

  function ensureCreateFormHasTwoCards() {
    if (el.cardInputs.children.length === 0) {
      addCardInput();
      addCardInput();
    }
  }

  function addCardInput(card = { front: "", back: "", frontImage: "", backImage: "" }) {
    const wrapper = document.createElement("div");
    wrapper.className = "card-input";

    const grid = document.createElement("div");
    grid.className = "designer-grid";

    const frontFace = createDesignerFace({
      face: "front",
      label: "Front of Card",
      text: card.front,
      image: card.frontImage,
      maxLength: LIMITS.maxFrontLength
    });

    const backFace = createDesignerFace({
      face: "back",
      label: "Back of Card",
      text: card.back,
      image: card.backImage,
      maxLength: LIMITS.maxBackLength
    });

    grid.appendChild(frontFace);
    grid.appendChild(backFace);

    const tip = document.createElement("p");
    tip.className = "designer-tip";
    tip.textContent = "Type directly on each face. Keep questions clear and answers concise.";

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

    wrapper.appendChild(grid);
    wrapper.appendChild(tip);
    wrapper.appendChild(removeBtn);
    el.cardInputs.appendChild(wrapper);
  }

  function createDesignerFace(config) {
    const face = document.createElement("div");
    face.className = "designer-face";

    const label = document.createElement("span");
    label.className = "designer-label";
    label.textContent = config.label;

    const editor = document.createElement("div");
    editor.className = "designer-edit";
    editor.contentEditable = "true";
    editor.setAttribute("role", "textbox");
    editor.setAttribute("aria-label", `${config.label} text`);
    editor.setAttribute("data-face", config.face);
    editor.textContent = safeCardText(config.text, config.maxLength);
    editor.addEventListener("input", () => {
      const text = safeCardText(editor.textContent || "", config.maxLength);
      if (editor.textContent !== text) {
        editor.textContent = text;
        placeCaretAtEnd(editor);
      }
    });

    const attachRow = document.createElement("div");
    attachRow.className = "designer-attach-row";

    const inputLabel = document.createElement("label");
    inputLabel.className = "btn secondary small attach-btn";
    inputLabel.textContent = "Attach Image";

    const imageInput = document.createElement("input");
    imageInput.type = "file";
    imageInput.accept = "image/png,image/jpeg";
    imageInput.className = "hidden";

    const clearImageBtn = document.createElement("button");
    clearImageBtn.type = "button";
    clearImageBtn.className = "btn secondary small";
    clearImageBtn.textContent = "Remove Image";

    const fileName = document.createElement("span");
    fileName.className = "designer-file-name";
    fileName.textContent = "No image attached";

    const preview = document.createElement("img");
    preview.className = "designer-image-preview hidden";
    preview.alt = `${config.label} image preview`;

    const initialImage = sanitizeImageDataUrl(config.image);
    if (initialImage) {
      editor.dataset.imageData = initialImage;
      preview.src = initialImage;
      preview.classList.remove("hidden");
      fileName.textContent = "Image attached";
    }

    imageInput.addEventListener("change", async () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        return;
      }

      const isAllowed = file.type === "image/png" || file.type === "image/jpeg";
      if (!isAllowed) {
        showToast("Only PNG and JPEG images are supported.");
        imageInput.value = "";
        return;
      }

      if (file.size > LIMITS.maxImageFileSize) {
        showToast("Image too large. Max 5 MB per image before optimization.");
        imageInput.value = "";
        return;
      }

      try {
        const optimizedData = await optimizeImageForStorage(file);
        if (!optimizedData) {
          showToast("Unable to optimize image. Try a smaller image.");
          imageInput.value = "";
          return;
        }
        editor.dataset.imageData = optimizedData;
        preview.src = optimizedData;
        preview.classList.remove("hidden");
        fileName.textContent = `${file.name} (optimized)`;
      } catch (error) {
        showToast("Unable to process image.");
        imageInput.value = "";
      }
    });

    clearImageBtn.addEventListener("click", () => {
      delete editor.dataset.imageData;
      preview.src = "";
      preview.classList.add("hidden");
      fileName.textContent = "No image attached";
      imageInput.value = "";
    });

    inputLabel.appendChild(imageInput);
    attachRow.appendChild(inputLabel);
    attachRow.appendChild(clearImageBtn);
    attachRow.appendChild(fileName);

    face.appendChild(label);
    face.appendChild(editor);
    face.appendChild(attachRow);
    face.appendChild(preview);
    return face;
  }

  function onSaveSet(event) {
    event.preventDefault();

    if (state.userSets.length >= LIMITS.maxSets && state.editingSetId === null) {
      showToast("Set limit reached (100).");
      return;
    }

    const setPayload = {
      title: safeText(el.setTitle.value, LIMITS.maxTitleLength),
      pack: safeText(el.setPack.value, LIMITS.maxPackLength),
      subject: safeText(el.setSubject.value, LIMITS.maxSubjectLength),
      yearLevel: safeText(el.setYear.value, LIMITS.maxYearLevelLength),
      description: safeText(el.setDescription.value, LIMITS.maxDescriptionLength),
      cards: []
    };

    const cardInputs = Array.from(el.cardInputs.querySelectorAll(".card-input"));
    cardInputs.forEach((node, idx) => {
      const frontEditor = node.querySelector('[data-face="front"]');
      const backEditor = node.querySelector('[data-face="back"]');
      const front = safeCardText(frontEditor ? frontEditor.textContent : "", LIMITS.maxFrontLength);
      const back = safeCardText(backEditor ? backEditor.textContent : "", LIMITS.maxBackLength);
      const frontImage = sanitizeImageDataUrl(frontEditor && frontEditor.dataset ? frontEditor.dataset.imageData : "");
      const backImage = sanitizeImageDataUrl(backEditor && backEditor.dataset ? backEditor.dataset.imageData : "");
      if (front && back) {
        const card = { id: idx + 1, front, back };
        if (frontImage) {
          card.frontImage = frontImage;
        }
        if (backImage) {
          card.backImage = backImage;
        }
        setPayload.cards.push(card);
      }
    });

    const validated = validateFlashcardSet(setPayload, { isPublic: false, defaultPack: "General Pack" });
    if (!validated.valid) {
      showToast(validated.error);
      return;
    }

    if (state.editingSetId !== null) {
      const target = state.userSets.find((set) => set.internalId === state.editingSetId);
      if (target) {
        target.title = validated.data.title;
        target.pack = validated.data.pack;
        target.subject = validated.data.subject;
        target.yearLevel = validated.data.yearLevel;
        target.description = validated.data.description;
        target.cards = validated.data.cards;
      }
      showToast("Deck updated.");
    } else {
      state.userSets.push({
        ...validated.data,
        internalId: createSetId(),
        isPublic: false
      });
      showToast("Deck created.");
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
    renderPackFilter();
    renderMySets();
    renderExportOptions();
    renderStatistics();
    renderSettings();
  }

  function renderDashboard() {
    if (el.dashboardImportNotice) {
      if (state.lastImportedFileName) {
        el.dashboardImportNotice.textContent = `${state.lastImportedFileName} has been uploaded.`;
        el.dashboardImportNotice.classList.remove("hidden");
      } else {
        el.dashboardImportNotice.textContent = "";
        el.dashboardImportNotice.classList.add("hidden");
      }
    }

    const packs = new Set(state.userSets.map((set) => set.pack));

    const stats = [
      { label: "Categories", value: packs.size, go: "myFlashcards" },
      { label: "My Decks", value: state.userSets.length, go: "myFlashcards" },
      { label: "Import Flashcards", value: "Open", go: "import" }
    ];

    el.dashboardStats.textContent = "";
    stats.forEach((s) => el.dashboardStats.appendChild(createStatCard(s.label, String(s.value), s.go)));
  }

  function renderPublicSets() {
    el.publicSetsList.textContent = "";

    const grouped = groupByPack(state.publicSets);
    Object.keys(grouped).sort().forEach((packName) => {
      const groupWrap = createPackGroup(packName);
      grouped[packName].forEach((set) => {
        const item = buildSetCard(set);
        const controls = document.createElement("div");
        controls.className = "row wrap gap";

        const studyBtn = document.createElement("button");
        studyBtn.className = "btn";
        studyBtn.type = "button";
        studyBtn.textContent = "Study Deck";
        studyBtn.addEventListener("click", () => openStudy(set, "public"));

        const readOnly = document.createElement("span");
        readOnly.className = "muted";
        readOnly.textContent = "Read-only public deck";

        controls.appendChild(studyBtn);
        controls.appendChild(readOnly);
        item.appendChild(controls);
        groupWrap.appendChild(item);
      });
      el.publicSetsList.appendChild(groupWrap);
    });
  }

  function renderMySets() {
    el.mySetsList.textContent = "";
    const query = safeText(el.searchInput.value || "", 120).toLowerCase();
    const selectedPack = el.packFilter.value || "all";

    const filtered = state.userSets.filter((set) => {
      if (selectedPack !== "all" && set.pack !== selectedPack) {
        return false;
      }
      if (!query) {
        return true;
      }
      const cardMatch = set.cards.some((card) => `${card.front} ${card.back}`.toLowerCase().includes(query));
      return `${set.title} ${set.pack} ${set.subject} ${set.description}`.toLowerCase().includes(query) || cardMatch;
    });

    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No decks found.";
      el.mySetsList.appendChild(empty);
      return;
    }

    const grouped = groupByPack(filtered);
    Object.keys(grouped).sort().forEach((packName) => {
      const groupWrap = createPackGroup(packName);
      grouped[packName].forEach((set) => {
        const item = buildSetCard(set);
        item.classList.add("clickable-deck");
        item.tabIndex = 0;
        item.setAttribute("role", "button");
        item.setAttribute("aria-label", `Open study popup for ${set.title}`);
        item.addEventListener("click", () => openStudy(set, "user"));
        item.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openStudy(set, "user");
          }
        });

        const controls = document.createElement("div");
        controls.className = "row wrap gap";
        controls.addEventListener("click", (event) => event.stopPropagation());
        controls.addEventListener("keydown", (event) => event.stopPropagation());

        const studyBtn = createControlBtn("Study Deck", () => openStudy(set, "user"));
        const printBtn = createControlBtn("Print Cards", () => printDeck(set, "standard"));
        const editBtn = createControlBtn("Edit", () => startEdit(set.internalId));
        const duplicateBtn = createControlBtn("Duplicate", () => duplicateSet(set.internalId));
        const deleteBtn = createControlBtn("Delete", () => deleteSet(set.internalId), "warn");

        controls.appendChild(studyBtn);
        controls.appendChild(printBtn);
        controls.appendChild(editBtn);
        controls.appendChild(duplicateBtn);
        controls.appendChild(deleteBtn);

        item.appendChild(controls);
        groupWrap.appendChild(item);
      });
      el.mySetsList.appendChild(groupWrap);
    });
  }

  function renderPackFilter() {
    const current = el.packFilter.value || "all";
    const packs = Array.from(new Set(state.userSets.map((s) => s.pack))).sort();
    el.packFilter.textContent = "";

    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All Categories";
    el.packFilter.appendChild(allOpt);

    packs.forEach((packName) => {
      const opt = document.createElement("option");
      opt.value = packName;
      opt.textContent = packName;
      el.packFilter.appendChild(opt);
    });

    el.packFilter.value = packs.includes(current) ? current : "all";
  }

  function createPackGroup(packName) {
    const group = document.createElement("section");
    group.className = "pack-group";

    const title = document.createElement("h3");
    title.className = "pack-title";
    title.textContent = packName;

    group.appendChild(title);
    return group;
  }

  function buildSetCard(set) {
    const item = document.createElement("article");
    item.className = "list-item";

    const title = document.createElement("h3");
    title.className = "list-title";
    title.textContent = set.title;

    const meta = document.createElement("p");
    meta.className = "muted";
    const subjectText = set.subject || "No subject";
    const yearText = set.yearLevel || "No year level";
    meta.textContent = `${subjectText} | ${yearText} | ${set.cards.length} cards`;

    const desc = document.createElement("p");
    desc.textContent = set.description || "No description.";

    const packPill = document.createElement("span");
    packPill.className = "pill";
    packPill.textContent = `Category: ${set.pack}`;

    item.appendChild(title);
    item.appendChild(packPill);
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
    el.setPack.value = set.pack;
    el.setSubject.value = set.subject;
    el.setYear.value = set.yearLevel;
    el.setDescription.value = set.description;

    el.cardInputs.textContent = "";
    set.cards.forEach((card) => addCardInput(card));

    switchSection("create");
    showToast("Editing deck.");
  }

  function duplicateSet(setId) {
    if (state.userSets.length >= LIMITS.maxSets) {
      showToast("Deck limit reached (100).");
      return;
    }

    const source = state.userSets.find((s) => s.internalId === setId);
    if (!source) {
      return;
    }

    const copy = {
      ...source,
      title: safeText(`${source.title} (Copy)`, LIMITS.maxTitleLength),
      pack: source.pack,
      cards: source.cards.map((card, idx) => {
        const next = { id: idx + 1, front: card.front, back: card.back };
        if (card.frontImage) {
          next.frontImage = card.frontImage;
        }
        if (card.backImage) {
          next.backImage = card.backImage;
        }
        return next;
      }),
      internalId: createSetId(),
      isPublic: false
    };

    state.userSets.push(copy);
    saveStorage();
    renderAll();
    showToast("Deck duplicated.");
  }

  function deleteSet(setId) {
    const source = state.userSets.find((s) => s.internalId === setId);
    if (!source) {
      return;
    }

    if (!window.confirm(`Delete deck "${source.title}"?`)) {
      return;
    }

    state.userSets = state.userSets.filter((set) => set.internalId !== setId);
    delete state.progress[setId];
    saveStorage();
    renderAll();
    showToast("Deck deleted.");
  }

  function onPreviewImport() {
    const file = el.importFile.files && el.importFile.files[0];
    if (!file) {
      showToast("Choose a backup file first.");
      return;
    }
    const ok = window.confirm(
      `Import ${state.pendingImportSets.length} deck(s) and overwrite your current library, progress, and settings?`
    );
    const lowerName = file.name.toLowerCase();
    const extOk = lowerName.endsWith(".edgefc") || lowerName.endsWith(".json") || file.type === "application/json";
    if (!extOk) {

    // Overwrite current user data with imported library snapshot.
    state.userSets = [];
    state.progress = {};
    state.settings = { studentName: "", defaultMode: "study" };
      showToast("File is too large. Maximum 15 MB.");
      return;
    }

    if (state.userSets.length >= LIMITS.maxSets) {
      showToast("Deck limit reached (100). Delete a deck before importing.");
      return;
    }

    state.pendingImportFileName = safeText(file.name, 120);

    const reader = new FileReader();
    reader.onerror = () => showToast("Unable to read file.");
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch (error) {
        showToast("Invalid backup file.");
        return;
      }

      const extracted = extractImportDecks(parsed);
      if (!extracted.valid) {
        showToast(extracted.error);
        return;
      }

      if (state.userSets.length + extracted.decks.length > LIMITS.maxSets) {
        showToast("Import would exceed the 100 deck limit.");
        return;
      }

      state.pendingImportSets = extracted.decks;
      state.pendingImportMeta = {
        progress: extracted.progress || {},
        settings: extracted.settings || null
      };
      renderImportPreview(extracted.decks, state.pendingImportMeta);
      el.importPreview.classList.remove("hidden");
      showToast("Preview ready. Confirm to import.");
    };

    reader.readAsText(file);
  }

  function renderImportPreview(sets, importMeta = { progress: {}, settings: null }) {
    el.importPreviewContent.textContent = "";

    const totalCards = sets.reduce((sum, set) => sum + set.cards.length, 0);
    const title = document.createElement("p");
    title.textContent = `Decks found: ${sets.length}`;
    const totalsLine = document.createElement("p");
    totalsLine.textContent = `Total flashcards: ${totalCards}`;

    const progressDecks = Object.keys(importMeta.progress || {}).length;
    const hasSettings = !!importMeta.settings;
    const extras = document.createElement("p");
    extras.textContent = `Includes progress: ${progressDecks > 0 ? "Yes" : "No"} | Includes settings: ${hasSettings ? "Yes" : "No"}`;

    const list = document.createElement("div");
    const previewCount = Math.min(5, sets.length);
    for (let i = 0; i < previewCount; i += 1) {
      const line = document.createElement("p");
      line.textContent = `${i + 1}. ${sets[i].pack} / ${sets[i].title} (${sets[i].cards.length} cards)`;
      list.appendChild(line);
    }

    el.importPreviewContent.appendChild(title);
    el.importPreviewContent.appendChild(totalsLine);
    el.importPreviewContent.appendChild(extras);
    el.importPreviewContent.appendChild(list);
  }

  function onConfirmImport() {
    if (!state.pendingImportSets.length) {
      showToast("No validated import to confirm.");
      return;
    }

    const proceed = window.confirm(`Import ${state.pendingImportSets.length} deck(s) now?`);
    if (!proceed) {
      return;
    }

    const replaceExisting = window.confirm(
      "Import mode:\nPress OK to REPLACE your current library.\nPress Cancel to ADD imported decks to your current library."
    );

    if (!replaceExisting && state.userSets.length + state.pendingImportSets.length > LIMITS.maxSets) {
      showToast("Deck limit reached (100).");
      return;
    }

    if (replaceExisting) {
      state.userSets = [];
      state.progress = {};
      state.settings = { studentName: "", defaultMode: "study" };
    }

    const idMap = {};
    state.pendingImportSets.forEach((set) => {
      const newInternalId = createSetId();
      if (set.internalId) {
        idMap[set.internalId] = newInternalId;
      }
      state.userSets.push({
        ...set,
        internalId: newInternalId,
        isPublic: false
      });
    });

    const importedProgress = state.pendingImportMeta && state.pendingImportMeta.progress ? state.pendingImportMeta.progress : {};
    Object.keys(importedProgress).forEach((oldSetId) => {
      const mappedId = idMap[oldSetId];
      if (!mappedId) {
        return;
      }

      const targetSet = state.userSets.find((set) => set.internalId === mappedId);
      if (!targetSet) {
        return;
      }

      const maxCardId = targetSet.cards.length;
      const raw = importedProgress[oldSetId] || {};
      const revision = new Set((Array.isArray(raw.revisionIds) ? raw.revisionIds : []).filter((id) => Number.isInteger(id) && id >= 1 && id <= maxCardId));
      const known = new Set((Array.isArray(raw.knownIds) ? raw.knownIds : []).filter((id) => Number.isInteger(id) && id >= 1 && id <= maxCardId && !revision.has(id)));

      state.progress[mappedId] = {
        knownIds: Array.from(known),
        revisionIds: Array.from(revision)
      };
    });

    const importedSettings = state.pendingImportMeta && state.pendingImportMeta.settings ? state.pendingImportMeta.settings : null;
    if (replaceExisting && importedSettings && typeof importedSettings === "object") {
      state.settings.studentName = safeText(importedSettings.studentName, 60);
      state.settings.defaultMode = importedSettings.defaultMode === "review" ? "review" : "study";
    }

    state.pendingImportSets = [];
    state.pendingImportMeta = { progress: {}, settings: null };
    state.lastImportedFileName = state.pendingImportFileName || "Library file";
    state.pendingImportFileName = "";
    el.importPreview.classList.add("hidden");
    el.importPreviewContent.textContent = "";
    el.importFile.value = "";

    saveStorage();
    renderAll();
    switchSection("myFlashcards");
    showToast(replaceExisting ? "Library imported and existing data replaced." : "Decks imported into your current library.");
    closeImportModal();
  }

  function onExportSelected() {
    if (!el.exportSelect) {
      onExportAll();
      return;
    }

    const value = el.exportSelect.value;
    if (!value || value === "none") {
      showToast("Choose a deck to export.");
      return;
    }

    const set = state.userSets.find((s) => s.internalId === value);
    if (!set) {
      showToast("Deck not found.");
      return;
    }

    downloadJSON(cleanSetForExport(set), `${safeFilename(set.title)}.json`);
  }

  function onExportAll() {
    if (state.userSets.length === 0) {
      showToast("No user decks to export.");
      return;
    }

    const all = state.userSets.map((set) => cleanSetForExport(set));
    const payload = {
      format: "edgeducate-full-library",
      version: 2,
      exportedAt: new Date().toISOString(),
      userSets: all,
      progress: state.progress,
      settings: state.settings
    };
    const owner = state.settings.studentName ? safeFilename(state.settings.studentName) : "student";
    downloadJSON(payload, `${owner}-study-library.edgefc`);
  }

  function onClearLibrary() {
    const confirmed = window.confirm(
      "Clear everything? This removes all your decks, attachments, progress, and settings from this browser."
    );
    if (!confirmed) {
      return;
    }

    state.userSets = [];
    state.progress = {};
    state.settings = { studentName: "", defaultMode: "study" };
    state.editingSetId = null;
    state.pendingImportSets = [];
    state.pendingImportMeta = { progress: {}, settings: null };
    state.pendingImportFileName = "";
    state.lastImportedFileName = "";

    if (el.importPreview) {
      el.importPreview.classList.add("hidden");
    }
    if (el.importPreviewContent) {
      el.importPreviewContent.textContent = "";
    }
    if (el.importFile) {
      el.importFile.value = "";
    }

    cancelEdit();
    saveStorage();
    renderAll();
    switchSection("export");
    showToast("Everything cleared. You can now import your backup.");
  }

  function cleanSetForExport(set) {
    return {
      internalId: set.internalId,
      title: set.title,
      pack: set.pack,
      subject: set.subject,
      yearLevel: set.yearLevel,
      description: set.description,
      cards: set.cards.map((c, i) => ({
        id: i + 1,
        front: c.front,
        back: c.back,
        ...(c.frontImage ? { frontImage: c.frontImage } : {}),
        ...(c.backImage ? { backImage: c.backImage } : {})
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
    if (!el.exportSelect) {
      return;
    }

    el.exportSelect.textContent = "";

    const placeholder = document.createElement("option");
    placeholder.value = "none";
    placeholder.textContent = state.userSets.length ? "Select a deck" : "No decks available";
    el.exportSelect.appendChild(placeholder);

    state.userSets.forEach((set) => {
      const opt = document.createElement("option");
      opt.value = set.internalId;
      opt.textContent = `${set.title} (${set.pack})`;
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
    const faceImage = state.study.flipped ? sanitizeImageDataUrl(card.backImage) : sanitizeImageDataUrl(card.frontImage);
    renderStudyFace(el.flashcardFace, faceText, faceImage);
    el.flashcardFace.classList.toggle("flipped", state.study.flipped);

    const modeLabel = state.study.mode === "review" ? "Review mode" : "Study mode";
    el.studyMeta.textContent = `${state.study.activeSet.pack} | ${state.study.activeSet.title} | ${modeLabel} | Card ${state.study.index + 1}/${total}`;

    updateProgressBar();
  }

  function renderStudyFace(target, text, imageDataUrl) {
    target.textContent = "";

    const wrap = document.createElement("div");
    wrap.className = "face-content";

    if (imageDataUrl) {
      const img = document.createElement("img");
      img.className = "face-image";
      img.src = imageDataUrl;
      img.alt = "Flashcard attachment";
      wrap.appendChild(img);
    }

    const textNode = document.createElement("p");
    textNode.className = "face-text";
    textNode.textContent = text;
    wrap.appendChild(textNode);
    target.appendChild(wrap);
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
    const totalPacks = new Set(state.userSets.map((set) => set.pack)).size;
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
      { label: "Categories", value: String(totalPacks) },
      { label: "My Decks", value: String(totalSets) },
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
      line.textContent = `${set.pack} / ${set.title}: ${percent}% known (${known}/${set.cards.length}), needs revision: ${revision}`;
      el.setProgressList.appendChild(line);
    });
  }

  function createStatCard(label, value, goSection = null) {
    const card = document.createElement(goSection ? "button" : "div");
    card.className = goSection ? "card stat-card nav-stat" : "card stat-card";
    if (goSection) {
      card.type = "button";
      card.setAttribute("data-go", goSection);
      card.setAttribute("aria-label", `${label}: ${value}. Open ${goSection}.`);
    }

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

  function validateFlashcardSet(candidate, options) {
    const isPublic = options && options.isPublic;
    const fallbackPack = options && options.defaultPack ? options.defaultPack : "General Pack";
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return { valid: false, error: "Set format must be a JSON object." };
    }

    const title = safeText(candidate.title, LIMITS.maxTitleLength);
    const pack = safeText(candidate.pack || fallbackPack, LIMITS.maxPackLength);
    const subject = safeText(candidate.subject, LIMITS.maxSubjectLength);
    const yearLevel = safeText(candidate.yearLevel, LIMITS.maxYearLevelLength);
    const description = safeText(candidate.description, LIMITS.maxDescriptionLength);

    if (!title || !pack) {
      return { valid: false, error: "Set must include a title and category." };
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

      const front = safeCardText(rawCard.front, LIMITS.maxFrontLength);
      const back = safeCardText(rawCard.back, LIMITS.maxBackLength);
      const frontImage = sanitizeImageDataUrl(rawCard.frontImage);
      const backImage = sanitizeImageDataUrl(rawCard.backImage);

      if (!front || !back) {
        return { valid: false, error: `Card ${i + 1} must include front and back text.` };
      }

      if (rawCard.frontImage && !frontImage) {
        return { valid: false, error: `Card ${i + 1} front image is invalid.` };
      }

      if (rawCard.backImage && !backImage) {
        return { valid: false, error: `Card ${i + 1} back image is invalid.` };
      }

      let id = Number(rawCard.id);
      if (!Number.isFinite(id) || id < 1 || usedIds.has(id)) {
        id = i + 1;
      }
      while (usedIds.has(id)) {
        id += 1;
      }
      usedIds.add(id);

      const nextCard = { id, front, back };
      if (frontImage) {
        nextCard.frontImage = frontImage;
      }
      if (backImage) {
        nextCard.backImage = backImage;
      }
      cards.push(nextCard);
    }

    const validated = {
      title,
      pack,
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

  function extractImportDecks(parsed) {
    const isFullLibraryObject =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      parsed.format === "edgeducate-full-library" &&
      Array.isArray(parsed.userSets);

    const sourceList = isFullLibraryObject ? parsed.userSets : Array.isArray(parsed) ? parsed : [parsed];
    if (!sourceList.length) {
      return { valid: false, error: "Import file is empty." };
    }

    if (sourceList.length > LIMITS.maxSets) {
      return { valid: false, error: "Import file has too many decks." };
    }

    const decks = [];
    for (let i = 0; i < sourceList.length; i += 1) {
      const validated = validateFlashcardSet(sourceList[i], { isPublic: false, defaultPack: "Imported Pack" });
      if (!validated.valid) {
        return { valid: false, error: `Deck ${i + 1}: ${validated.error}` };
      }
      const normalized = {
        ...validated.data,
        ...(safeImportId(sourceList[i].internalId) ? { internalId: safeImportId(sourceList[i].internalId) } : {}),
        cards: validated.data.cards.map((card, idx) => ({
          id: idx + 1,
          front: card.front,
          back: card.back,
          ...(card.frontImage ? { frontImage: card.frontImage } : {}),
          ...(card.backImage ? { backImage: card.backImage } : {})
        }))
      };
      decks.push(normalized);
    }

    const progress =
      isFullLibraryObject && parsed.progress && typeof parsed.progress === "object" && !Array.isArray(parsed.progress)
        ? parsed.progress
        : {};

    const settings =
      isFullLibraryObject && parsed.settings && typeof parsed.settings === "object" && !Array.isArray(parsed.settings)
        ? parsed.settings
        : null;

    return { valid: true, decks, progress, settings };
  }

  function safeImportId(value) {
    if (typeof value !== "string") {
      return "";
    }

    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 120) {
      return "";
    }

    return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : "";
  }

  function safeText(value, maxLen) {
    const raw = typeof value === "string" ? value : String(value || "");
    const withoutTags = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return withoutTags.slice(0, maxLen);
  }

  function safeCardText(value, maxLen) {
    const raw = typeof value === "string" ? value : String(value || "");
    const normalized = raw.replace(/<[^>]*>/g, "").replace(/\r\n?/g, "\n");
    return normalized.slice(0, maxLen);
  }

  function sanitizeImageDataUrl(value) {
    if (typeof value !== "string" || value.length === 0) {
      return "";
    }

    if (value.length > LIMITS.maxImageDataUrlLength) {
      return "";
    }

    const trimmed = value.trim();
    const imageRegex = /^data:image\/(png|jpeg);base64,[a-zA-Z0-9+/=]+$/;
    return imageRegex.test(trimmed) ? trimmed : "";
  }

  async function optimizeImageForStorage(file) {
    const sourceDataUrl = await readFileAsDataUrl(file);
    const sanitizedSource = sanitizeImageDataUrl(sourceDataUrl);
    if (!sanitizedSource) {
      return "";
    }

    const image = await loadImageFromDataUrl(sanitizedSource);
    if (!image.naturalWidth || !image.naturalHeight) {
      return "";
    }

    const scale = Math.min(1, LIMITS.maxImageDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return "";
    }

    context.drawImage(image, 0, 0, width, height);

    const preferredMime = file.type === "image/png" ? "image/png" : "image/jpeg";
    let result = preferredMime === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.86);

    if (preferredMime === "image/jpeg") {
      let quality = 0.86;
      while (result.length > LIMITS.maxImageDataUrlLength && quality > 0.42) {
        quality -= 0.08;
        result = canvas.toDataURL("image/jpeg", quality);
      }
    }

    if (preferredMime === "image/png" && result.length > LIMITS.maxImageDataUrlLength) {
      let quality = 0.84;
      result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > LIMITS.maxImageDataUrlLength && quality > 0.42) {
        quality -= 0.08;
        result = canvas.toDataURL("image/jpeg", quality);
      }
    }

    return sanitizeImageDataUrl(result);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read-failed"));
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image-load-failed"));
      image.src = dataUrl;
    });
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

  function groupByPack(sets) {
    return sets.reduce((acc, set) => {
      const key = set.pack || "General Pack";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(set);
      return acc;
    }, {});
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

  function printDeck(set, mode = "standard") {
    if (!set || !Array.isArray(set.cards) || set.cards.length === 0) {
      showToast("No cards available to print.");
      return;
    }

    const validMode = mode === "compact" || mode === "exam" ? mode : "standard";
    const isDuplexSheet = validMode === "standard";

    if (!isDuplexSheet) {
      showToast("Compact and front-only modes are disabled for duplex sheet print.");
    }

    const sourceCards = set.cards.slice(0, 8);
    if (set.cards.length > 8) {
      showToast("Duplex sheet prints the first 8 cards only.");
    }

    const paddedCards = Array.from({ length: 8 }, (_, idx) => sourceCards[idx] || null);

    const frontPageHtml = paddedCards
      .map((card, idx) => {
        if (!card) {
          return `<article class="print-card slot-empty"><header class="card-head">C${idx + 1}.FRONT</header></article>`;
        }
        const front = escapeHtml(card.front);
        const frontImage = sanitizeImageDataUrl(card.frontImage);
        const frontImageHtml = frontImage ? `<img class="print-image" src="${escapeHtml(frontImage)}" alt="Card ${idx + 1} front image">` : "";
        return `<article class="print-card"><header class="card-head">C${idx + 1}.FRONT</header><section class="card-face">${frontImageHtml}<p class="face-body">${front}</p></section></article>`;
      })
      .join("");

    const backPageHtml = paddedCards
      .map((card, idx) => {
        if (!card) {
          return `<article class="print-card slot-empty"><header class="card-head">C${idx + 1}.BACK</header></article>`;
        }
        const back = escapeHtml(card.back);
        const backImage = sanitizeImageDataUrl(card.backImage);
        const backImageHtml = backImage ? `<img class="print-image" src="${escapeHtml(backImage)}" alt="Card ${idx + 1} back image">` : "";
        return `<article class="print-card"><header class="card-head">C${idx + 1}.BACK</header><section class="card-face">${backImageHtml}<p class="face-body">${back}</p></section></article>`;
      })
      .join("");

    const title = escapeHtml(`${set.pack} - ${set.title}`);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
    if (!frameDoc || !iframe.contentWindow) {
      iframe.remove();
      showToast("Unable to prepare print preview.");
      return;
    }

    frameDoc.open();
    frameDoc.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title><style>@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:"STIX Two Math","Cambria Math","Noto Sans Math","Segoe UI Symbol","DejaVu Sans","Arial Unicode MS","Segoe UI",Tahoma,sans-serif;color:#0f172a;background:#fff}.print-page{width:194mm;height:281mm;margin:0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr));border:0.4mm solid #94a3b8;page-break-after:always;break-after:page}.print-page:last-of-type{page-break-after:auto;break-after:auto}.print-card{position:relative;padding:4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden;border-right:0.3mm dashed #cbd5e1;border-bottom:0.3mm dashed #cbd5e1}.print-card:nth-child(2n){border-right:0}.print-card:nth-last-child(-n+2){border-bottom:0}.slot-empty .card-head{opacity:.25}.card-head{position:absolute;top:2.2mm;left:2.2mm;font-weight:700;font-size:8.8pt;color:#0f172a;margin:0}.card-face{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5mm;width:100%;height:100%}.print-image{max-width:100%;max-height:30mm;object-fit:contain;border:0.3mm solid #dbe5ef}.face-label{margin:0;color:#334155;font-size:8.2pt;letter-spacing:.08em;text-transform:uppercase;font-weight:700}.face-body{margin:0;font-family:"STIX Two Math","Cambria Math","Noto Sans Math","Segoe UI Symbol","DejaVu Sans","Arial Unicode MS","Segoe UI",Tahoma,sans-serif;font-size:10.7pt;line-height:1.35;white-space:pre-wrap;word-break:break-word;max-width:100%}@media print{body{background:#fff}}</style></head><body><section class="print-page">${frontPageHtml}</section><section class="print-page">${backPageHtml}</section></body></html>`);
    frameDoc.close();

    window.setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      window.setTimeout(() => {
        iframe.remove();
      }, 800);
    }, 120);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function placeCaretAtEnd(node) {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
})();
