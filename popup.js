const toggleButton = document.getElementById("toggle-timer");
const clearButton = document.getElementById("clear-sessions");
const statusText = document.getElementById("status");
const sessionList = document.getElementById("session-list");

// Global timer ID to ensure proper cleanup
let timerUpdateInterval = null;

// Array of productivity tips and hints
const hints = [
  { icon: "fa-lightbulb", text: "Try the Pomodoro technique: 25 minutes of focused work followed by a 5-minute break." },
  { icon: "fa-brain", text: "Taking regular breaks can improve your productivity and focus." },
  { icon: "fa-clock", text: "Track your time to identify patterns and optimize your workflow." },
  { icon: "fa-list-check", text: "Break large tasks into smaller, manageable chunks." },
  { icon: "fa-mug-hot", text: "Stay hydrated! Water helps maintain concentration and mental clarity." },
  { icon: "fa-heart", text: "Remember to stretch occasionally to reduce tension and improve circulation." },
  { icon: "fa-calendar", text: "Plan your most challenging tasks during your peak energy hours." },
  { icon: "fa-bell", text: "Set clear goals for each work session to stay focused." },
  { icon: "fa-ban", text: "Consider turning off notifications during focused work periods." },
  { icon: "fa-moon", text: "Ensure you get enough sleep for optimal cognitive performance." }
];

// Function to display a random hint with animation
function showRandomHint() {
  const randomHint = hints[Math.floor(Math.random() * hints.length)];
  
  // Create the hint element without triggering reflow/repaint yet
  const hintHTML = `
    <div class="hint-container">
      <i class="fas ${randomHint.icon} float"></i>
      <div class="hint-text">${randomHint.text}</div>
    </div>
  `;
  
  // First apply opacity 0 without using a transition
  statusText.style.transition = "none";
  statusText.style.opacity = "0";
  
  // Force a reflow/repaint before changing content
  void statusText.offsetWidth;
  
  // Update content while invisible
  statusText.innerHTML = hintHTML;
  
  // Then turn transition back on and fade in
  setTimeout(() => {
    statusText.style.transition = "opacity 0.3s ease";
    statusText.style.opacity = "1";
  }, 10);
}

// Function to format time nicely for display
function formatTime(seconds) {
  if (seconds < 1) {
    return "0:00";
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Function to update the timer display
function updateTimerDisplay() {
  chrome.storage.local.get(["timerRunning", "startTime"], (data) => {
    // Always reset the timer if timer is not running or no valid startTime
    if (!data.timerRunning || !data.startTime) {
      if (timerUpdateInterval) {
        clearInterval(timerUpdateInterval);
        timerUpdateInterval = null;
      }
      
      // Show a default state when timer is not running
      // Don't check or use any previous startTime
      showRandomHint();
      return;
    }
    
    // Double check we have a valid startTime that's not too old
    // This prevents using a stale startTime from storage
    const now = Date.now();
    const startTime = data.startTime;
    
    // If startTime is more than a day old, it's likely invalid
    if (now - startTime > 24 * 60 * 60 * 1000) {
      showRandomHint();
      return;
    }
    
    // Calculate elapsed time
    const elapsed = Math.floor((now - startTime) / 1000);
    
    // Get or create timer display without full reflow
    let valueSpan = statusText.querySelector('.timer-value');
    
    if (valueSpan) {
      // Just update the value part without recreating the entire element
      valueSpan.innerHTML = formatTime(elapsed);
    } else {
      // First time creating the display - do it once
      statusText.innerHTML = `
        <div class="timer-display">
          <i class="fas fa-stopwatch pulse"></i>
          <span class="timer-value">${formatTime(elapsed)}</span>
        </div>
      `;
    }
  });
}

// Function to start timer updates
function startTimerUpdates() {
  // Clear any existing interval first to prevent duplicates
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
    timerUpdateInterval = null;
  }
  
  // Initial update
  updateTimerDisplay();
  
  // Set up regular updates every 1 second
  timerUpdateInterval = setInterval(updateTimerDisplay, 1000);
}

// Function to update UI with smooth transitions
function updateUI(isRunning) {
  if (isRunning) {
    // Start timer updates first to ensure timer is shown immediately
    startTimerUpdates();
    
    // Then update UI elements
    toggleButton.innerHTML = '<i class="fas fa-stop"></i> Stop Timer';
    toggleButton.classList.add('timer-active');
    statusText.classList.add('timer-active');
  } else {
    // Clear any existing interval before showing hint
    if (timerUpdateInterval) {
      clearInterval(timerUpdateInterval);
      timerUpdateInterval = null;
    }
    
    toggleButton.innerHTML = '<i class="fas fa-play"></i> Start Timer';
    toggleButton.classList.remove('timer-active');
    statusText.classList.remove('timer-active');
    
    // Ensure timer display is completely cleared to avoid showing old values
    statusText.innerHTML = '';
    
    // Use a more controlled way to show hint with less flickering
    setTimeout(() => {
      showRandomHint();
    }, 50);
  }
}

// Load session history & timer state when popup opens
chrome.storage.local.get(["sessions", "timerRunning", "startTime", "timerHidden"], (data) => {
  sessionList.innerHTML = "";

  if (!data.sessions || data.sessions.length === 0) {
    sessionList.innerHTML = "<li>No sessions recorded yet</li>";
  } else {
    // Sort sessions by time (newest first)
    const sortedSessions = [...data.sessions].reverse();
    
    // Create all list items without adding them to DOM yet
    const fragment = document.createDocumentFragment();
    
    sortedSessions.forEach((session, index) => {
      const li = createSessionListItem(session);
      li.style.opacity = '0';
      li.style.transform = 'translateY(10px)';
      fragment.appendChild(li);
    });
    
    // Add all items to DOM at once to reduce reflow/repaint
    sessionList.appendChild(fragment);
    
    // Then trigger animations with staggered delay
    const items = sessionList.querySelectorAll('li');
    items.forEach((item, index) => {
      setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }, index * 50);
    });
  }

  // Ensure correct button text when popup opens
  updateUI(data.timerRunning);
  
  // Update the floating timer toggle button text
  updateFloatingButtonText();
});

