// Marks a sign out as intentional so AuthWatcher does not treat it as an expired session.
// sessionStorage can throw (private windows, blocked storage), so every access is guarded.
const KEY = 'compass:intentional-signout'

export function markIntentionalSignOut() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // ignore: worst case the user sees the expired notice after signing out
  }
}

/** Returns true once if the flag was set, and clears it. */
export function consumeIntentionalSignOut(): boolean {
  try {
    const set = sessionStorage.getItem(KEY) === '1'
    sessionStorage.removeItem(KEY)
    return set
  } catch {
    return false
  }
}
