// ======================
// Constants and Variables
// ======================
const pageName = window.location.pathname.split('/').pop().split('.')[0];
const languagePrefix = pageName.split('-')[0];
const savedWordKey = `savedWordId_${pageName}`;

// DOM elements
const elements = {
  words: document.querySelectorAll(".word"),
  goToSavedBtn: document.getElementById("goToSavedBtn"),
  phraseTranslation: document.getElementById("phraseTranslation"),
  loadingIndicator: document.getElementById("loadingIndicator"),
  progressBar: document.getElementById("progressBar"),
  homeButton: document.getElementById("homeButton"),
  timerButton: document.getElementById("timerButton"),
  timerDisplay: document.getElementById("timerDisplay"),
  mobileMenuToggle: document.getElementById('mobileMenuToggle'),
  themeToggle: document.getElementById('themeToggle')
};

// State variables
const state = {
  longPressTimer: null,
  savedWordId: localStorage.getItem(savedWordKey),
  currentHighlight: null,
  lastSelectionTime: 0,
  timer: null,
  timeElapsed: 0,
  running: false
};

// ======================
// Initialization
// ======================
function initialize() {
  highlightSavedWord();
  setupEventListeners();
  checkLastSavedChapter();
  updateTimerDisplay();
}

// ======================
// Core Functions
// ======================
function highlightSavedWord() {
  if (state.savedWordId) {
    const savedWord = document.getElementById(state.savedWordId);
    if (savedWord) {
      savedWord.classList.add("saved-word");
      elements.goToSavedBtn.style.display = "flex";
    }
  } else {
    elements.goToSavedBtn.style.display = "none";
  }
}

function checkLastSavedChapter() {
  const bookPrefix = pageName.split('_')[0];
  const savedChapters = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(`savedWordId_${bookPrefix}_`)) {
      const chapterNum = key.split('_')[2].split('.')[0];
      savedChapters.push(parseInt(chapterNum));
    }
  }
  
  if (savedChapters.length > 0) {
    savedChapters.sort((a, b) => a - b);
    const lastChapter = savedChapters[savedChapters.length - 1];
    showNotification(`Last chapter: ${lastChapter.toString().padStart(2, '0')}`);
  }
}

// ======================
// Event Handlers
// ======================
function setupEventListeners() {
  // Saved word navigation
  elements.goToSavedBtn.addEventListener("click", handleGoToSavedClick);
  
  // Word interactions
  elements.words.forEach(word => {
    word.addEventListener("click", handleWordClick);
    word.addEventListener("mousedown", handleWordMouseDown);
    word.addEventListener("mouseup", handleWordMouseUp);
    word.addEventListener("mouseleave", handleWordMouseLeave);
  });
  
  // Text selection and translation
  document.addEventListener("mouseup", handleDocumentMouseUp);
  document.addEventListener("click", handleDocumentClick);
  
  // Timer controls
  elements.timerButton.addEventListener("click", toggleTimer);
  
  // Navigation
  elements.homeButton.addEventListener("click", () => window.location.href = "/");
  elements.mobileMenuToggle.addEventListener('click', toggleMobileMenu);
}

function handleGoToSavedClick() {
  if (state.savedWordId) {
    const savedWord = document.getElementById(state.savedWordId);
    if (savedWord) {
      savedWord.scrollIntoView({ behavior: "smooth", block: "center" });
      savedWord.style.backgroundColor = "var(--secondary-accent)";
      setTimeout(() => {
        savedWord.style.backgroundColor = "";
      }, 1000);
    }
  }
}

function handleWordClick(e) {
  if (Date.now() - state.lastSelectionTime < 300) return;
  translateWord(this);
}

function handleWordMouseDown(e) {
  state.longPressTimer = setTimeout(() => {
    handleLongPress(this);
  }, 500);
}

function handleWordMouseUp() {
  clearTimeout(state.longPressTimer);
}

function handleWordMouseLeave() {
  clearTimeout(state.longPressTimer);
}

function handleDocumentMouseUp(e) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (!selectedText || selectedText.length < 2) {
    removeHighlight();
    return;
  }

  if (e.target === elements.phraseTranslation || elements.phraseTranslation.contains(e.target)) {
    return;
  }

  state.lastSelectionTime = Date.now();
  const x = e.clientX;
  const y = e.clientY;

  highlightSelectedText(selection);

  elements.loadingIndicator.style.display = "block";
  elements.loadingIndicator.style.left = `${x + 10}px`;
  elements.loadingIndicator.style.top = `${y + 10}px`;

  translatePhrase(selectedText, x, y);
}

function handleDocumentClick(e) {
  if (
    e.target !== elements.phraseTranslation &&
    !elements.phraseTranslation.contains(e.target) &&
    !elements.loadingIndicator.contains(e.target)
  ) {
    elements.phraseTranslation.classList.remove("show");
    removeHighlight();
  }
}