// Helper function to create a session list item
function createSessionListItem(session) {
  const li = document.createElement("li");
  const formattedDuration = formatTime(session.duration);
  
  li.innerHTML = `
    <div class="session-item">
      <div class="session-time">
        <i class="fas fa-calendar-alt"></i> ${session.time}
      </div>
      <div class="session-duration">
        <i class="fas fa-clock"></i> ${formattedDuration}
      </div>
    </div>
  `;
  
  return li;
}

// Function to add session with improved fade-in effect
function addSessionToList(session) {
  // Remove "No sessions" message if it exists
  if (sessionList.innerHTML.includes("No sessions recorded yet")) {
    sessionList.innerHTML = "";
  }
  
  const li = createSessionListItem(session);
  li.style.opacity = '0';
  li.style.transform = 'translateY(10px)';
  
  // Use prepend to add the new session at the top
  sessionList.prepend(li);
  
  // Trigger entrance animation with slight delay for better effect
  // Use requestAnimationFrame for smoother animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      li.style.opacity = '1';
      li.style.transform = 'translateY(0)';
    });
  });
}

// Toggle timer on button click with improved feedback
toggleButton.addEventListener("click", () => {
  // Add button press animation
  toggleButton.classList.add('button-pressed');
  
  // First, immediately clear any displayed timer
  // This ensures no flicker of old time is visible
  if (statusText.querySelector('.timer-value')) {
    statusText.innerHTML = '';
  }
  
  // Then add transition effect
  statusText.style.transition = "opacity 0.3s ease";
  statusText.style.opacity = "0.7";
  
  setTimeout(() => {
    toggleButton.classList.remove('button-pressed');
    statusText.style.opacity = "1";
  }, 200);
  
  // Disable button temporarily to prevent multiple clicks
  toggleButton.disabled = true;
  
  chrome.runtime.sendMessage({ 
    action: "toggle_timer",
    source: "popup" // Indicate timer was toggled from popup
  }, (response) => {
    // Re-enable button
    toggleButton.disabled = false;
    
    if (response && response.status === "started") {
      // Ensure any previous timer display is completely gone
      statusText.innerHTML = '';
      
      // Wait a moment before updating UI to ensure clean state
      setTimeout(() => {
        updateUI(true);
      }, 50);
    } else if (response && response.status === "stopped") {
      updateUI(false);
      
      if (response.duration) {
        const newSession = {
          time: new Date().toLocaleString(),
          duration: response.duration,
        };
        addSessionToList(newSession);
      }
    }
  });
});

// Ensure button text updates when switching tabs
chrome.storage.onChanged.addListener((changes) => {
  if (changes.timerRunning) {
    chrome.storage.local.get(["timerRunning"], (data) => {
      updateUI(data.timerRunning);
    });
  }
});

