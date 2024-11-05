import { concat, combineLatest, distinctUntilChanged, filter, fromEvent, map, merge, of, startWith, switchMap, tap, Subject } from "https://esm.sh/rxjs@7.8.1";
import { JSON_SCHEMA, dump, load } from "https://esm.sh/js-yaml@4.1.0";

const PASSTHROUGH_ACTION = e => e;
const actionsOnValue = new Subject();
const configForm = document.forms.config;
const configuration = merge(
  fromEvent(configForm, 'input'),
  fromEvent(configForm, 'change')
)
  .pipe(
    startWith(undefined),
    map(() => Array
      .from(new FormData(configForm).entries())
      .reduce(
        (col, [key, val]) => ({...col, [key]: val}),
        {}
      )
    ),
    map(({indentation, ...rest}) => ({indentation: Number(indentation) || 0, ...rest})),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
  );

const { editor } = document.forms.editorForm.elements;
const validation = document.getElementById('validation');
const setValidationState = (state, message) => {
  validation.classList.remove(...['success', 'danger', 'info', 'warning'].map(s => `text-bg-${s}`));
  validation.classList.add(`text-bg-${state}`);
  validation.textContent = message;
};
const input = fromEvent(editor, 'blur')
  .pipe(
    startWith(undefined),
    map(() => editor.value)
  );

const REORDER_ACTION = ({configuration, input}) => ({configuration, input: reorder(input)});
const reorder = o => {
  if (Array.isArray(o)) {
    return o.map(reorder);
  } else if (o !== null && typeof o === 'object') {
    return Object.keys(o).sort().reduce((c, k) => ({...c, [k]: reorder(o[k])}), {});
  } else {
    return o;
  }
};

fromEvent(editor, 'input')
  .subscribe(() => {
    setValidationState('info', 'The JSON was edited. Unfocus the editor to have it formatted.');
  });

combineLatest(
  configuration,
  input
)
  .pipe(
    map(([configuration, input]) => ({configuration, input})),
    filter(({input}) => {
      if (/^\s*$/.test(input)) {
        editor.value = '';
        setValidationState('warning', 'The editor is empty');
        return false
      } else {
        return true;
      }
    }),
    filter(({input}) => {
      try {
        load(input, JSON_SCHEMA);
        setValidationState('success', 'This JSON is valid');
        return true;
      } catch(e) {
        setValidationState('danger', 'This JSON is invalid');
        return false;
      }
    }),
    map(({input, ...rest}) => ({ input: load(input, JSON_SCHEMA), ...rest })),
    switchMap(event => concat(of(PASSTHROUGH_ACTION), actionsOnValue).pipe(map(action => action(event)))),
    map(({configuration, input}) => {
      const {format, type, indentation} = configuration;
      if (type === 'json') {
        if (format === 'pretty') {
          return JSON.stringify(input, null, Array.from({length: indentation}).map(() => ' ').join(''))
        } else {
          return JSON.stringify(input);
        }
      } else {
        return dump(input, {indent: indentation, schema: JSON_SCHEMA, noRefs: true});
      }
    }),
    filter(value => value !== editor.value)
  )
  .subscribe(value => {
    editor.value = value;
  });

fromEvent(document.getElementById("reorder"), 'click')
  .pipe(
    tap(event => event.preventDefault())
  )
  .subscribe(() => {
    actionsOnValue.next(REORDER_ACTION);
  });

fromEvent(document.forms.editorForm, 'submit')
  .pipe(
    tap(event => event.preventDefault())
  )
  .subscribe(() => {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(editor.value);
    } else {
      editor.select();
      document.execCommand("copy");
    }
  });
