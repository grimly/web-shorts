const listeners = [];

function addEncoding({label, encode, decode}) {
  const encodingId = listeners.length;
  const template = document.createElement("template");
  const helperText = decode === undefined ? `Place your content on other fields and find your ${label} hash here` : `Place your ${label} here`;
  template.innerHTML = `
    <form id="encoding${encodingId}" class="col d-flex flex-column">
      <label for="encoding${encodingId}Area" class="pb-1">${label}</label>
      <textarea id="encoding${encodingId}Area"
                ${decode === undefined ? `readonly` : ""}
                name="area"
                class="form-control flex-grow-1"
                style="font-family: SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; overflow-y: auto"
                placeholder="${helperText}"
                aria-describedby="encoding${encodingId}HelpBlock"></textarea>
      <small id="encoding${encodingId}HelpBlock" class="form-text text-muted mb-2">
        ${helperText}.
      </small>
      <div class="d-flex align-items-center">
        <span class="badge badge-info badge-prepend-square" id="encoding${encodingId}Validation">Getting prepared</span>
        <button class="ms-auto btn btn-primary" id="encoding${encodingId}CopyAction">
          Copy
        </button>
      </div>
    </form>
  `;
  const block = template.content.cloneNode(true);
  const [area, badge, copy, form] = ["Area", "Validation", "CopyAction", ""].map(suffix => block.getElementById(`encoding${encodingId}${suffix}`));

  copy.addEventListener('click', event => {
    event.preventDefault();
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(area.value);
    } else {
      area.select();
      document.execCommand("copy");
    }
  });

  let lastState = "badge-info";
  function setValidation(state, message) {
    const newState = `text-bg-${state}`;
    if (newState !== lastState) {
      badge.classList.remove(lastState);
      badge.classList.add(newState);
      lastState = newState;
    }
    badge.textContent = message;
  }

  let encodingRound = 0;
  listeners.push(({value, source}) => {
    if (source === encodingId) return;
    const currentEncodingRound = ++encodingRound;
    try {
      const encoded = encode(value);
      if (typeof encoded === "string") {
        area.value = encoded;
        setValidation("success", `Successfully encoded`);
      } else {
        setValidation("info", `In progress...`);
        encoded.then(
          ok => {
            if (currentEncodingRound === encodingRound) {
              area.value = ok;
              setValidation("success", `Successfully encoded`);
            }
          },
          err => {
            if (currentEncodingRound === encodingRound) {
              console.error(err);
              setValidation("warning", "An error occured from encoding. The previous content is unchanged")
            }
          }
        )
      }
    } catch (e) {
      console.error(e);
      setValidation("warning", "An error occured from encoding. The previous content is unchanged")
    }
  });

  function runDecoder() {
    try {
      const value = decode(area.value.trim());
      setValidation("success", "Successfully decoded")
      listeners.forEach(listener => listener({value, source: encodingId}));
    } catch (e) {
      console.error(`Decoding error (from ${label})`, e);
      setValidation("warning", "An error occured from decoding. Other content are unchanged")
    }
  }

  if (decode !== undefined) {
    area.addEventListener("input", () => setValidation('info', 'The text was edited. Unfocus the area to have it processed.'));

    area.addEventListener("blur", runDecoder);
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (decode !== undefined) {
      runDecoder();
    }
  });
  
  document
    .getElementById("encodings")
    .appendChild(block);

  setValidation("success", "Ready");
}

addEncoding({
  label: "Plain text",
  encode: v => v,
  decode: v => v
});

addEncoding({
  label: "Base64",
  encode: v => bytesToB64(new TextEncoder().encode(v)),
  decode: v => new TextDecoder().decode(b64toBytes(v)),
});