// Clear session history with improved animation
clearButton.addEventListener("click", () => {
  // Add confirmation animation
  clearButton.innerHTML = '<i class="fas fa-check"></i> Cleared!';
  clearButton.style.background = 'var(--success-color)';
  
  // Add ripple effect
  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.background = 'rgba(255, 255, 255, 0.7)';
  ripple.style.borderRadius = '50%';
  ripple.style.pointerEvents = 'none';
  ripple.style.width = '100px';
  ripple.style.height = '100px';
  ripple.style.transform = 'translate(-50%, -50%) scale(0)';
  ripple.style.animation = 'ripple 0.8s linear';
  clearButton.appendChild(ripple);
  
  // Add the ripple animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      to {
        transform: translate(-50%, -50%) scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Fade out all session items with staggered delay
  const items = sessionList.querySelectorAll('li');
  items.forEach((item, index) => {
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';
    }, index * 50);
  });
  
  // Clear after animation
  setTimeout(() => {
    chrome.storage.local.set({ sessions: [] }, () => {
      sessionList.innerHTML = "<li>No sessions recorded yet</li>";
      
      // Reset button after 1 second
      setTimeout(() => {
        clearButton.innerHTML = '<i class="fas fa-trash-alt"></i> Clear Sessions';
        clearButton.style.background = '';
        if (ripple) ripple.remove();
      }, 1000);
    });
  }, items.length * 50 + 300);
});

// Clean up interval when popup closes
window.addEventListener('unload', () => {
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
  }
});

// Add a button to open a standalone timer window
// Place this code at the end of popup.js, before the final window.addEventListener

// Create the standalone window button
const standaloneButton = document.createElement('button');
standaloneButton.id = 'standalone-timer';
standaloneButton.innerHTML = '<i class="fas fa-external-link-alt"></i> Open Standalone Timer';
standaloneButton.style.marginTop = '12px';
standaloneButton.style.background = 'rgba(255, 255, 255, 0.15)';

// Add it to the document after the clear sessions button
const clearButtonParent = clearButton.parentNode;
clearButtonParent.insertBefore(standaloneButton, clearButton.nextSibling);

// Create the toggle floating timer button
const toggleFloatingButton = document.createElement('button');
toggleFloatingButton.id = 'toggle-floating';
toggleFloatingButton.style.marginTop = '12px';
toggleFloatingButton.style.background = 'rgba(255, 255, 255, 0.15)';

// Add it to the document after the standalone timer button
clearButtonParent.insertBefore(toggleFloatingButton, standaloneButton.nextSibling);

// Update floating button text based on current visibility state
function updateFloatingButtonText() {
  chrome.storage.local.get(['timerHidden'], (data) => {
    if (data.timerHidden) {
      toggleFloatingButton.innerHTML = '<i class="fas fa-eye"></i> Show Floating Timer';
    } else {
      toggleFloatingButton.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Floating Timer';
    }
  });
}

// Initialize the button text
updateFloatingButtonText();

// Add click event listener for toggle floating button
toggleFloatingButton.addEventListener('click', () => {
  // Add ripple effect for button feedback
  toggleFloatingButton.classList.add('button-pressed');
  
  // Create ripple animation
  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.background = 'rgba(255, 255, 255, 0.7)';
  ripple.style.borderRadius = '50%';
  ripple.style.pointerEvents = 'none';
  ripple.style.width = '100px';
  ripple.style.height = '100px';
  ripple.style.transform = 'translate(-50%, -50%) scale(0)';
  ripple.style.animation = 'ripple 0.8s linear';
  toggleFloatingButton.appendChild(ripple);
  
  // Toggle the timer visibility
  chrome.storage.local.get(['timerHidden'], (data) => {
    const newState = !data.timerHidden;
    chrome.storage.local.set({ 'timerHidden': newState }, () => {
      // Send message to show/hide timer in all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (newState) {
            // Hide the timer
            chrome.tabs.sendMessage(tab.id, { action: 'update_timer', isRunning: true, startTime: null }).catch(() => {});
          } else {
            // Show the timer
            chrome.tabs.sendMessage(tab.id, { action: 'show_timer' }).catch(() => {});
          }
        });
      });
      
      // Update button text
      updateFloatingButtonText();
    });
  });
  
  // Reset button
  setTimeout(() => {
    toggleFloatingButton.classList.remove('button-pressed');
    if (ripple) ripple.remove();
  }, 300);
});

// Add click event listener for standalone button
standaloneButton.addEventListener('click', () => {
  // Add ripple effect for button feedback
  standaloneButton.classList.add('button-pressed');
  
  // Create ripple animation
  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.background = 'rgba(255, 255, 255, 0.7)';
  ripple.style.borderRadius = '50%';
  ripple.style.pointerEvents = 'none';
  ripple.style.width = '100px';
  ripple.style.height = '100px';
  ripple.style.transform = 'translate(-50%, -50%) scale(0)';
  ripple.style.animation = 'ripple 0.8s linear';
  standaloneButton.appendChild(ripple);
  
  // Open standalone window with larger dimensions for Apple-style design
  chrome.windows.create({
    url: chrome.runtime.getURL('standalone.html'),
    type: 'popup',
    width: 800,
    height: 600
  });
  
  // Reset button
  setTimeout(() => {
    standaloneButton.classList.remove('button-pressed');
    if (ripple) ripple.remove();
  }, 300);
});
