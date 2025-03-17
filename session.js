chrome.storage.local.get({ sessions: [] }, (data) => {
  const sessionList = document.getElementById("session-list");
  sessionList.innerHTML = ""; // Clear existing content

  if (data.sessions.length === 0) {
    sessionList.innerHTML = "<li>No sessions recorded.</li>";
  } else {
    data.sessions.forEach((session) => {
      const li = document.createElement("li");
      li.textContent = `Date: ${
        session.time
      }, Duration: ${session.duration.toFixed(2)} seconds`;
      sessionList.appendChild(li);
    });
  }
});
