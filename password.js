import { combineLatest, concat, distinctUntilChanged, fromEvent, map, merge, of, switchMap, tap } from "https://esm.sh/rxjs@7.8.1";

const configForm = document.forms.config;
const passwordForm = document.forms.passwordForm;
const copyClipboard = document.getElementById('copyClipboard');
const regenerate = document.getElementById('regenerate');

merge(
  fromEvent(passwordForm, 'submit')
).subscribe(e => e.preventDefault());

function generatePassword(length) {
  return btoa(Array.from(crypto.getRandomValues(new Uint8Array(length + 3))).map(c => String.fromCharCode(c)).join('')).substr(0, length);
}


const config$ = concat(
  of(undefined),
  merge(
    fromEvent(configForm, 'input'),
    fromEvent(configForm, 'change')
  )
).pipe(
  map(() => ({
    length: configForm.elements.passwordLength.value,
    specials: configForm.elements.specials.value === 'true'
  })),
  distinctUntilChanged((a, b) => a === b, c => JSON.stringify(c)),
);

combineLatest([
  config$,
  concat(
    of(undefined),
    fromEvent(regenerate, 'click')
  )
]).pipe(
  map(([config]) => config),
  map(({length, specials}) => {
    let password;
    do {
      password = generatePassword(length > 0 ? length : 0);
    } while (! (specials || /^[0-9a-zA-Z]*$/.test(password)));
    return password;
  }),
  map(value => {
    passwordForm.elements.password.value = value;
    return passwordForm.elements.password
  }),
  switchMap(display => fromEvent(copyClipboard, 'click').pipe(
    tap(() => {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(display.value);
      } else {
        display.select();
        document.execCommand("copy");
      }
    })
  ))
).subscribe();
