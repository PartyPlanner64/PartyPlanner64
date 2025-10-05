let $$debug = false; // see settings.jsx for real value

/** Returns whether debug behaviors are enabled. */
export function isDebug(): boolean {
  return $$debug;
}

export function setDebug(on: boolean | undefined): void {
  $$debug = !!on;
}
