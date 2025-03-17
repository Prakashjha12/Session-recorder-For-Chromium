# Chrome Extension - Session Timer

## 📌 Overview
This is a **Chrome Extension** that tracks session time when activated, allows users to view recent sessions, and includes a floating session timer visible across all tabs.. It includes a timer feature that starts when activated, logs session times, and displays a floating session tracker.

## 🔥 Features
- ⏳ Start and stop a session timer.
- 📊 View recent session history.
- 📌 Floating timer visible across all tabs.
- 🎨 Modern and minimal UI.

## 🚀 Installation
### **For Development (Unpacked Extension)**
1. Download or clone this repository:
   ```bash
   git clone https://github.com/Prakashjha12/your-extension.git
   ```
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (toggle in the top right corner).
4. Click **Load unpacked** and select the extension folder.
5. The extension is now installed!

### **For Packaged Installation (.crx File)**
1. Navigate to `chrome://extensions/`.
2. Drag and drop the `.crx` file into the page.
3. If prompted, confirm the installation.

## ⚡ How to Use
1. Click on the extension icon to start a session.
2. The floating timer appears across tabs.
3. Open the history page to view past sessions.
4. Customize settings for better tracking.

## 🛠️ Development & Contribution
- This extension is built using **HTML, CSS, JavaScript**.
- Contributions are welcome! Feel free to fork this repository and submit a pull request.

## 📜 Manifest Permissions
```json
{
  "manifest_version": 3,
  "name": "Session Timer",
  "version": "1.0",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"]
}
```

## 📌 Known Issues & Fixes
- **Chrome warning: 'This extension may be unsafe'** → Solution: Load as an **unpacked extension** or **publish on the Chrome Web Store**.
- **Floating timer disappears** → Refresh the page and restart the extension.

## 📜 License
This project is **open-source** under the [MIT License](LICENSE).

---
🔗 **GitHub Repo**: [https://github.com/Prakashjha12/your-extension](https://github.com/Prakashjha12/your-extension)
