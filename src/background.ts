// Ensure the extension entry opens in Chrome Side Panel.
async function enableSidePanelBehavior() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } catch (error) {
    console.error('Failed to enable side panel behavior', error)
  }
}

void enableSidePanelBehavior()

chrome.runtime.onInstalled.addListener(() => {
  void enableSidePanelBehavior()
})

chrome.runtime.onStartup.addListener(() => {
  void enableSidePanelBehavior()
})
