let startTime = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle_timer") {
    chrome.storage.local.get(["timerRunning", "startTime"], (data) => {
      let isRunning = data.timerRunning || false;

      if (!isRunning) {
        startTime = Date.now();
        chrome.storage.local.set({ timerRunning: true, startTime });
        sendResponse({ status: "started" });
      } else {
        const duration = (Date.now() - data.startTime) / 1000;
        chrome.storage.local.get({ sessions: [] }, (storedData) => {
          const updatedSessions = [
            ...storedData.sessions,
            { time: new Date().toLocaleString(), duration },
          ];
          chrome.storage.local.set({
            sessions: updatedSessions,
            timerRunning: false,
          });

          sendResponse({ status: "stopped", duration });
        });
      }
    });
  }
  return true; // Keep async response active
});
chrome.action.setIcon({ path: "icons/icon48.png" });
