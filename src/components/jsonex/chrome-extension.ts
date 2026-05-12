export function chromeExtensionWindowApiAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    Boolean(chrome.runtime.id) &&
    typeof chrome.windows !== 'undefined' &&
    typeof chrome.windows.create === 'function'
  )
}
