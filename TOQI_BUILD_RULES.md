# NEST ESCAPE — Toqi build rules

This is the operating plan for Toqi while building the game. Its job is to prevent rushed, messy development.

## The one-rule system
Only **one milestone** may be in progress at a time. Toqi does not begin the next milestone until the current one is playable, checked, committed, and shown to Maksym.

## How every milestone works
1. **Inspect first** — understand the current project and protect existing work.
2. **Make one small change set** — no unrelated features or rewrites.
3. **Run the game** — test the specific feature and basic start/restart flow.
4. **Commit a checkpoint** — one clear commit with a plain-English message.
5. **Report in chat** — say what changed, what to test, and what is deliberately not built yet.
6. **Wait at the checkpoint** — progress only when Maksym says to continue.

## Milestones

### 0. Project audit — no game changes
- Unpack and inspect the existing GamingNest game files.
- Identify the engine, how it runs, and what should be preserved.
- Produce a tiny technical plan.
- **Gate:** Maksym can see the files and confirm the starting point.

### 1. Playable core — one room, plain shapes
- Player can move, jump, and interact.
- A single grey-box arcade room loads reliably.
- Exit door and restart work.
- **Not included:** art, enemies, menus, extra rooms.
- **Gate:** a complete 30-second start-to-finish playthrough works.

### 2. Signature mechanic — evil claw machine
- Add only the claw-machine obstacle.
- It is readable, avoidable, and causes a fair reset.
- Tune it before adding anything else.
- **Gate:** the room is fun for three repeat runs.

### 3. Game feel
- Add clear prompts, sound placeholders, particles or screen feedback, and a simple win screen.
- Improve control feel and fix obvious bugs.
- **Gate:** a new player understands the goal without being told.

### 4. Visual pass — one coherent room
- Replace only the grey-box room with GamingNest’s funny low-poly comedy style.
- Keep props useful and uncluttered.
- **Gate:** it looks intentional without hurting performance.

### 5. External playtest
- Two people play it.
- Log confusion and bugs; fix the single biggest issue first.
- **Gate:** decide whether it deserves a second room.

### 6. Expand carefully
- Add one room at a time, each with a different mechanic.
- Never start room three before room two is playable and tested.

### 7. CrazyGames-ready build
- Check mobile controls, loading, pause/restart, performance, and platform requirements.
- Integrate CrazyGames features only after the game is genuinely fun.
- **Gate:** submit only a polished build; no rushed ad integration.

## Things Toqi must not do
- Add features just because they sound cool.
- Replace an existing game without approval.
- Make broad rewrites while fixing a small bug.
- Add ads, publish, or submit anything without Maksym’s clear approval.
- Move ahead when the current build is broken.

## What Maksym needs to say
- **“Start milestone 0”** to begin safely.
- **“Continue”** to go past a checkpoint.
- **“Pause”** to stop work with the current version safe in GitHub.
- **“Change direction: …”** to update the plan before building.
