console.log("[background.js] Loaded");

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('exampro.net')) {
    console.log("[background.js] Exampro page loaded, injecting script");
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      console.log("[background.js] Content script injected successfully");
    }).catch(err => {
      console.error("[background.js] Error injecting content script:", err);
    });
  }
});
