function* randomNumberGenerator(buffer) {
  while(true) {
    for(const byte of crypto.getRandomValues(buffer)) {
      yield Math.trunc(byte/16);
      yield byte%16;
    }
  }
}

function uuidV7Timestamp() {
  const unpaddedTimestamp = new Date().getTime().toString(16);
  const timestamp = ('000000000000' + unpaddedTimestamp).substring(unpaddedTimestamp.length);
  return `${timestamp.substring(0,8)}-${timestamp.substring(8)}`
}

const hexAlphabet = '0123456789abcdef';
const randomNumbers = randomNumberGenerator(new Uint8Array(256));
const hexDigitGenerators = {
  x: () => hexAlphabet[randomNumbers.next().value],
  y: () => hexAlphabet[randomNumbers.next().value % 4 + 8],
}

function withHexDigit(character) {
  return hexDigitGenerators[character]();
}

export const randomUUIDV4 = crypto.randomUUID
  ? (()=>crypto.randomUUID())
  : (()=>'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, withHexDigit))

export const randomUUIDV7 = (() => uuidV7Timestamp() + '-7xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, withHexDigit))
