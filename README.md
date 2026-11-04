# 🕹️ HAYA Games

> **A private, dark-arcade gaming platform designed exclusively for Aditya & Harika.**  
> Featuring 11 fully playable games, 7-tier intelligent bot engines, real-time multiplayer, persistent match records, customizable 2D avatars, and strict database security.

---

## 🎮 Arcade Game Catalog

HAYA Games features **11 distinct, fully implemented playable machines**, split between strategy board games and solo puzzle cabinets:

### ♟️ Board & Multiplayer Machines
1. **Chess**
   - Stockfish 10 AI engine running via Web Workers with 7 difficulty tiers (Beginner to Grandmaster).
   - Interactive legal move highlighting, piece capture trays, move history notation, pawn promotion modal, and checkmate/stalemate detection.
2. **Carrom**
   - Continuous 2D physics simulation with substepping continuous collision detection (CCD).
   - Corner pocket captures, baseline striker placement with obstacle avoidance, fouls, and authentic Queen cover rules.
   - 7-tier bot AI engine capable of banking shots and prioritizing the Queen.
3. **Ludo**
   - 2 to 4 player boards with authentic rules: 6-roll spawning, safe squares, token capturing, and home stretches.
   - Real-time online 2-player mode with authoritative color reservations and AI bots for missing seats.
4. **Connect Four**
   - Minimax AI with alpha-beta pruning across 7 difficulty levels.
   - Smooth chip drop animations, dynamic column indicators, and local pass-and-play.
5. **Tic-Tac-Toe Arena**
   - Classic 3x3 grid featuring an unbeatable Master Minimax AI.
   - Direct 2-player real-time online room with instant peer-to-peer sync and rematches.
6. **Snakes & Ladders**
   - 10x10 board with dynamic ladder climbs and snake slides.
   - Markov-chain analytical telemetry computing live win probabilities across 7 difficulty levels.

### 🧩 Puzzle & Solo Machines
7. **2048**
   - Smooth directional tile sliding, compression, and merge animations.
   - High score persistence, undo support, and 2048 victory modal with continuation mode.
8. **Sudoku**
   - Procedural puzzle generator across Easy, Medium, and Hard difficulties.
   - Live conflict highlighting, pencil note-taking mode, and elapsed completion timer.
9. **Minesweeper**
   - First-click safety guarantee, flag placement toggle, mine counter, and timer.
   - Beginner (8x8), Intermediate (16x16), and Expert (16x30) board sizes.
10. **Maze**
    - Procedural labyrinth generator built on Prim's algorithm.
    - Responsive keyboard (WASD/Arrows) and touch controls with path-finding telemetry.
11. **Memory Cards**
    - Grid-based card matching game with dynamic deck sizes.
    - Tracks moves taken, match pairs, and fastest completion times.

---

## ✨ Key Platform Features

### 🔒 Private Two-Player Authentication & Security
- **Strict Email Allowlist:** Only two accounts are authorized:
  - `pedamallusriaditya@gmail.com` (Aditya)
  - `pasulaharika61@gmail.com` (Harika)
- All unauthorized registrations and sign-ins are rejected at both the client layer and the database trigger level.
- **5-Minute Inactivity Auto-Logout:** Cross-tab synchronized session expiration with user dismissal banners on logout.

### 🎨 2D Player Avatar Studio
- Full-featured custom SVG character creator.
- Mix and match base shapes, skin tones, hairstyles, hair colors, eye styles, expressions, clothing, headwear, accessories, and background scenes.
- Saved configurations are persisted to Supabase (`profiles.avatar_data`) with zero-latency local caching.

### 🏆 Hall of Records & Match History
- **Unified Game Recorder:** Every single-player win, loss, bot victory, and multiplayer match is permanently logged.
- Tracks game type, game mode (`single`, `bot`, `multi`), outcome, score, bot difficulty, opponent name, duration, and completion timestamp.
- Displays live statistics (Total Matches, Victories, Defeats, Win Rate %) and personal best high scores.

### ⚡ Real-Time Multiplayer & Match Stations
- **Global Lobby Presence:** Tracks online status, current game activity, and player avatars in real time.
- **Direct Invitations:** 45-second peer-to-peer match invitations with audible cues and notifications.
- **Authoritative Color Reservations:** First-come-first-served color locking prevents seat conflicts in online matches.

