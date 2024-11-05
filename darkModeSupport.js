
const htmlElement = document.querySelector("html");
const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');

matchMedia.addEventListener('change', ({matches}) => updateTheme(matches))
updateTheme(matchMedia.matches);

function updateTheme(darkMode) {
  htmlElement.setAttribute("data-bs-theme", darkMode ? "dark" : "light");
}