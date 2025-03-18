// Create a floating clock element
let updateInterval = null;
let userHidTimer = false; // Flag to track if user manually hid the timer

// Add console logging for debugging
// console.log("Session Timer Extension: Content script loaded");

// Create a simpler, more reliable floating timer
function createSimpleTimer() {
  // Remove old timer if exists
  const oldTimer = document.getElementById('simple-session-timer');
  if (oldTimer) {
    oldTimer.remove();
  }
  
  // Create simple docked timer
  const timerElement = document.createElement('div');
  timerElement.id = 'simple-session-timer';
  
  // Style as a docked bar
  timerElement.style.position = 'fixed';
  timerElement.style.bottom = '0';
  timerElement.style.left = '50%';
  timerElement.style.transform = 'translateX(-50%)';
  timerElement.style.backgroundColor = 'rgba(25, 33, 60, 0.95)';
  timerElement.style.color = 'white';
  timerElement.style.padding = '8px 16px';
  timerElement.style.borderRadius = '8px 8px 0 0';
  timerElement.style.fontFamily = '"Segoe UI", Roboto, sans-serif';
  timerElement.style.fontSize = '14px';
  timerElement.style.fontWeight = 'bold';
  timerElement.style.zIndex = '9999';
  timerElement.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.2)';
  timerElement.style.display = 'flex';
  timerElement.style.alignItems = 'center';
  timerElement.style.gap = '8px';
  timerElement.style.userSelect = 'none';
  timerElement.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  timerElement.style.borderBottom = 'none';
  
  // Add content
  timerElement.innerHTML = `
    <span style="display: flex; align-items: center;">⏱️</span>
    <span class="timer-value">0:00</span>
    <button class="timer-close" title="Hide timer (session will continue)" style="margin-left: 8px; background: #666; border: none; color: white; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px;">×</button>
  `;
  
  // Add event listener for close button
  const closeBtn = timerElement.querySelector('.timer-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Just hide the timer instead of stopping the session
      userHidTimer = true;
      chrome.storage.local.set({ 'timerHidden': true });
      hideSimpleTimer();
    });
  }
  
  // Append to document
  document.body.appendChild(timerElement);
  
  return timerElement;
}

// Function to update the simple timer
function updateSimpleTimer(startTime) {
  const timerElement = document.getElementById('simple-session-timer');
  if (!timerElement || !startTime) return;
  
  const elapsed = (Date.now() - startTime) / 1000;
  const totalSeconds = Math.floor(elapsed);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  // Format time
  let formattedTime;
  if (hours > 0) {
    formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Update the timer value
  const valueElement = timerElement.querySelector('.timer-value');
  if (valueElement) {
    valueElement.textContent = formattedTime;
  }
}

// Show simple timer
function showSimpleTimer() {
  // Check if user has manually hidden the timer
  chrome.storage.local.get(['timerHidden'], (data) => {
    if (data.timerHidden === true) {
      userHidTimer = true;
      return; // Don't show if user has hidden it
    }
    
    const timerElement = document.getElementById('simple-session-timer');
    if (timerElement) {
      timerElement.style.display = 'flex';
    } else {
      createSimpleTimer();
    }
  });
}

// Hide simple timer
function hideSimpleTimer() {
  const timerElement = document.getElementById('simple-session-timer');
  if (timerElement) {
    timerElement.style.display = 'none';
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  // console.log("Session Timer: Received message", message);
  
  if (message.action === 'update_timer') {
    if (message.isRunning && message.startTime) {
      // console.log("Timer is running with startTime:", message.startTime);
      
      // Check if timer was started from standalone window
      if (message.fromStandalone) {
        // console.log("Timer started from standalone window, hiding floating timer");
        userHidTimer = true;
        chrome.storage.local.set({ 'timerHidden': true });
      }
      
      // Start timer updates even if the timer is hidden
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      
      // Create timer but only show if not manually hidden
      const simpleTimer = document.getElementById('simple-session-timer') || createSimpleTimer();
      if (!userHidTimer) {
        showSimpleTimer();
      }
      
      updateSimpleTimer(message.startTime);
      updateInterval = setInterval(() => {
        updateSimpleTimer(message.startTime);
      }, 1000);
      
    } else {
      // console.log("Timer is stopped");
      // Hide the timer
      hideSimpleTimer();
      
      // Reset the user hidden flag when timer is stopped
      userHidTimer = false;
      chrome.storage.local.set({ 'timerHidden': false });
      
      // Clear interval
      if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
      }
    }
  } else if (message.action === 'show_timer') {
    // Add ability to show timer on demand
    userHidTimer = false;
    chrome.storage.local.set({ 'timerHidden': false });
    showSimpleTimer();
  }
});

// Check timer status when page loads
// console.log("Checking timer status on page load");
chrome.storage.local.get(['timerRunning', 'startTime', 'timerHidden'], (data) => {
  // console.log("Timer status on page load:", data);
  
  // Set the user hidden flag based on storage
  userHidTimer = data.timerHidden === true;
  
  if (data.timerRunning && data.startTime) {
    // console.log("Timer is running, creating and showing timer");
    
    // Create timer but only show if not manually hidden
    const simpleTimer = document.getElementById('simple-session-timer') || createSimpleTimer();
    if (!userHidTimer) {
      showSimpleTimer();
    }
    
    // Start updates
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    
    updateSimpleTimer(data.startTime);
    updateInterval = setInterval(() => {
      updateSimpleTimer(data.startTime);
    }, 1000);
  } else {
    // console.log("Timer is not running");
    hideSimpleTimer();
  }
});

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});