### 🛡️ Offline-First Resilience
- Built with a hybrid storage architecture: `localStorage` cache + event bus + Supabase PostgreSQL.
- The arcade remains **100% playable and data-persistent** even during network hiccups or when the database is paused.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript 5, Vite 5
- **Styling:** Tailwind CSS 3, Lucide Icons, Space Grotesk typography
- **AI & Game Engines:** Stockfish 10, Chess.js, Custom 2D Physics Simulator, Minimax Alpha-Beta Pruning, Markov Chain Analyzer
- **Backend & Database:** Supabase (PostgreSQL, Row Level Security, Auth, Realtime, Presence)
- **Audio:** Web Audio API sound synthesizer (`arcadeAudio`, `carromAudio`)
- **Testing:** Node.js native test runner (`node --test --experimental-strip-types`)

---

## 📁 Repository Structure

```text
HAYA/
├── src/
│   ├── auth/                    # AuthContext, allowlist guards, inactivity logout
│   ├── components/
│   │   ├── avatar/              # Avatar SVG renderer, studio controls, presets
│   │   ├── bot/                 # Bot configuration tiers, match headers
│   │   └── common/              # Arcade difficulty sliders and scrollers
│   ├── context/
│   │   └── MultiplayerContext   # Lobby presence, invitations, match routing
│   ├── games/
│   │   ├── carrom/              # Carrom physics engine, bot AI, game board
│   │   ├── chess/               # Stockfish integration, board, promotion modal
│   │   ├── connect4/            # Minimax bot, game engine, drop animations
│   │   ├── game2048/            # 2048 engine, tile grid, unit tests
│   │   ├── ludo/                # Ludo board, token logic, color reservation
│   │   ├── maze/                # Prim's maze algorithm and controls
│   │   ├── memory/              # Card matching engine and deck generator
│   │   ├── minesweeper/         # Board generator and flag logic
│   │   ├── snakes/              # Snakes & Ladders engine and Markov AI
│   │   ├── sudoku/              # Sudoku solver and puzzle generator
│   │   └── tictactoe/           # Minimax AI and 2-player OnlineRoom
│   ├── lib/
│   │   ├── accountIsolation.test.ts # Account security & isolation test suite
│   │   ├── arcadeAudio.ts       # Synthesized arcade sound effects
│   │   ├── avatarStorage.ts     # Local & remote avatar persistence
│   │   ├── gameRecordsService.ts# Match recording & statistics aggregation
│   │   ├── supabase.ts          # Supabase client & TypeScript models
│   │   ├── useGameRecorder.ts   # Automated game outcome recording hook
│   │   └── useHighScore.ts      # Personal best score hook
│   ├── pages/
│   │   ├── AvatarCreator.tsx    # Interactive 2D avatar customizer
│   │   ├── Dashboard.tsx        # Arcade lobby, quick-launch, CRT telemetry
│   │   ├── GameCatalog.tsx      # Machine directory (Single & Multiplayer)
│   │   ├── GamePlay.tsx         # Active game cabinet wrapper
│   │   ├── Login.tsx            # Private arcade passcode entrance
│   │   └── Scores.tsx           # Match history archive & High-Score wall
│   └── types/                   # Avatar and game interface definitions
├── supabase/
│   └── migrations/              # PostgreSQL schema, RLS policies, triggers
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v20.0.0 or higher.
- [npm](https://www.npmjs.com/) v9.0.0 or higher.

### 1. Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Quality Assurance

HAYA includes a suite of automated unit tests covering game engines and account security:

### Run Unit Tests
```bash
npm test
```
Runs 31 tests across:
- **Carrom:** Board initialization, momentum transfer, cushion restitution, CCD anti-tunneling, corner pockets, and Queen-cover rules.
- **2048:** Directional sliding, tile merge mechanics, score aggregation, and game over checks.
- **Account Isolation:** Allowlist enforcement, independent avatar storage, isolated match records, and separate audio preferences between Aditya and Harika.

### Run TypeScript Verification
```bash
npm run typecheck
```

### Run ESLint Verification
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

---

## 🗄️ Database Setup & Migrations

If setting up a fresh Supabase project or unpausing an existing instance, execute the SQL files in `supabase/migrations/` in chronological order in the Supabase SQL Editor:

1. `20261019113040_haya_foundation.sql` — Initial allowlist, user profiles, `game_scores`, and security definer triggers.
2. `20261023220000_match_reservations.sql` — Two-player color locking table.
3. `20261028220000_avatar_data.sql` — Avatar JSON configuration column.
4. `20261104210000_production_ready_haya.sql` — Game records, multiplayer invitations, and realtime publications.
5. `20261104220000_hardened_security_and_rls.sql` — Private preferences isolation, immutable match records, and anti-tamper RLS.

---

## 👥 Authorized Players

- 🎮 **Aditya** (`pedamallusriaditya@gmail.com`)
- ✨ **Harika** (`pasulaharika61@gmail.com`)

