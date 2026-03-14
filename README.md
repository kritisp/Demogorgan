# 👹 Demogorgon Radar — BLE Proximity Game

A real-time multiplayer game where players use **Bluetooth Low Energy (BLE)** beacons and their phones to play a Stranger Things–inspired social deduction game. One player is secretly the **Demogorgon** — the rest are **Agents** trying to identify and banish it before they're all devoured.

---

## 🎮 How It Works

1. **Each player carries an NRF BLE beacon** (e.g. nRF52840) that continuously advertises with a unique name.
2. Players open the web app on their phone's **Chrome browser** (Web Bluetooth required).
3. Everyone joins a **room** in the lobby. The host starts the game.
4. **Roles are assigned secretly** — one random player becomes the Demogorgon.
5. Players move around physically. The radar on each phone scans for nearby BLE beacons and shows dots:
   - **Agents** see all players as 🔵 **blue dots**
   - **Demogorgon** sees all players as 🔴 **red dots**
   - **Dead players** appear as ❌ **red crosses**
6. **Auto-kill**: When the Demogorgon's phone is within ~70cm of an Agent's beacon for 0.5 seconds, that Agent is devoured automatically.
7. **Manual BANISH**: The Demogorgon also gets manual kill buttons for nearby agents.
8. Agents can **Report a Body** or **Identify Monster** to trigger a voting phase.
9. If agents vote correctly, they banish the Demogorgon and win. If they vote wrong or all agents are devoured, the Demogorgon wins!

---

## 🧰 Tech Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Frontend | React 19 + Vite 8 (HTTPS via self-signed SSL) |
| Backend  | Node.js + Express 5 + Socket.IO 4 |
| Comms    | Web Bluetooth API (BLE scanning)  |
| Hardware | Any BLE beacon (nRF52, ESP32, etc.) |

---

## 📋 Prerequisites

- **Node.js** v18+ and **npm**
- **Google Chrome** on Android (Web Bluetooth requires Chrome + HTTPS)
- **BLE beacons** — one per player, each with a unique advertised name
- Bluetooth & Location services **enabled** on phone

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd demogorgon_radar_ble
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend/vite-react-app
npm install
```

---

## ▶️ Running the App

You need **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — Start the Backend Server

```bash
cd backend
node server.js
```

Output: `Server listening on port 3001`

### Terminal 2 — Start the Frontend Dev Server

```bash
cd frontend/vite-react-app
npm run dev -- --host
```

Output:
```
VITE v8.0.0  ready

  ➜  Local:   https://localhost:5173/
  ➜  Network: https://<YOUR_IP>:5173/
```

### 3. Open on Phone

- Open **Chrome** on your Android phone
- Navigate to `https://<YOUR_IP>:5173/`
- Accept the self-signed certificate warning ("Advanced" → "Proceed")
- Allow **Bluetooth** and **Location** permissions when prompted

> **Note**: All players must be on the **same Wi-Fi network** as the machine running the servers, OR you can use a tunnel service (e.g. ngrok, Cloudflare Tunnel) to expose the ports publicly.

---

## 🕹️ How to Play

### Lobby
1. Enter your **name**, your **BLE beacon name** (must match exactly what the beacon advertises, e.g. `RADAR_1`), and a **room code**
2. All players join the same room code
3. Host clicks **START GAME** (minimum 2 players)

### In-Game
1. Click **GRANT BLE & START RADAR** to begin scanning
2. Walk around — nearby beacons appear as dots on the radar
3. **As Agent**:
   - Avoid the Demogorgon (you don't know who it is!)
   - If you find a dead body (red ❌ nearby), click **📢 REPORT BODY**
   - Click **❓ IDENTIFY MONSTER** to start a voting round
4. **As Demogorgon**:
   - Click **START HUNTING** to begin scanning
   - Walk close to agents (~70cm) — auto-kill triggers after 0.5 seconds
   - Use **💀 BANISH** buttons for manual kills on nearby targets
   - Don't get identified during voting!

### Voting
- All surviving players vote for who they think is the Demogorgon
- Correct vote → **Agents win** 🎉
- Wrong vote or tie → **Demogorgon wins** 👹

---

## 📁 Project Structure

```
demogorgon_radar_ble/
├── backend/
│   ├── server.js            # Express + Socket.IO server setup
│   ├── gameManager.js       # Game logic (rooms, roles, kills, voting)
│   └── package.json
└── frontend/
    └── vite-react-app/
        ├── src/
        │   ├── App.jsx              # Main app with socket event routing
        │   ├── screens/
        │   │   ├── Lobby.jsx        # Join/create room UI
        │   │   ├── GameScreen.jsx   # Radar, BLE scanning, kill logic
        │   │   └── ResultScreen.jsx # Win/lose screen
        │   ├── components/
        │   │   ├── Radar.jsx        # Visual radar with BLE dot rendering
        │   │   ├── PlayerList.jsx   # Player list component
        │   │   └── AlertBanner.jsx  # Alert/notification banner
        │   ├── services/
        │   │   ├── BluetoothScanner.js  # Web Bluetooth BLE scan wrapper
        │   │   └── SocketService.js     # Socket.IO client wrapper
        │   └── styles/
        │       └── radar.css        # Radar animations & dot styles
        ├── vite.config.js           # Vite config with HTTPS + proxy
        └── package.json
```

---

## ⚙️ Configuration

| Setting | Location | Default | Description |
|---------|----------|---------|-------------|
| Backend port | `backend/server.js` | `3001` | Change `PORT` env var or edit directly |
| Kill range (RSSI) | `frontend/.../GameScreen.jsx` | `-55` (~70cm) | Adjust `avgRSSI > -55` threshold |
| Kill delay | `frontend/.../GameScreen.jsx` | `500`ms | Time target must stay in range |
| BLE loss timeout | `frontend/.../BluetoothScanner.js` | `10000`ms | Time before a beacon is considered lost |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Bluetooth not available | Use **Chrome on Android**. Enable Bluetooth + Location. Enable `chrome://flags/#enable-experimental-web-platform-features` |
| Can't connect from phone | Ensure same Wi-Fi. Use `--host` flag. Accept the HTTPS cert warning |
| Beacons not showing | Verify beacon is advertising. Check beacon name matches exactly (case-insensitive) |
| Kill not triggering | Move closer — RSSI must be > -55 dBm (~70cm). Check console logs for `[Auto-Kill]` messages |
| Voting not starting | Make sure you click IDENTIFY MONSTER or REPORT BODY button |

---

## 📄 License

MIT
