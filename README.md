# EDUVERSE 3D — Multiplayer learning game starter

EDUVERSE 3D is a mobile-friendly browser game starter for iPhone, Android, tablets and computers. It uses Node.js, Express and Socket.IO. Players join a shared room using a six-character code; the server limits rooms to 40 players and synchronizes questions, answers, scores and the leaderboard.

## Current scope — be transparent
This repository is a **working starter / MVP**, not the fully completed commercial platform in the full brief. It currently provides:
- Online room creation and joining by code
- 40-player room limit
- Host-controlled game start
- Live player list and leaderboard
- Server-checked multiple-choice answers and scoring
- Custom question entry in the browser
- 20 selectable game-mode identities with themed UI labels
- Responsive interface for mobile and desktop

Important: the current build uses a shared quiz round engine behind the 20 mode labels. Their full unique 3D mechanics, persistent database/accounts, avatar editor, teacher analytics/export, robust reconnection/session restore, anti-cheat hardening and load testing remain future implementation tasks. The decorative arena is CSS artwork, not a fully rendered 3D world. Do not advertise these unfinished items as complete.

## Requirements
- Node.js 20 or newer
- Internet connection for hosting and players
- A host such as Render, Railway, Fly.io, a VPS, or another Node.js host that supports WebSockets

## Run locally
1. Install Node.js from the official Node.js website.
2. Extract this repository.
3. Open a terminal in the project folder.
4. Run:
   ```bash
   npm install
   npm start
   ```
5. Open `http://localhost:3000`.

To test from another device on the same Wi-Fi, use the computer's local IP address, e.g. `http://192.168.1.20:3000`. This is only local network testing; internet play requires deployment to a public host.

## Publish on GitHub
1. Create a new repository on GitHub.
2. Upload all files in this folder, preserving the `public` folder.
3. Connect the repository to a Node.js hosting service.
4. Set the build/install command to `npm install` and start command to `npm start`.
5. Ensure WebSocket connections are supported. The host provides a public HTTPS URL; open that URL on iPhone/Android.

GitHub itself stores source code; it does **not** run this Node server just by uploading files. GitHub Pages alone cannot host this multiplayer backend.

## Custom question format
In the lobby, enter one question per line:
```
Question? | Answer A | Answer B | Answer C | Answer D | correct answer number (1-4)
```
Example:
```
O‘zbekiston poytaxti? | Samarqand | Toshkent | Buxoro | Xiva | 2
```
Use a plain text editor to prepare the questions. This initial version does not yet import Excel/PDF files.

## Deploy checklist
- Use HTTPS/WSS.
- Configure environment variable `PORT` if required by the host.
- Keep the Node server running; free hosting tiers may sleep.
- Test with several real devices before a class session.
- A 40-player capacity is an application limit, not a guarantee of load-tested performance. Run a proper concurrent-user test before relying on it in a live class.

## Suggested roadmap
1. Add unique gameplay systems for each of the 20 modes.
2. Replace CSS arena with optimized Three.js/Godot 3D scenes.
3. Add database (PostgreSQL), authentication, question sets and session history.
4. Add teacher role, team controls, CSV/XLSX export and learning analytics.
5. Add reconnect tokens, answer deduplication, rate limits and server-side time validation.
6. Run load tests with 40+ concurrent clients and fix observed issues.
