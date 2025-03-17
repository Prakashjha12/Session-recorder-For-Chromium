// Reset initial state
let startTime = null;
let badgeUpdateInterval = null;

// Function to notify all tabs about timer state
function notifyAllTabs(isRunning, startTime, fromStandalone) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'update_timer',
        isRunning: isRunning,
        startTime: startTime,
        fromStandalone: fromStandalone
      }).catch(() => {
        // Ignore errors for tabs that don't have the content script loaded
      });
    });
  });
}

// Update the badge on the extension icon
function updateBadge(isRunning, startTime) {
  if (isRunning && startTime) {
    // Set badge background color
    chrome.action.setBadgeBackgroundColor({ color: '#4361ee' });
    
    // Update badge text with elapsed minutes
    const updateBadgeText = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      chrome.action.setBadgeText({ text: minutes.toString() });
    };
    
    // Initial update
    updateBadgeText();
    
    // Clear any existing interval
    if (badgeUpdateInterval) {
      clearInterval(badgeUpdateInterval);
    }
    
    // Set up interval to update every 15 seconds
    badgeUpdateInterval = setInterval(updateBadgeText, 15000);
  } else {
    // Clear badge when timer is not running
    chrome.action.setBadgeText({ text: '' });
    
    // Clear any existing interval
    if (badgeUpdateInterval) {
      clearInterval(badgeUpdateInterval);
      badgeUpdateInterval = null;
    }
  }
}

// Create or update a notification with timer info
function updateTimerNotification(isRunning, startTime) {
  if (isRunning && startTime) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    let timeDisplay;
    if (hours > 0) {
      timeDisplay = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      timeDisplay = `${minutes}m ${seconds}s`;
    }
    
    try {
      // Create notification without relying on the iconUrl
      chrome.notifications.create('session-timer-notification', {
        type: 'basic',
        // Use a simpler approach that doesn't rely on runtime.getURL
        iconUrl: 'icons/icon48.png',
        title: 'Session Timer Running',
        message: `Elapsed time: ${timeDisplay}`,
        priority: 1,
        silent: true
      });
    } catch (error) {
      console.error('Notification error:', error);
    }
  } else {
    // Clear notification
    chrome.notifications.clear('session-timer-notification');
  }
}

// Set up alarm for periodic notifications
function setupNotificationAlarm(isRunning) {
  // Clear any existing alarm
  chrome.alarms.clear('timer-notification');
  
  if (isRunning) {
    // Create alarm to fire every minute
    chrome.alarms.create('timer-notification', {
      periodInMinutes: 1
    });
  }
}

// Reset timer state on extension startup
chrome.runtime.onStartup.addListener(() => {
  resetTimerState();
});

// Also reset timer state when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  resetTimerState();
});

// Function to completely reset the timer state
function resetTimerState() {
  // Reset global variable
  startTime = null;
  
  // Update badge
  updateBadge(false, null);
  
  // Clear notification
  updateTimerNotification(false, null);
  
  // Cancel alarm
  setupNotificationAlarm(false);
  
  // Reset storage
  chrome.storage.local.set({ 
    timerRunning: false,
    startTime: null
  });
  
  // Notify all tabs that timer is reset
  notifyAllTabs(false, null, false);
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'timer-notification') {
    chrome.storage.local.get(['timerRunning', 'startTime'], (data) => {
      if (data.timerRunning && data.startTime) {
        updateTimerNotification(true, data.startTime);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle_timer") {
    chrome.storage.local.get(["timerRunning"], (data) => {
      let isRunning = data.timerRunning || false;

      if (!isRunning) {
        // First, ensure any previous state is completely cleared
        resetTimerState();
        
        // Wait a moment to ensure reset is complete
        setTimeout(() => {
          // Start a completely new timer with fresh start time
          const newStartTime = Date.now();
          
          // Check if timer was started from standalone window
          const fromStandalone = message.source === "standalone";
          
          // If started from standalone, set timerHidden to true
          if (fromStandalone) {
            chrome.storage.local.set({ 'timerHidden': true });
          }
          
          // Set new timer state
          chrome.storage.local.set({ 
            timerRunning: true, 
            startTime: newStartTime,
            // Store the source information
            timerSource: message.source || "popup"
          }, () => {
            // Update the global variable
            startTime = newStartTime;
            
            // Update badge
            updateBadge(true, newStartTime);
            
            // Create notification
            updateTimerNotification(true, newStartTime);
            
            // Set up notification alarm
            setupNotificationAlarm(true);
            
            // Notify all tabs that timer has started with the new time
            // Include source information
            notifyAllTabs(true, newStartTime, fromStandalone);
            sendResponse({ status: "started" });
          });
        }, 50);
      } else {
        // Get the current startTime to calculate duration
        chrome.storage.local.get(["startTime"], (timeData) => {
          // Use the most accurate startTime available
          const currentStartTime = timeData.startTime || startTime;
          
          // Calculate duration based on stored start time
          const duration = currentStartTime ? Math.floor((Date.now() - currentStartTime) / 1000) : 0;
          
          chrome.storage.local.get({ sessions: [] }, (storedData) => {
            const updatedSessions = [
              ...storedData.sessions,
              { time: new Date().toLocaleString(), duration },
            ];
            
            // Completely reset timer state
            startTime = null;
            
            // Update badge
            updateBadge(false, null);
            
            // Clear notification
            updateTimerNotification(false, null);
            
            // Cancel alarm
            setupNotificationAlarm(false);
            
            // Clear timer state completely in storage
            chrome.storage.local.set({
              sessions: updatedSessions,
              timerRunning: false,
              startTime: null,  // This ensures the startTime is cleared
              timerSource: null // Clear the source too
            }, () => {
              // Explicitly set startTime to null when notifying tabs (full reset)
              notifyAllTabs(false, null, false);
              sendResponse({ status: "stopped", duration });
            });
          });
        });
      }
    });
  }
  return true; // Keep async response active
});

// Listen for tab updates to inject content script into new tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    chrome.storage.local.get(['timerRunning', 'startTime'], (data) => {
      if (data.timerRunning && data.startTime) {
        chrome.tabs.sendMessage(tabId, {
          action: 'update_timer',
          isRunning: true,
          startTime: data.startTime
        }).catch(() => {
          // Ignore errors for tabs that don't have the content script loaded yet
        });
      } else {
        // Make sure to send reset message if timer is not running
        chrome.tabs.sendMessage(tabId, {
          action: 'update_timer',
          isRunning: false,
          startTime: null
        }).catch(() => {
          // Ignore errors for tabs that don't have the content script loaded yet
        });
      }
    });
  }
});

// Show notification when timer starts (for testing)
chrome.storage.local.get(['timerRunning', 'startTime'], (data) => {
  if (data.timerRunning && data.startTime) {
    // Update badge
    updateBadge(true, data.startTime);
    
    // Update notification
    updateTimerNotification(true, data.startTime);
    
    // Set up notification alarm
    setupNotificationAlarm(true);
  }
});
