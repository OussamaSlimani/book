// Check for saved dark mode preference and apply it
function checkDarkModePreference() {
  const darkModeEnabled = localStorage.getItem("darkMode") === "enabled";
  const icon = document.getElementById("darkModeIcon");

  if (darkModeEnabled) {
    document.body.classList.add("dark-mode");
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  } else {
    document.body.classList.remove("dark-mode");
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
  }
}

// Initialize dark mode on page load
document.addEventListener("DOMContentLoaded", checkDarkModePreference);

// Dark mode toggle functionality
document
  .getElementById("darkModeToggle")
  .addEventListener("click", function () {
    const darkModeEnabled = document.body.classList.toggle("dark-mode");
    const icon = document.getElementById("darkModeIcon");

    if (darkModeEnabled) {
      localStorage.setItem("darkMode", "enabled");
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
    } else {
      localStorage.setItem("darkMode", "disabled");
      icon.classList.remove("fa-sun");
      icon.classList.add("fa-moon");
    }
  });
