import { fromEvent, map, tap } from "https://esm.sh/rxjs@7.8.1";
import { cleanOpenAPI } from "./cleanOpenAPI.js";
import { JSON_SCHEMA, dump, load } from "https://esm.sh/js-yaml@4.1.0";

function setValidation(badge, state, message) {
  badge.className = `badge text-bg-${state}`;
  badge.textContent = message;
}

const cleanOpenAPIAndPrint = (() => {
  const root = document.forms.cleaned;
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
  function cleanOpenAPIAndPrint$(source) {
    const cleaned = cleanOpenAPI(load(source, {schema: JSON_SCHEMA}));
    if (cleaned === null) {
      setValidation(badge, "danger", "Cannot clean OpenAPI");
    } else {
      try {
        area.value = dump(cleaned, {indent: 2, schema: JSON_SCHEMA, noRefs: true});
        setValidation(badge, "success", "JWT decoded");
      } catch (e) {
        setValidation(badge, "danger", `Error caught: ${e.message}`);
      }
    }
  }

  return cleanOpenAPIAndPrint$;

})();

{
  const root = document.forms.source;
  root.addEventListener("submit", event => event.preventDefault());
  const area = root.elements.area;
  const badge = root.querySelector("[el=badge]");
  setValidation(badge, "success", "Ready");

  fromEvent(area, 'blur')
    .pipe(map(() => area.value))
    .subscribe(cleanOpenAPIAndPrint);
}
