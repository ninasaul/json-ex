/**
 * One-time copy from JsonEx-era keys to SIDEFMT keys so updates do not wipe prefs/history.
 */
const KEY_PAIRS: [string, string][] = [
  ['sidefmt-theme', 'jsonex-theme'],
  ['sidefmt-lang', 'jsonex-lang'],
  ['sidefmt-history', 'jsonex-history'],
  ['sidefmt-history-diff', 'jsonex-history-diff'],
  ['sidefmt-settings', 'jsonex-settings'],
  ['sidefmt-markdown-preview-style', 'jsonex-markdown-preview-style'],
  ['sidefmt-markdown-draft', 'jsonex-markdown-draft'],
]

export function migrateLegacyLocalStorage(): void {
  try {
    for (const [next, prev] of KEY_PAIRS) {
      if (localStorage.getItem(next) != null) continue
      const v = localStorage.getItem(prev)
      if (v == null) continue
      localStorage.setItem(next, v)
      localStorage.removeItem(prev)
    }
  } catch {
    // ignore quota / private mode
  }
}
