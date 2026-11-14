---
type: game-design
status: in-progress
created: 2026-11-14
tags: [foxino, fugio, foxspy, game]
---
# FoxSpy

Back to [[Foxino]] · Site log: [[Foxino/Fugio Games Site|Fugio Games Site]]

> **Summary:** Foxino is a secret agent. From his holographic HQ he flies to five places on the world map, and each mission (5+ minutes) has lasers, vaults and diamonds to win back. Every gadget runs on English: the chosen content package's questions open laser grids, crack vault codes and decode messages.
> **Where:** fugio.co/foxspy, in the **Students** library. Code: `fugio-site/foxspy`. Repo: michalzasilka-art/foxspy.
> **Rules from the user (2026-11-14):** high-quality low-poly models made with Blender MCP on the Windows PC (Claudee RCC), Foxino above all. A modern, futuristic, holographic interface. Family friendly: the only weapon is a **laser stun gun** that makes the robot guards fall asleep (Zzz), never hurt.

## The headquarters (the menu)
One big futuristic room. When the app opens:
- **Centre:** Foxino in his spy suit stands next to a holographic Earth on a projector table. The **SELECT MISSION** button below it zooms the camera into the globe, which spins to show the 5 glowing mission pins. Tap a pin to see the mission card (name, place, story, time, the artifact to win), then press **START**.
- **Arrow left → Trophy Room:** a museum hall with modern glass cases on lit pillars, one per mission. A finished mission puts its artifact in the case, slowly turning under a spotlight. Before that the case stays empty, with a lock icon and "???".
- **Arrow right → Smart Board:** a big interactive wall screen with your agent stats: rank (Rookie → Agent → Special Agent → Super Spy), missions done, stars, best times, words learned, correct-answer rate per package, and badges.
- **Settings (gear):** the content package (like the other fugio games), sound, and graphics quality.

## The villain
**The Magpie**: a vain, theatrical jewel-thief bird who collects everything shiny in the world. Her helpers are clumsy **Bolt-Bots**, robot guards that patrol with torch beams. The stun laser makes them sleep for a few seconds (snoring Zzz). Nobody is ever hurt.

## The five missions
Each mission is about 5–7 minutes and has 6 stages. Stages always open with a story card and a gadget tip.

| # | Mission | Place | Story | Artifact for the Trophy Room |
|---|---|---|---|---|
| 1 | **Operation Moonlight** | Paris, France: a museum at night | The Magpie plans to swap the famous **Moon Diamond** for a glass fake during tonight's gala. Foxino sneaks in through the roof, gets past the laser hall, opens the display vault and swaps the fake back before midnight. | Moon Diamond |
| 2 | **Neon Circuit** | Tokyo, Japan: a neon skyscraper | Bolt-Bots have stolen the **Sakura Chip**, which runs the city's trains. Foxino rides the glass lifts, decodes the hacked door terminals, stuns the guard-bots and gets the chip back before the trains stop. | Sakura Chip |
| 3 | **Secret of the Sun Tomb** | Giza, Egypt: inside a pyramid | The Magpie is digging for the **Golden Scarab**. Foxino reads hieroglyph locks, dodges rolling stone traps and laser beams of sunlight, and reaches the treasure chamber first. | Golden Scarab |
| 4 | **Frozen Signal** | Svalbard, the Arctic: a secret ice base | A storm machine is freezing the sea. Foxino crosses the ice laser maze, slides past the patrols, and shuts the machine down with the **Snowflake Key**. | Snowflake Key |
| 5 | **Skyline Heist** | New York, USA: a bank vault at the top of a skyscraper | The finale. The Magpie wants the **Crown of Stars** from the world's safest vault. Foxino cracks the giant round vault door, avoids the laser floor and catches the Magpie in a stun-net on the roof as the police drone arrives. | Crown of Stars |

### Stage types (mixed in every mission)
1. **Briefing:** a holographic call from HQ that sets up the story (read it and hear it), plus the mission words.
2. **Sneak:** walk Foxino through rooms. Stay out of the camera cones and the Bolt-Bots' torch beams, and stun a Bolt-Bot if you must (cooldown).
3. **Laser grid:** a wall of moving laser beams. Each correct answer at the control panel switches one beam off; a wrong one makes the beams speed up. Then run through the gap.
4. **Vault / lock:** a round vault dial (or hieroglyph wheel or keypad). Each turn of the dial is a question, and the right answers make up the code. The door swings open.
5. **Decode:** an intercepted Magpie message with missing words. Fill them in from the package to learn the next location in the building.
6. **Escape / finale:** a timed run (lift, slide, zip-line, roof chase) with quick-fire questions, then grab the artifact and the mission is complete. Stars depend on time, accuracy and how few times you were spotted.

### The learning effect
- Every action that matters is a question from the **chosen content package** (`packages.js`, the same A0–A2 packages as the other fugio games, changed in Settings). There are no "free" doors.
- Wrong answers are never punished harshly: the gadget explains the right answer (hint text from the package) and the question comes back later in the same mission (spaced repeat).
- After each mission the **Agent Report** shows the words and sentences you met, the ones you missed (to practise), and the stars.
- The Smart Board keeps per-package progress, so teachers can see it.

## The 3D models (Blender on the Windows PC, low poly)
- **Phase A:**
  - Foxino the spy, rigged and animated: idle, walk, run, sneak, aim the stun laser, jump, celebrate.
  - The HQ room with the projector table and globe, the Trophy Room with 5 glass cases on pillars, the smart-board wall.
  - The 5 artifacts.
- **Phase B:** one kit per location: floor and wall modules, doors, laser emitters, security cameras, the vault door (with an opening animation), display pedestals and location props.
- **Phase C:** the Magpie and the Bolt-Bot guard (rigged).

## Log
- 2026-11-14: the user ordered the game ("work for a night"). Design written, Blender phase A sent to Claudee RCC, code started.