// ======================
// Translation Functions
// ======================
function translateWord(word) {
  const text = word.textContent.trim();
  if (!text) return;

  if (word.classList.contains("translated")) {
    word.classList.remove("translated");
    word.removeAttribute("data-translation");
    return;
  }

  tryTranslate(
    text,
    languagePrefix,
    (translation) => {
      word.classList.add("translated");
      word.setAttribute("data-translation", translation);
      setTimeout(() => {
        word.classList.remove("translated");
        word.removeAttribute("data-translation");
      }, 3000);
    },
    (error) => {
      console.error("Translation error:", error);
      word.classList.add("translated");
      word.setAttribute("data-translation", "Error: " + error);
      setTimeout(() => {
        word.classList.remove("translated");
        word.removeAttribute("data-translation");
      }, 2000);
    }
  );
}

function translatePhrase(text, x, y) {
  if (!text || text.length < 2) return;

  elements.phraseTranslation.style.left = `${x + 10}px`;
  elements.phraseTranslation.style.top = `${y + 10}px`;

  tryTranslate(
    text,
    languagePrefix,
    (translation) => {
      elements.loadingIndicator.style.display = "none";
      elements.phraseTranslation.textContent = translation;
      elements.phraseTranslation.classList.add("show");
      setTimeout(() => {
        elements.phraseTranslation.classList.remove("show");
        removeHighlight();
      }, 5000);
    },
    (error) => {
      console.error("Translation error:", error);
      elements.loadingIndicator.style.display = "none";
      elements.phraseTranslation.innerHTML = `<span class="error-message">Translation error. Please try again.</span>`;
      elements.phraseTranslation.classList.add("show");
      setTimeout(() => {
        elements.phraseTranslation.classList.remove("show");
        removeHighlight();
      }, 3000);
    }
  );
}

function tryTranslate(text, sourceLang, successCallback, errorCallback) {
  fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${sourceLang}|ar`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((data) => {
      if (data.responseData && data.responseData.translatedText) {
        successCallback(data.responseData.translatedText);
      } else {
        throw new Error("No translation found in response");
      }
    })
    .catch((error) => {
      console.log("MyMemory failed, trying fallback...");
      fetch(`https://libretranslate.de/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: "ar",
        }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Fallback service failed");
          return response.json();
        })
        .then((data) => {
          if (data.translatedText) {
            successCallback(data.translatedText);
          } else {
            throw new Error("No translation from fallback");
          }
        })
        .catch((fallbackError) => {
          console.error("Fallback translation error:", fallbackError);
          errorCallback("Service unavailable. Please try again later.");
        });
    });
}

// ======================
// UI Functions
// ======================
function handleLongPress(word) {
  let newWordId = word.id;

  if (state.savedWordId) {
    let [savedBookId] = state.savedWordId.split("_");
    let [newBookId] = newWordId.split("_");

    if (savedBookId === newBookId) {
      const prevSavedWord = document.getElementById(state.savedWordId);
      if (prevSavedWord) prevSavedWord.classList.remove("saved-word");
    }
  }

  state.savedWordId = newWordId;
  word.classList.add("saved-word");
  localStorage.setItem(savedWordKey, state.savedWordId);
  elements.goToSavedBtn.style.display = "flex";

  showNotification("Word saved!");
}

function highlightSelectedText(selection) {
  removeHighlight();

  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  span.className = "highlighted-phrase";

  try {
    range.surroundContents(span);
    state.currentHighlight = span;
  } catch (e) {
    console.log("Couldn't highlight selection:", e);
  }
}

function removeHighlight() {
  if (state.currentHighlight) {
    const parent = state.currentHighlight.parentNode;
    if (parent) {
      parent.replaceChild(
        document.createTextNode(state.currentHighlight.textContent),
        state.currentHighlight
      );
    }
    state.currentHighlight = null;
  }
  window.getSelection().removeAllRanges();
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.top = "20px";
  notification.style.left = "50%";
  notification.style.transform = "translateX(-50%)";
  notification.style.backgroundColor = "var(--primary-accent)";
  notification.style.color = "white";
  notification.style.padding = "8px 16px";
  notification.style.borderRadius = "4px";
  notification.style.zIndex = "1000";
  notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  notification.style.animation = "fadeIn 0.2s, fadeOut 0.2s 1.5s forwards";
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// ======================
// Timer Functions
// ======================
function toggleTimer() {
  if (state.running) {
    clearInterval(state.timer);
    elements.timerButton.innerHTML = '<i class="fas fa-play"></i>';
  } else {
    state.timer = setInterval(() => {
      state.timeElapsed++;
      updateTimerDisplay();
    }, 1000);
    elements.timerButton.innerHTML = '<i class="fas fa-pause"></i>';
  }
  state.running = !state.running;
}

function updateTimerDisplay() {
  let minutes = Math.floor(state.timeElapsed / 60)
    .toString()
    .padStart(2, "0");
  let seconds = (state.timeElapsed % 60).toString().padStart(2, "0");
  elements.timerDisplay.textContent = `${minutes}:${seconds}`;
}

// ======================
// Navigation Functions
// ======================
function toggleMobileMenu() {
  document.querySelector('.nav-sidebar').classList.toggle('visible');
}


// ======================
// Initialization
// ======================
document.addEventListener("DOMContentLoaded", initialize);