addEncoding({
  label: "Base64Url",
  encode: v => bytesToB64(new TextEncoder().encode(v)).replace(/\//g, '_').replace(/\+/g, '-'),
  decode: v => new TextDecoder().decode(v.replace(/_/g, "/").replace(/-/g, "+")),
});

function lpad(s, l) {
  const full = "0".repeat(l) + s;
  return full.substring(full.length - l);
}

addEncoding({
  label: "Hexadecimal dump",
  encode: v => bytesToHex(new TextEncoder().encode(v)),
  decode: v => {
    const noSpaces = v.replace(/\s/g, '');
    console.log(noSpaces);
    if (! /^(?:[a-fA-F\d]{2})+$/.test(noSpaces)) {
      throw new Error("Invalid hex dump : " + v);
    }
    const bytes = [];
    let high = "";
    let isHigh = true;
    for (let c of noSpaces) {
      if (isHigh) {
        high = c;
      } else {
        bytes.push(Number.parseInt(high+c, 16));
      }
      isHigh = !isHigh;
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  },
});

addEncoding({
  label: "Byte array",
  encode: v => `[${[...new TextEncoder().encode(v)].map(String).join(', ')}]`,
  decode: v => {
    const bytes = JSON.parse(v);
    if (! Array.isArray(bytes) || bytes.some(b => typeof b !== "number" || b < 0 || b > 255)) {
      throw new Error("Invalid byte array : " + v);
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  },
});

/**
 * @param {Uint8Array} bytes 
 * @returns {string}
 */
function bytesToHex(bytes, separator = " ") {
  return [...bytes]
    .map(n => lpad(n.toString(16), 2))
    .join(separator)
}

const b64alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function firstCharPadding(rem) { return b64alphabet[rem] + "=="; };
function secondCharPadding(rem) { return b64alphabet[rem] + "="; };
function thirdCharPadding() { return ""; };

/**
 * @param {Uint8Array} bytes 
 * @returns {string}
 */
function bytesToB64(bytes) {
  const {col, rem, pad} = [...bytes]
    .reduce(
      ({col, rem}, n, i) => {
        switch (i%3) {
          case 0: // NNNNNN NN---- ------ ------
            col.push(b64alphabet[Math.floor(n / 4)]);
            return {col, rem: (n % 4) * 16, pad: firstCharPadding};
          case 1: // OOOOOO OONNNN NNNN-- ------
            col.push(b64alphabet[Math.floor(rem + n / 16)]);
            return {col, rem: (n % 16) * 4, pad: secondCharPadding};
          case 2: // OOOOOO OOOOOO OOOONN NNNNNN
            col.push(b64alphabet[Math.floor(rem + n / 64)]);
            col.push(b64alphabet[n % 64]);
            return {col, rem: 0, pad: thirdCharPadding};
        }
      },
      {col: [], rem: 0, pad: thirdCharPadding},
    )
  return col.join('') + pad(rem);
}

const b64reverseMapping = Object.fromEntries([...b64alphabet].map((char, index) => [char, index]));

function bits(n) {
  const s = '00000000'+n.toString(2);
  return s.substring(s.length - 8);
}

/**
 * @param {string} b64 The b64 string to decode
 * @returns {Uint8Array} Decoded bytes
 */
function b64toBytes(b64) {
  /** @type {number[]} */
  const bytes = []; 
  const codes = [...b64]
    .map(c => b64reverseMapping[c])
    .filter(c => c !== undefined);
  codes.forEach((code, index) => {
    switch (index%4) {
      case 0: // NNNNNN-- -------- --------
        bytes.push(code * 4);
        break;
      case 1: // OOOOOONN NNNN---- --------
        bytes[bytes.length - 1] += Math.floor(code / 16);
        bytes.push((code%16)*16);
        break;
      case 2: // OOOOOOOO OOOONNNN NN------
        bytes[bytes.length - 1] += Math.floor(code / 4);
        bytes.push((code%4)*64);
        break;
      case 3: // OOOOOOOO OOOOOOOO OONNNNNN
        bytes[bytes.length - 1] += code;
        break;
    }
  });
  if (codes.length % 4 !== 0) {
    bytes.pop();
  }
  return new Uint8Array(bytes);
}

["SHA-1", "SHA-256"].forEach(algorithm => {
  addEncoding({
    label: `${algorithm} - Hex`,
    encode: async v => bytesToHex(new Uint8Array(await crypto.subtle.digest(algorithm, new TextEncoder().encode(v))), ""),
  });
  addEncoding({
    label: `${algorithm} - Base64`,
    encode: async v => bytesToB64(new Uint8Array(await crypto.subtle.digest(algorithm, new TextEncoder().encode(v)))),
  });
});
