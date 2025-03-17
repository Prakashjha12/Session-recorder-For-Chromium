// Additional script for updating the circular progress bar
const progressElement = document.getElementById('timer-progress');
// Using the playIcon variable that was already declared in standalone.js
// const playIcon = document.getElementById('play-icon');
let maxDuration = 60 * 60; // Default 1 hour as the visual duration for a full circle

// Override the original updateTimerDisplay function
const originalUpdateTimerDisplay = window.updateTimerDisplay;
window.updateTimerDisplay = function() {
  // Call the original function
  originalUpdateTimerDisplay();
  
  // Get current timer status
  chrome.storage.local.get(["timerRunning", "startTime"], (data) => {
    if (data.timerRunning && data.startTime) {
      const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
      const progress = Math.min(elapsed / maxDuration, 1);
      
      // Update progress circle
      progressElement.style.background = `conic-gradient(var(--accent-color) ${progress * 360}deg, transparent ${progress * 360}deg)`;
      
      // Update button icon - playIcon is already declared in standalone.js
      playIcon.classList.remove('fa-play');
      playIcon.classList.add('fa-stop');
    } else {
      // Reset progress circle
      progressElement.style.background = 'conic-gradient(var(--accent-color) 0deg, transparent 0deg)';
      
      // Update button icon - playIcon is already declared in standalone.js
      playIcon.classList.remove('fa-stop');
      playIcon.classList.add('fa-play');
    }
  });
}; 