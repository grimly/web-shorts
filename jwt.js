import { fromEvent, map, tap } from "https://esm.sh/rxjs@7.8.1";


function setValidation(badge, state, message) {
  badge.className = `badge text-bg-${state}`;
  badge.textContent = message;
}

const decode = (() => {
  const root = document.forms["decoded"];
  root.addEventListener("submit", event => event.preventDefault());
  const area = root.elements.area;
  const badge = root.querySelector("[el=badge]");
  const copy = root.querySelector("[el=copyAction]");

  fromEvent(copy, 'click')
    .pipe(
      tap(event => event.preventDefault())
    )
    .subscribe(() => {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(area.value);
      } else {
        area.select();
        document.execCommand("copy");
      }
    });

  /**
   * @param {string} source
   */
  function decode$(source) {
    const Whitespaces = /[ \t\r\n\f]/g;
    const trimmedSource = source.replace(Whitespaces, "");
    const TokenPattern = /(ey[0-9a-zA-Z-_]+)\.(ey[0-9a-zA-Z-_]+)\.([0-9a-zA-Z-_]+)/g;
    const parsed = TokenPattern.exec(trimmedSource);
    if (parsed === null) {
      setValidation(badge, "danger", "Malformed token");
    } else {
      try {
        const header = parsed[1].replace(/_/g, "/").replace(/-/g, "+");
        const claims = parsed[2].replace(/_/g, "/").replace(/-/g, "+");
        area.value = `Headers :\n${JSON.stringify(JSON.parse(atob(header)), null, '  ')}\nClaims :\n${JSON.stringify(JSON.parse(atob(claims)), null, '  ')}`;
        setValidation(badge, "success", "JWT decoded");
      } catch (e) {
        setValidation(badge, "danger", `Error caught: ${e.message}`);
      }
    }
  }

  return decode$;

})();

{
  const root = document.forms["encoded"];
  root.addEventListener("submit", event => event.preventDefault());
  const area = root.elements.area;
  const badge = root.querySelector("[el=badge]");
  setValidation(badge, "success", "Ready");

  fromEvent(area, 'blur')
    .pipe(map(() => area.value))
    .subscribe(decode);
}
