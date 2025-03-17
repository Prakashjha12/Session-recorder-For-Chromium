const toggleButton = document.getElementById('toggle-timer');
const timerValue = document.getElementById('timer-value');
const playIcon = document.getElementById('play-icon');
let timerUpdateInterval = null;

// Function to format time nicely for display
function formatTime(seconds) {
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
    if (!data.timerRunning || !data.startTime) {
      if (timerUpdateInterval) {
        clearInterval(timerUpdateInterval);
        timerUpdateInterval = null;
      }
      
      timerValue.textContent = "0:00";
      
      // Update play/pause icon
      playIcon.classList.remove('fa-stop');
      playIcon.classList.add('fa-play');
      
      return;
    }
    
    const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
    timerValue.textContent = formatTime(elapsed);
    
    // Update play/pause icon
    playIcon.classList.remove('fa-play');
    playIcon.classList.add('fa-stop');
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

// Toggle timer on button click with animation
toggleButton.addEventListener("click", () => {
  // Add button press animation
  toggleButton.style.transform = 'scale(0.95)';
  setTimeout(() => {
    toggleButton.style.transform = '';
  }, 150);
  
  // Send message to toggle timer, including source information
  chrome.runtime.sendMessage({ 
    action: "toggle_timer",
    source: "standalone" // Indicate timer was toggled from standalone window
  }, (response) => {
    if (response && response.status === "started") {
      startTimerUpdates();
      
      // When started from standalone, automatically hide floating timer
      chrome.storage.local.set({ 'timerHidden': true });
    } else if (response && response.status === "stopped") {
      updateTimerDisplay();
    }
  });
});

// Check timer status when window opens
chrome.storage.local.get(["timerRunning", "startTime"], (data) => {
  if (data.timerRunning) {
    startTimerUpdates();
  } else {
    updateTimerDisplay();
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.timerRunning) {
    updateTimerDisplay();
  }
});

// Clean up interval when window closes
window.addEventListener('unload', () => {
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
  }
}); 