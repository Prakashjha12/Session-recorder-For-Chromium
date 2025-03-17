const toggleButton = document.getElementById("toggle-timer");
const clearButton = document.getElementById("clear-sessions");
const statusText = document.getElementById("status");
const sessionList = document.getElementById("session-list");

// Function to update UI
function updateUI(isRunning, startTime) {
  if (isRunning) {
    toggleButton.textContent = "Stop Timer";
    updateElapsedTime(startTime);
  } else {
    toggleButton.textContent = "Start Timer";
    statusText.innerHTML = "";
  }
}

// Function to update elapsed time in real-time
function updateElapsedTime(startTime) {
  function update() {
    chrome.storage.local.get(["timerRunning", "startTime"], (data) => {
      if (!data.timerRunning) return; // Stop updating if timer is off

      const elapsed = ((Date.now() - data.startTime) / 1000).toFixed(2);
      statusText.innerHTML = `⏳ Timer running: ${elapsed} sec`;

      requestAnimationFrame(update); // Keep updating
    });
  }
  update();
}

// Load session history & timer state when popup opens
chrome.storage.local.get(["sessions", "timerRunning", "startTime"], (data) => {
  sessionList.innerHTML = "";

  if (!data.sessions || data.sessions.length === 0) {
    sessionList.innerHTML = "<li>No sessions recorded.</li>";
  } else {
    data.sessions.forEach((session) => addSessionToList(session));
  }

  // 🔥 Fix: Ensure correct button text when popup opens
  updateUI(data.timerRunning, data.startTime);
});

// Toggle timer on button click
toggleButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "toggle_timer" }, (response) => {
    if (response.status === "started") {
      chrome.storage.local.get("startTime", (data) => {
        updateUI(true, data.startTime);
      });
    } else if (response.status === "stopped") {
      updateUI(false);
      const newSession = {
        time: new Date().toLocaleString(),
        duration: response.duration,
      };
      addSessionToList(newSession);
    }
  });
});

// 🔥 Fix: Ensure button text updates when switching tabs
chrome.storage.onChanged.addListener((changes) => {
  if (changes.timerRunning || changes.startTime) {
    chrome.storage.local.get(["timerRunning", "startTime"], (data) => {
      updateUI(data.timerRunning, data.startTime);
    });
  }
});

// Clear session history
clearButton.addEventListener("click", () => {
  chrome.storage.local.set({ sessions: [] }, () => {
    sessionList.innerHTML = "<li>No sessions recorded.</li>";
  });
});

// Function to add session with fade-in effect
function addSessionToList(session) {
  const li = document.createElement("li");
  li.textContent = `📅 ${session.time} - ⏱️ ${session.duration.toFixed(2)} sec`;
  sessionList.prepend(li);
}
