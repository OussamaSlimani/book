document.addEventListener("DOMContentLoaded", function () {
  // DOM elements
  const words = document.querySelectorAll(".word");
  const goToSavedBtn = document.getElementById("goToSavedBtn");
  const phraseTranslation = document.getElementById("phraseTranslation");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const progressBar = document.getElementById("progressBar");

  // State variables
  let longPressTimer;
  let savedWordIdFr = localStorage.getItem("savedWordIdFr");
  let currentHighlight = null;
  let lastSelectionTime = 0;

  // Check if there's a saved word and highlight it
  if (savedWordIdFr) {
    const savedWord = document.getElementById(savedWordIdFr);
    if (savedWord) {
      savedWord.classList.add("saved-word");
      goToSavedBtn.style.display = "flex";
    }
  } else {
    goToSavedBtn.style.display = "none";
  }

  // Set up event listeners
  setupEventListeners();

  // Initialize progress bar
  window.addEventListener("scroll", updateProgressBar);
  updateProgressBar();

  function setupEventListeners() {
    // Go to saved word button click handler
    goToSavedBtn.addEventListener("click", function () {
      if (savedWordIdFr) {
        const savedWord = document.getElementById(savedWordIdFr);
        if (savedWord) {
          savedWord.scrollIntoView({ behavior: "smooth", block: "center" });
          savedWord.style.backgroundColor = "var(--secondary-accent)";
          setTimeout(() => {
            savedWord.style.backgroundColor = "";
          }, 1000);
        }
      }
    });

    // Word click handler for translation
    words.forEach((word) => {
      word.addEventListener("click", function (e) {
        if (Date.now() - lastSelectionTime < 300) return;
        translateWord(word);
      });

      // Long press handler for saving word position
      word.addEventListener("mousedown", function (e) {
        longPressTimer = setTimeout(() => {
          handleLongPress(word);
        }, 500);
      });

      word.addEventListener("mouseup", function () {
        clearTimeout(longPressTimer);
      });

      word.addEventListener("mouseleave", function () {
        clearTimeout(longPressTimer);
      });
    });

    // Text selection handler for phrase translation
    document.addEventListener("mouseup", function (e) {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (!selectedText || selectedText.length < 2) {
        removeHighlight();
        return;
      }

      if (
        e.target === phraseTranslation ||
        phraseTranslation.contains(e.target)
      ) {
        return;
      }

      lastSelectionTime = Date.now();
      const x = e.clientX;
      const y = e.clientY;

      highlightSelectedText(selection);

      loadingIndicator.style.display = "block";
      loadingIndicator.style.left = `${x + 10}px`;
      loadingIndicator.style.top = `${y + 10}px`;

      translatePhrase(selectedText, x, y);
    });

    // Close translation popup when clicking elsewhere
    document.addEventListener("click", function (e) {
      if (
        e.target !== phraseTranslation &&
        !phraseTranslation.contains(e.target) &&
        !loadingIndicator.contains(e.target)
      ) {
        phraseTranslation.classList.remove("show");
        removeHighlight();
      }
    });
  }

  function handleLongPress(word) {
    let newWordId = word.id;

    if (savedWordIdFr) {
      let [savedBookId] = savedWordIdFr.split("_");
      let [newBookId] = newWordId.split("_");

      if (savedBookId === newBookId) {
        // Update saved word for the same book
        const prevSavedWord = document.getElementById(savedWordIdFr);
        if (prevSavedWord) prevSavedWord.classList.remove("saved-word");
      }
    }

    // Save new word
    savedWordIdFr = newWordId;
    word.classList.add("saved-word");
    localStorage.setItem("savedWordIdFr", savedWordIdFr);
    goToSavedBtn.style.display = "flex";

    // Show feedback
    const feedback = document.createElement("div");
    feedback.textContent = "Word saved!";
    feedback.style.position = "fixed";
    feedback.style.left = "50%";
    feedback.style.top = "20%";
    feedback.style.transform = "translateX(-50%)";
    feedback.style.backgroundColor = "var(--primary-accent)";
    feedback.style.color = "white";
    feedback.style.padding = "8px 16px";
    feedback.style.borderRadius = "4px";
    feedback.style.zIndex = "1000";
    feedback.style.animation = "fadeIn 0.2s, fadeOut 0.2s 1.5s forwards";
    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 2000);
  }

  function translateWord(word) {
    const text = word.textContent.trim();
    if (!text) return;

    if (word.classList.contains("translated")) {
      word.classList.remove("translated");
      word.removeAttribute("data-translation");
      return;
    }

    // Try multiple translation services as fallback
    tryTranslate(
      text,
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

    phraseTranslation.style.left = `${x + 10}px`;
    phraseTranslation.style.top = `${y + 10}px`;

    tryTranslate(
      text,
      (translation) => {
        loadingIndicator.style.display = "none";
        phraseTranslation.textContent = translation;
        phraseTranslation.classList.add("show");
        setTimeout(() => {
          phraseTranslation.classList.remove("show");
          removeHighlight();
        }, 5000);
      },
      (error) => {
        console.error("Translation error:", error);
        loadingIndicator.style.display = "none";
        phraseTranslation.innerHTML = `<span class="error-message">Translation error. Please try again.</span>`;
        phraseTranslation.classList.add("show");
        setTimeout(() => {
          phraseTranslation.classList.remove("show");
          removeHighlight();
        }, 3000);
      }
    );
  }

  function tryTranslate(text, successCallback, errorCallback) {
    // First try MyMemory API
    fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=en|ar`
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
        // Fallback to LibreTranslate (community server)
        fetch(`https://libretranslate.de/translate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: text,
            source: "en",
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

  function highlightSelectedText(selection) {
    removeHighlight();

    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.className = "highlighted-phrase";

    try {
      range.surroundContents(span);
      currentHighlight = span;
    } catch (e) {
      console.log("Couldn't highlight selection:", e);
    }
  }

  function removeHighlight() {
    if (currentHighlight) {
      const parent = currentHighlight.parentNode;
      if (parent) {
        parent.replaceChild(
          document.createTextNode(currentHighlight.textContent),
          currentHighlight
        );
      }
      currentHighlight = null;
    }
    window.getSelection().removeAllRanges();
  }

  function updateProgressBar() {
    const windowHeight = window.innerHeight;
    const fullHeight = document.body.clientHeight;
    const scrolled = window.scrollY;
    const progress = (scrolled / (fullHeight - windowHeight)) * 100;
    progressBar.style.width = progress + "%";
  }
});

document.getElementById("homeButton").addEventListener("click", function () {
  window.location.href = "/";
});

// timer
let timer;
let timeElapsed = 0;
let running = false;
const maxTime = 20 * 60;

function updateDisplay() {
  let minutes = Math.floor(timeElapsed / 60)
    .toString()
    .padStart(2, "0");
  let seconds = (timeElapsed % 60).toString().padStart(2, "0");
  document.getElementById("timerDisplay").textContent = `${minutes}:${seconds}`;
}

function toggleTimer() {
  const timerButton = document.getElementById("timerButton");
  if (running) {
    clearInterval(timer);
    timerButton.innerHTML = '<i class="fas fa-play"></i>';
  } else {
    timer = setInterval(() => {
      if (timeElapsed < maxTime) {
        timeElapsed++;
        updateDisplay();
      } else {
        clearInterval(timer);
      }
    }, 1000);
    timerButton.innerHTML = '<i class="fas fa-pause"></i>';
  }
  running = !running;
}

document.getElementById("timerButton").addEventListener("click", toggleTimer);
updateDisplay();
