# Infinite Pixel World

**Infinite Pixel World** is a procedural pixel-scale sandbox, survival, exploration, building, farming, and combat game that runs entirely in the browser. Every active world cell participates in the simulation: liquids flow, powders fall, gases rise, fire spreads, crops grow, weather changes terrain, enemies interact with the environment, and player-built bases persist independently across multiple infinite dimensions.

There is no single mandatory victory condition. You can explore Earth, build bases, farm, fight wildlife and bosses, discover structures, travel to other dimensions, master movement techniques, or simply experiment with the material simulation.

> Current package version: **1.36.1**  
> Internal game resolution: **360 × 210 pixels**  
> Simulation target: **60 updates per second**

---

## Contents

- [Play the game](#play-the-game)
- [Quick start](#quick-start)
- [Complete controls](#complete-controls)
- [The core game loop](#the-core-game-loop)
- [HUD and status indicators](#hud-and-status-indicators)
- [Movement](#movement)
- [Health, hunger, breath, and hazards](#health-hunger-breath-and-hazards)
- [Inventory, gathering, and building](#inventory-gathering-and-building)
- [Weapons](#weapons)
- [Terrain and material simulation](#terrain-and-material-simulation)
- [Food, farming, and cooking](#food-farming-and-cooking)
- [Furniture crafting and base building](#furniture-crafting-and-base-building)
- [Earth, biomes, caves, and structures](#earth-biomes-caves-and-structures)
- [Time and weather](#time-and-weather)
- [Dimensions and portals](#dimensions-and-portals)
- [The rocket and the Moon](#the-rocket-and-the-moon)
- [Fauna and enemy behavior](#fauna-and-enemy-behavior)
- [Unstable rift invasions](#unstable-rift-invasions)
- [Bosses and rituals](#bosses-and-rituals)
- [Saving and world slots](#saving-and-world-slots)
- [Useful player tips](#useful-player-tips)
- [Run locally and develop](#run-locally-and-develop)
- [Project structure](#project-structure)
- [Testing and performance](#testing-and-performance)

---

## Play the game

### Standalone build

Open [`index.html`](./index.html). It loads the prebuilt standalone bundle from `dist/game.bundle.js` and does not require a development server.

### Development build

Serve the repository over HTTP and open `dev.html`:

```bash
npm run serve
```

Then visit:

```text
http://localhost:8080/dev.html
```

The development page loads the native modules from `src/` directly.

---

## Quick start

A new world begins with the player dropping from the sky at the horizontal center of the screen. The game finds a safe Earth location, clears a narrow descent corridor, creates a stable landing pad, and protects the player during the fall.

For the first few minutes:

1. **Move with `A`/`D`** and jump with **`W`, `Up`, or `Space`**.
2. Aim with the mouse and click to use the equipped weapon.
3. Press **`Q`** to inspect the complete weapon cycle.
4. Use the **Destruculator** to remove and collect terrain blocks.
5. Press **`I`** to open the pack and inspect collected materials, food, seeds, loot, and furniture.
6. Press **`E`** to equip a stored building block, then click to place it.
7. Press **`K`** to open furniture crafting.
8. Watch the health and hunger bars. Eat produce or cooked food from the pack.
9. Explore in either direction. Earth biome regions are much wider than one screen and blend gradually into one another.
10. Press **`F5`** to save manually.

The game begins with the **Gun** equipped, but every weapon is already available through `Q`. Weapons use cooldowns rather than ammunition.

---

## Complete controls

### Normal play

| Input | Action |
|---|---|
| `A` / `Left` | Move left |
| `D` / `Right` | Move right |
| `W` / `Up` / `Space` | Jump, swim upward, or climb upward |
| `S` / `Down` | Swim downward or climb downward |
| Mouse movement | Aim the pixel cursor |
| Either mouse button | Attack, use the held tool, place a block or furniture item, or scatter equipped seeds |
| Hold mouse button | Continue a continuous action such as firing the laser, spraying napalm, or pulling with the hook |
| `Q` | Cycle to the next weapon; also leaves building or seed mode |
| `E` | Equip or cycle the next stored placeable block |
| `I` / `Tab` | Open or close the pack |
| `K` | Open or close the furniture crafting catalogue |
| `F` | Interact with nearby functional furniture |
| `P` | Pause or resume |
| `O` | Open or close the world-slot menu |
| `R` | Open the world-slot menu |
| `Escape` | Empty the hand, leave build/seed mode, or close the current overlay |
| Mouse wheel up/down | Increase or decrease the cursor-centered magnifier, from normal view to 8× |
| `F5` | Save the active world slot |
| `F9` | Load the active world slot |

The browser cursor is hidden while over the game canvas. A one-pixel in-game crosshair shows the exact target cell.

### Pack controls

| Input | Action |
|---|---|
| `Up` / `W` | Previous pack item |
| `Down` / `S` | Next pack item |
| `Enter` | Use or equip the selected item |
| Click an item | Use or equip it |
| `I`, `Tab`, or `Escape` | Close the pack |
| Mouse wheel | Scroll the selection |

Pack item behavior depends on its type:

- **Material:** equips it for block placement when the material is placeable.
- **Furniture:** equips the crafted furnishing for placement.
- **Seed:** equips it for physical seed scattering.
- **Produce or cooked food:** eats it immediately.
- **Raw food or ordinary loot:** remains stored until used by another system.

> The pack and crafting catalogue do **not** pause the simulation. Use `P` first when you need time to read safely.

### Crafting controls

| Input | Action |
|---|---|
| `Up` / `W` | Previous recipe |
| `Down` / `S` | Next recipe |
| `Enter` or click | Craft the selected furnishing |
| `K` or `Escape` | Close crafting |
| Mouse wheel | Scroll the recipe selection |

### World-slot menu controls

The world-slot menu pauses the game.

| Input | Action |
|---|---|
| `Up` / `W` | Previous slot |
| `Down` / `S` | Next slot |
| `Enter` | Load an occupied slot or create an empty one |
| `N` | Start a new world in the selected slot; press twice to confirm |
| `Delete` | Delete the selected slot; press twice to confirm |
| `O` / `Escape` | Close the menu |
| `F5` | Save |
| `F9` | Load |

### Portal-code input

Portal codes are typed as ordinary letters during play. They are:

- Case-insensitive.
- Detected before normal control bindings.
- Cancelled when more than approximately **3.2 seconds** passes between letters.
- Consumed by the code detector, so their letters do not accidentally move the player, pause the game, change weapons, or open menus.

The full list appears in the [portal-code spoiler section](#portal-codes-spoilers).

---

## The core game loop

The game is deliberately open-ended, but its systems form a natural loop:

1. **Explore** procedural terrain, caves, structures, oceans, and dimensions.
2. **Gather** blocks with the Destruculator and collect creature drops, seeds, produce, and crystals.
3. **Survive** hunger, fire, lava, steam, weather, drowning, oxygenless dimensions, enemies, and bosses.
4. **Build** terrain structures and craft functional furniture for persistent bases.
5. **Farm and cook** to create renewable food supplies.
6. **Fight** ordinary wildlife, specialized enemies, rare invaders, and ritual bosses.
7. **Travel** through the unique Earth rocket or hidden typed portal codes.
8. **Return** to saved positions in any visited dimension and continue modifying that world.

There is no ammunition economy and no conventional equipment progression. Skill comes from movement, choosing the correct weapon, understanding the material simulation, preparing boss rituals, and constructing useful bases.

---

## HUD and status indicators

### Upper-left vitals

- **HP:** segmented health bar, maximum 100.
- **Hunger:** segmented hunger bar, maximum 100.
- **AIR:** appears directly beneath hunger only while breath is actively being consumed.

### Upper-center information

- Active boss health bar.
- Boss ritual title, requirement, and progress when a valid ritual location is nearby.

### Upper-right information

- Current day and time.
- Current weather.
- In-canvas buttons for saving, world slots, the pack, crafting, and pause.

### Lower HUD

- Equipped weapon, icon, and cooldown.
- Laser heat and overheat state when using the Laser Rifle.
- Crystal score.
- Pack item count.
- Magnifier level.
- Contextual status chips and prompts.

### Important status chips

| Status | Meaning |
|---|---|
| `BHOP ×N` | Active bunnyhop chain |
| `DIVE` | Breath is draining because the head is submerged |
| `NO AIR` | Breath is draining because the current dimension has no oxygen |
| `PARASITE ×N` | One or more parasites are attached |
| `WEAPON STOLEN` | A Gear Gremlin has taken the current weapon |
| `RIFT RAID` | A natural unstable invasion rift is active |
| Fire / Lava / Steam | The player is touching a damaging material |
| Starving | Hunger has reached zero |

Pickup messages, biome banners, damage-direction flashes, save notifications, furniture prompts, and temporary weapon messages also appear in the canvas.

---

## Movement

The player has a fixed **3×5-pixel collision body**. Movement remains aligned to the integer pixel grid.

### Walking and jumping

- Horizontal movement accelerates rather than instantly reaching maximum speed.
- Ground friction is stronger than air drag.
- The player automatically steps over one-pixel ledges.
- **Coyote time:** a jump can still begin for seven frames after leaving an edge.
- **Jump buffering:** a jump pressed up to eight frames before landing will trigger on contact.
- Releasing the jump button early reduces upward velocity, producing a shorter jump.

### Bunnyhopping

A well-timed jump shortly after landing starts or continues a bunnyhop chain.

- The timing window is **eight frames**.
- Each successful hop raises jump impulse, horizontal speed limit, directional momentum, and air control.
- The chain is capped at **10 hops**.
- Momentum is mostly preserved through correctly timed landings.
- Waiting on the ground, missing the window, swimming, or colliding with a wall resets the chain.
- Low-gravity dimensions amplify the height and distance gained from the technique.

### Swimming and wading

The game does not enter swimming mode merely because water overlaps the player. It scans the complete liquid column beneath the body and checks whether a valid upright standing position exists.

- Shallow water with reachable ground remains **walking/wading**.
- Deep or bottomless water activates **swimming**.
- A deep-water swim latch prevents buoyancy from repeatedly switching the player between walking and swimming at the surface.
- The player sprite rotates a true 90 degrees while swimming; the face leads and the legs trail.
- `A`/`D` swim horizontally.
- `W`, `Up`, or `Space` swim upward.
- `S` or `Down` swim downward.
- Water applies strong drag and bounded buoyancy.
- Passive floating settles with the head above the surface while the body remains supported by water.
- Swimming ends when a genuinely standable shallow floor is reached or the player exits the water horizontally.

### Ladders

A crafted ladder is non-solid. Overlap it and use `W`/`S` or the vertical arrow keys for controlled climbing. Horizontal movement allows the player to leave the ladder.

### Grappling hook

Select the **Hook** with `Q` and click toward terrain.

- The hook travels up to roughly 58 pixels.
- Hold the mouse button after it sticks to pull the player toward the anchor.
- Release the button or change weapons to release the hook.

### Furniture poses

- Interacting with a chair or stool seats the player.
- Moving or jumping stands up.
- Swimming uses its own rotated pose.
- Jumping, landing, firing, and high-speed movement use squash, stretch, recoil, dust, and speed-line feedback without changing the collision body.

---

## Health, hunger, breath, and hazards

### Health

Maximum health is **100**. Health can be lost through:

- Hostile creature contact.
- Boss contact and projectiles.
- Fire, lava, and steam.
- Lightning.
- Starvation.
- Drowning or asphyxiation.
- Parasites.

Health can be restored by produce, cooked food, beds, and some furniture interactions.

### Hunger

Maximum hunger is **100**.

- A full bar lasts roughly **30 minutes** while idle.
- Moving drains hunger faster.
- Jumping has an additional hunger cost.
- At zero hunger, the player takes **2 damage approximately every three seconds**.
- Produce restores hunger and health according to crop type.
- Cooked creature food provides larger fixed restoration amounts.

### Breath

Maximum breath is **100**.

Breath drains when:

- The player’s head is submerged in water.
- The current dimension has no breathable oxygen.

A full breath bar lasts roughly **20 seconds**. It refills in roughly **five seconds** after returning to breathable air. At zero breath, the player takes **5 damage approximately every 1.5 seconds**.

The AIR bar remains hidden when breath is not being used.

### Oxygenless dimensions

The following dimensions have no breathable atmosphere:

- Moon
- Emberdeep
- Blacktide Abyss
- Clockwork Expanse
- The Static

Travel into these worlds is dangerous because the current game has no craftable oxygen equipment. Treat portal visits as timed expeditions and keep enough health or food to survive the return trip.

### Environmental hazards

| Hazard | Effect |
|---|---|
| Fire | Contact damage; spreads through flammable terrain |
| Lava | Heavy contact damage; ignites flammable material and napalm |
| Steam | Damages the player and creatures while rising |
| Lightning | Deals 18 damage near the strike and ignites terrain |
| Deep water | Requires swimming and consumes breath when the head is submerged |
| Oxygenless atmosphere | Consumes breath everywhere in the dimension |
| Severe weather | Reduces visibility, pushes entities, deposits material, or changes terrain |

### Death

At zero HP the game pauses on the death state. Open the world-slot menu with `R` or `O`, then load an existing save or create a new world.

---

## Inventory, gathering, and building

### Gathering terrain

Use the **Destruculator** to remove and collect the first valid cell along the aim line.

- Range: approximately 18 pixels.
- Collectable solid blocks enter the material inventory.
- Crops are harvested through the crop system rather than stored as crop terrain.
- Furniture is dismantled and returned as a furniture item.
- Water, lava, and napalm are transparent to automatic targeting. To collect one, place the cursor directly over the exact liquid pixel.

### Placeable materials

The following collected materials can be equipped and placed as individual pixels:

- Rock
- Dirt
- Grass
- Sand
- Wood
- Leaf
- Crystal
- Snow
- Mud
- Bamboo
- Ash
- Mycelium dirt
- Mushroom stem
- Mushroom cap

Water, lava, napalm, fire, smoke, steam, and crop pixels cannot be placed through ordinary build mode.

### Block placement

1. Press `E` to cycle through stored placeable materials, or select one from the pack.
2. Aim within approximately 18 pixels.
3. Click to place the block in the last open cell before terrain, or at the range endpoint.

Placement fails when:

- The target is occupied.
- The target is inside the player.
- The block is outside range.
- The selected stack is empty.

The game continuously resolves player overlap to reduce the chance of being trapped by newly placed or falling terrain.

### Crystal score versus crystal material

There are two related crystal values:

- **Crystal score:** touching naturally exposed crystal pixels collects them immediately and increases the HUD crystal total. Bosses also award this score.
- **Crystal material:** mining a crystal pixel with the Destruculator puts a placeable crystal block into the pack. Furniture recipes use this material stack.

### Inventory order

The pack displays, in order:

1. Collected materials.
2. Crafted furniture.
3. Crop seeds and produce.
4. Creature loot and food.

---

## Weapons

Press `Q` to cycle through all 11 weapons. A stolen weapon is temporarily skipped until its carrier is defeated or the player changes dimensions.

| Weapon | Cooldown | How to use it |
|---|---:|---|
| **Gun** | 9 frames | Fires fast bullets toward the cursor. Bullets can pierce multiple ordinary creatures and do negligible terrain damage. |
| **Napalm Sprayer** | 2 frames | Hold fire to spray liquid napalm. It flows while unsupported, sticks to solid surfaces, and ignites after a short delay or immediately near fire/lava. |
| **Glaive** | 24 frames | Throws one spinning glaive. It ricochets from terrain, damages creatures, then returns after a delay. It can bounce up to eight times. |
| **Hook** | 8 frames | Fires a grappling hook. Hold after attachment to pull toward the anchor. |
| **Sword** | 16 frames | Performs a short directional melee arc. It deals 35 damage and knocks back ordinary creatures and bosses. |
| **Grenade** | 34 frames | Throws a bouncing grenade with a short fuse, circular terrain blast, and surrounding fire. |
| **Destruculator** | 4 frames | Precisely extracts collectable terrain, crops, or furniture. Liquids require exact cursor targeting. |
| **Drone Strike** | 210 frames | Selects a visible column and calls a drone from the upper edge. It requires a clear air corridor and strikes the highest visible solid pixel in that column. |
| **Laser Rifle** | Continuous | Hold to project a 72-pixel heat beam. It damages targets and transforms terrain. Heat builds to an overheat lockout, then cools automatically. |
| **Nyan Cat Launcher** | 150 frames | Launches a bouncing rainbow cat that pierces creatures, ricochets up to six times, and finishes in a star-shaped terrain explosion with a crystal rim. |
| **Reality Zipper** | 270 frames | Opens one temporary psychedelic terrain seam, pulses damage and alternating gravity, splits crossing projectiles, then restores the original terrain snapshot. |

### Gun

- Fast, reliable general-purpose ranged damage.
- Bullets have a limited lifetime and can pierce two targets.
- Best for ordinary creatures when terrain preservation matters.

### Napalm Sprayer

- Napalm behaves as simulated liquid.
- Unsupported napalm flows downward and sideways.
- On touching solid terrain it sticks in place.
- It ignites after roughly one second or immediately next to fire or lava.
- Burning napalm can start large chain reactions in wood, leaves, grass, bamboo, ash, fungi, and crops.

### Glaive

- Only one player glaive can be active at a time.
- It begins returning after 48 frames.
- It retains approximately 90% of its speed on each ricochet.
- It expires after eight bounces or six seconds.
- Its curved return and ricochet behavior make it effective in caves and structures.

### Hook

The Hook is primarily a movement tool. It does not damage terrain. Use it to cross gaps, recover from falls, climb shafts, or preserve bunnyhop routes.

### Sword

The sword attacks in the aim direction, not merely the direction the player faces. It is strong against close groups but requires entering contact range.

### Grenade

- Bounces from solid terrain.
- Explodes after a 78-frame fuse.
- Clears a radius of roughly seven pixels.
- Places fire out to roughly nine pixels.
- Can trigger lava, napalm, crop, and flammable-terrain reactions.

### Destruculator

The tool cursor reports whether the target is valid. It is the primary way to:

- Gather construction materials.
- Mine exact blocks without a large explosion.
- Harvest or clear crops.
- Dismantle furniture without losing it.
- Collect a directly hovered liquid pixel.

### Drone Strike

The drone approaches horizontally through the visible upper half of the current screen.

- The selected target is always the **highest visible solid pixel** in the chosen column.
- A target under an overhang cannot be selected because the upper terrain intercepts the strike.
- The drone refuses to launch when no all-air approach corridor exists.
- The homing rocket creates a large terrain blast and a larger burning region.

### Laser Rifle

The laser has two heat systems:

- **Weapon heat:** reaches 100 and causes overheat. Firing remains disabled until heat cools to 28 or below.
- **Pixel heat:** accumulates on struck terrain and decays when the beam leaves.

Important reactions:

- Snow becomes water.
- Water becomes steam.
- Napalm and flammable material ignite.
- Sand melts under sustained heat.
- Rock, dirt, and crystal can eventually become lava.

### Nyan Cat Launcher

- Only one Nyan Cat can be airborne at once.
- It has light gravity and preserves 91% of momentum on impact.
- A minimum speed prevents weak, repetitive wall taps.
- It pierces up to five ordinary creatures.
- It detonates after six bounces, lifespan expiry, exhausted pierce, or direct boss impact.
- The final blast deals heavy creature and boss damage, removes terrain in a star pattern, and can convert rim cells to crystal.

### Reality Zipper

- Range: roughly 78 pixels.
- Only one zipper rift can exist at once.
- It snapshots a narrow strip, pushes terrain to both sides, and opens a traversable seam.
- Fluids, powders, gases, and fire continue simulating while the seam is open.
- Nearby ordinary enemies take 5 damage per pulse; bosses take 3.
- Alternating gravity affects enemies, the player, pickups, and projectiles.
- Up to six crossing projectiles can be split into mirrored trajectories.
- During closure, the original terrain and crop metadata are restored.
- Saving forcibly closes the zipper before serialization so its temporary terrain cannot become permanent.

---

## Terrain and material simulation

Every world cell contains a material type and, where needed, life, age, crop, plant, and shading data.

### Material reference

| Material | Solid | Collectable | Placeable | Behavior |
|---|:---:|:---:|:---:|---|
| Air | No | No | No | Empty space |
| Rock | Yes | Yes | Yes | Stable solid |
| Dirt | Yes | Yes | Yes | Can become grass when exposed |
| Grass | Yes | Yes | Yes | Flammable; can release seeds when destroyed |
| Water | No | Yes | No | Flowing liquid; extinguishes and cools |
| Sand | Yes | Yes | Yes | Falling/sliding powder; can melt under laser heat |
| Wood | Yes | Yes | Yes | Stable flammable solid |
| Leaf | Yes | Yes | Yes | Flammable foliage |
| Lava | No | Yes | No | Flowing hot liquid; ignites and reacts with water |
| Crystal | Yes | Yes | Yes | Stable solid and crafting material |
| Fire | No | No | No | Spreads, burns out, and produces smoke |
| Napalm | No | Yes | No | Flowing, sticky, delayed-ignition fuel |
| Smoke | No | No | No | Rising gas affected by wind |
| Snow | Yes | Yes | Yes | Falling powder; melts to water |
| Mud | Yes | Yes | Yes | Falling/sliding material; flammable in this simulation |
| Bamboo | Yes | Yes | Yes | Stable flammable plant material |
| Ash | Yes | Yes | Yes | Falling flammable powder |
| Mycelium dirt | Yes | Yes | Yes | Stable fungal ground; flammable |
| Mushroom stem | Yes | Yes | Yes | Stable fungal structure; flammable |
| Mushroom cap | Yes | Yes | Yes | Stable fungal structure; flammable |
| Steam | No | No | No | Rising damaging gas |
| Crop stem/leaves/fruit | Mixed | No | No | Managed by the farming system; flammable |

### Falling materials

Sand, snow, mud, and ash fall vertically when unsupported and slide around obstacles. Their movement can reshape slopes, fill rooms, bury structures, and interact with liquids.

### Liquids

Water, lava, and napalm flow through available space. Liquids displace smoke and steam rather than becoming permanently blocked by gas cells.

### Gases

Smoke and steam rise, spread, decay, and respond to weather wind. Steam damages the player and ordinary creatures.

### Fire reactions

Fire:

- Spreads to flammable neighboring cells.
- Burns out into smoke or air.
- Melts snow into water.
- Converts water to steam.
- Ignites napalm.
- Damages crops, fungi, wood, leaves, bamboo, grass, mud, and ash.

### Lava reactions

Lava:

- Converts contacting water into rock and steam.
- Ignites napalm and flammable terrain.
- Can be created by sustained Laser Rifle heating.
- Damages most creatures and the player.

### Terrain recovery

Dirt exposed directly to air gradually becomes grass after approximately one minute. This allows damaged surface terrain to regrow naturally.

### Simulation scope

The game keeps a 3×3 neighborhood of chunks loaded. Material simulation is concentrated in the visible chunk, with active-cell tracking and bounded updates to keep the 60 Hz target practical.

---

## Food, farming, and cooking

### Crop seeds

Destroying grass through any mechanism can release a random crop seed. This includes the Destruculator, explosions, fire, and other terrain-changing systems.

The 12 crops are:

| Crop | Seed item | Produce | Hunger | Health |
|---|---|---|---:|---:|
| Carrot | Carrot seeds | Carrot | 22 | 3 |
| Potato | Seed potatoes | Potato | 24 | 3 |
| Tomato | Tomato seeds | Tomato | 26 | 4 |
| Corn | Corn kernels | Corn cob | 28 | 4 |
| Pumpkin | Pumpkin seeds | Pumpkin | 35 | 6 |
| Strawberry | Strawberry seeds | Strawberry | 20 | 3 |
| Blueberry | Blueberry seeds | Blueberries | 22 | 3 |
| Pepper | Pepper seeds | Pepper | 24 | 3 |
| Cucumber | Cucumber seeds | Cucumber | 26 | 4 |
| Eggplant | Eggplant seeds | Eggplant | 28 | 4 |
| Cabbage | Cabbage seeds | Cabbage | 32 | 5 |
| Sunflower | Sunflower seeds | Sunflower head | 24 | 3 |

The table shows the maximum gain when the player has room in both bars. Exact harvest counts vary by crop.

### Planting crops in terrain

1. Open the pack with `I`.
2. Select a seed item and press `Enter`.
3. Aim and click to throw a spread of up to seven physical seeds.
4. Seeds embed only when they land above dirt, grass, mud, or mycelium with open space for the plant.

Seeds can bounce, fall, miss the soil, or expire before planting. Plants require separation from nearby plants.

### Growth

- Crops have five visible stages.
- Normal maturation takes one full 20-minute day/night cycle.
- Weather changes growth speed.
- Mature plants release produce and seeds when destroyed.
- Immature plants return one seed when destroyed.

### Weather growth multipliers

| Weather | Growth rate |
|---|---:|
| Thunderstorm | 1.50× |
| Ocean storm | 1.45× |
| Rain | 1.35× |
| Spore haze | 1.22× |
| Cave drips | 1.10× |
| Dense fog | 1.05× |
| Clear / Breezy | 1.00× |
| Snowfall | 0.85× |
| Heatwave | 0.78× |
| Ashfall | 0.68× |
| Blizzard | 0.62× |

### Planter boxes

Crafted planter boxes provide a compact alternative:

- Equip one seed and press `F` near an empty planter.
- The planter consumes one seed.
- It matures in roughly 60 seconds.
- A harvest gives two produce.
- The same plant automatically regrows after harvesting.

### Raw and cooked food

Raw food must remain continuously near fire, lava, or steam for **60 frames**, approximately one second. Moving it away resets progress. While cooking, the pickup is held in place so collection attraction does not interrupt the process.

| Raw item | Cooked item | Hunger | Health |
|---|---|---:|---:|
| Raw meat | Cooked meat | 34 | 4 |
| Wild egg | Cooked egg | 18 | 2 |
| Mushroom flesh | Roasted mushroom | 16 | 2 |
| Fresh fish | Cooked fish | 28 | 3 |
| Crab claw | Cooked crab | 24 | 3 |

Cooked food is eaten from the pack. Raw food is not directly edible.

---

## Furniture crafting and base building

Press `K`, click the hammer button, or interact with a workbench to open the catalogue. Furniture recipes use ordinary gathered materials and do not require intermediate crafting stations.

### Crafting and placement flow

1. Gather the listed block materials with the Destruculator.
2. Open crafting with `K`.
3. Select a recipe and press `Enter`.
4. Open the pack with `I`.
5. Select the crafted item and press `Enter` to equip it.
6. Aim at a valid location within build range and click.
7. Press `F` near functional furniture to use it.
8. Use the Destruculator to dismantle it and recover one item.

Furniture is stored as multi-pixel world entities rather than replacing terrain cells. This permits doors, storage, lighting, seating, ladders, signs, and crops to maintain state without breaking liquids, gases, or fire simulation.

Placement requires:

- A completely open footprint.
- No overlap with the player or another furnishing.
- Floor support for floor items.
- A neighboring wall for wall-mounted items.

Each dimension can contain up to **160 placed furnishings**.

### Complete furniture recipes

| Furniture | Recipe | Size | Function |
|---|---|---:|---|
| Workbench | 8 wood + 2 rock | 7×4 | Opens crafting |
| Wood table | 6 wood | 7×4 | Work surface / decoration |
| Stone table | 7 rock | 7×4 | Durable work surface / decoration |
| Chair | 4 wood | 3×4 | Sit with `F` |
| Stool | 3 wood | 3×3 | Sit with `F` |
| Wood door | 7 wood | 2×7 | Opens/closes; blocks player and ordinary enemies when closed |
| Base gate | 7 wood + 1 rock | 5×4 | Wider opening; blocks player and ordinary enemies when closed |
| Floor lamp | 3 wood + 2 crystal | 3×7 | Toggleable local light, radius 18 |
| Wall lamp | 1 rock + 1 crystal | 3×3 | Wall-mounted local light, radius 13 |
| Hanging lantern | 2 bamboo + 1 crystal | 3×4 | Wall-mounted local light, radius 15 |
| Wall switch | 1 rock + 1 crystal | 3×3 | Toggles nearby lights, doors, and gates within 18 pixels |
| Collector chest | 6 wood + 1 crystal | 5×3 | Vacuums nearby seeds, produce, and loot; capacity 64 |
| Bed | 5 wood + 5 leaf | 7×3 | Restores health/hunger; skips night to dawn |
| Bunk bed | 9 wood + 8 leaf | 5×7 | Same resting function in a taller footprint |
| Ladder | 5 wood | 2×7 | Non-solid vertical climbing surface |
| Portal bookshelf | 8 wood + 2 leaf | 5×7 | Reveals one dimension portal code |
| Planter box | 4 wood + 3 dirt | 5×3 | Consumes a seed and produces renewable harvests |
| Base sign | 4 wood | 5×5 | Cycles preset labels |
| Wall clock | 2 wood + 2 crystal | 5×5 | Reports current day and time |
| Woven rug | 3 leaf + 2 bamboo | 7×1 | Non-solid decoration |
| Crystal window | 4 rock + 3 crystal | 5×5 | Framed transparent structural piece |
| Wood fence | 4 wood | 5×3 | Low structural barrier |

### Furniture functions in detail

#### Doors and gates

Press `F` to toggle. Closed doors and gates participate in collision for the player and ordinary enemies. Open versions retain only their frame posts.

#### Lamps and lanterns

Each light begins switched on. Press `F` to toggle it. Light is local and does not require fuel or wiring.

#### Wall switches

A switch toggles all nearby lights, doors, and gates within 18 pixels. There is no wire placement: proximity is the connection rule.

#### Chairs and stools

Press `F` to sit. Any movement or jump input stands the player up.

#### Beds and bunk beds

- During daytime: restore 12 HP and 4 hunger.
- At night: restore 35 HP and 12 hunger, then advance the world to dawn.

#### Collector chests

- Collection radius: 13 pixels.
- Capacity: 64 item units.
- Collects loose crop seeds, produce, and creature loot.
- Press `F` to transfer everything into the pack.
- Does not collect terrain materials.

#### Planter boxes

Equip a seed, press `F`, wait roughly 60 seconds, then press `F` to harvest two produce. The crop remains planted and starts another growth cycle.

#### Portal bookshelves

Press `F` to reveal one destination name and its typed code. Re-reading at a different time or position can reveal another entry.

#### Signs

Press `F` to cycle:

`HOME` → `MINE` → `FARM` → `PORTAL` → `DANGER` → `REST`

#### Wall clocks

Press `F` to display the current in-game day and time.

---

## Earth, biomes, caves, and structures

Earth is the original infinite world and the only dimension with the full ordinary fauna ecosystem and ritual boss system.

### Surface biomes

Biome regions are approximately **960 pixels wide** and blend over broad 280-pixel transition zones.

| Biome | Characteristics |
|---|---|
| Plains | Open grassland, rolling terrain, broad sky, farms, and storm rituals |
| Snow Peaks | Snow-covered mountains, crystal, steep terrain, blizzards, and cold fauna |
| Bamboo Grove | Dense bamboo and leaves, shrine structures, climbing animals, and fire-sensitive terrain |
| Swamp | Mud, shallow water, fog, wet weather, amphibians, insects, and mire rituals |
| Volcano | Ash slopes, calderas, lava lakes, conduits, magma chambers, heat, and fire |
| Giant Forest | Large trees, canopy routes, tree structures, climbers, mimics, and forest predators |
| Ocean | Beaches, sand floors, deep water, trenches, marine fauna, storms, and sea bosses |

### Underground regions

- **Standard caves:** rock tunnels, crystal veins, cave fauna, burrowers, mines, and vaults.
- **Mushroom caverns:** mycelium ground, giant mushroom terrain, spore weather, fungal fauna, and the Mycelial Monarch ritual.

The underground continues below the surface through multiple chunks. Deeper locations are required for several boss rituals.

### Earth surface structures

Structures are deterministic for a world seed and may be damaged, looted, modified, or incorporated into a base.

- Ruined wells
- Stone arches
- Snow temples
- Bamboo shrines
- Swamp huts
- Ash forges
- Tree houses
- Forest towers
- Lighthouses

### Earth underground structures

- Mine shafts
- Crystal vaults
- Mushroom hamlets
- Buried libraries
- A unique rocket silo

### Dimension structures

Other dimensions generate their own repeated structure type:

- Moon: lunar outposts and lunar monoliths
- Emberdeep: ember fortresses
- Frostvoid: ice cathedrals
- Prismatica: prism spires
- Blacktide Abyss: drowned domes
- Verdant Wilds: living temples
- Clockwork Expanse: gear towers
- Lucid Dream: impossible houses
- Cloudsea: cloud shrines
- The Static: glitch obelisks

---

## Time and weather

### Day/night cycle

One complete cycle lasts **20 real-time minutes**:

- Day: 15 minutes
- Night: 5 minutes

Dawn and dusk blend gradually. Time affects sky color, lighting, bed behavior, crop growth, weather, and the Moon Stalker ritual.

### Weather timing

Weather selects a new segment approximately every **75 seconds** and blends for roughly six seconds between states. Available weather depends on biome, depth, and dimension.

### Weather reference

| Weather | Main effects |
|---|---|
| Clear | Normal visibility and growth |
| Breezy | Wind pushes gases, projectiles, pickups, and flying creatures |
| Rain | Deposits water, extinguishes fire, cools lava into steam, and accelerates crops |
| Thunderstorm | Heavy rain, strong wind, low visibility, lightning, and fastest crop growth |
| Snowfall | Deposits snow and slows crops |
| Blizzard | Heavy snow, severe wind, low visibility, and strongly reduced crop growth |
| Dense fog | Greatly reduced visibility and slightly improved crop growth |
| Heatwave | Evaporates water, melts snow, extends fire, and slows crops |
| Ashfall | Deposits ash, reduces visibility, and slows crops |
| Ocean storm | Very strong wind, rain, lightning, and rapid crop growth |
| Cave drips | Adds occasional water underground and slightly accelerates crops |
| Spore haze | Reduces visibility, can convert dirt to mycelium, and accelerates crops |

### Lightning

During lightning weather, a strike can occur approximately every 7–15 seconds.

- Deals 18 damage near impact.
- Ignites nearby flammable terrain.
- Produces a flash, shockwave, particles, camera shake, and sound.

### Wind

Wind affects:

- Smoke and steam.
- Player and boss projectiles.
- Loose pickups and seeds.
- Flying fauna.
- Some boss rituals and attack patterns.

---

## Dimensions and portals

Every destination is a separate infinite world state, not a biome hidden at a distant Earth coordinate. The same local coordinates can exist independently in every dimension.

Each dimension preserves its own:

- Generated and modified chunks.
- Terrain changes.
- Plants and crops.
- Fauna and invaders.
- Loose pickups.
- Enemy nests and active invasion state.
- Furniture.
- Last meaningful player position.
- Visited status.

### Dimension reference

| Dimension | Gravity | Oxygen | Terrain and atmosphere | Main structure |
|---|---:|:---:|---|---|
| **Earth** | 1.00× | Yes | Seven blended biomes, caves, oceans, full weather, fauna, structures, and bosses | Many Earth structures |
| **Moon** | 0.38× | No | Infinite cratered regolith, crystals, low gravity, clear sky | Lunar outposts / monoliths |
| **Emberdeep** | 1.08× | No | Ash ridges, lava veins, volcanic caverns, heatwaves and ashfall | Ember fortress |
| **Frostvoid** | 0.82× | Yes | Snow shelves, crystal ice, water pockets, fog and blizzards | Ice cathedral |
| **Prismatica** | 0.72× | Yes | Faceted crystal terrain and shifting neon tint | Prism spire |
| **Blacktide Abyss** | 0.90× | No | Infinite submerged seabed, dark ocean storms and fog | Air-filled drowned dome |
| **Verdant Wilds** | 0.92× | Yes | Living soil, buried roots, mycelium, rain and fog | Living temple |
| **Clockwork Expanse** | 1.25× | No | Heavy-gravity stepped machine terrain and crystal mechanisms | Gear tower |
| **Lucid Dream** | 0.48× | Yes | Undulating fungal terrain, spore haze, dreamlike geometry | Impossible house |
| **Cloudsea** | 0.32× | Yes | Floating land above an endless void, wind and thunderstorms | Cloud shrine |
| **The Static** | 0.66× | No | Corrupted discontinuous terrain, void tears, fog and lightning | Glitch obelisk |

### Opening a portal

Type a destination code during normal play. A temporary portal appears in nearby clear space.

- The portal remains open for approximately 20 seconds if unused.
- Touch it to begin a short 24-frame transit.
- The destination loads around its saved return position.
- First-time visits use a protected landing area.
- Arrival grants brief invulnerability.
- Entering a code for the current dimension displays a message instead of creating a redundant portal.
- A code portal is temporary and is not restored from a save.
- Dimension travel safely returns a stolen weapon so it cannot be stranded in another world.

### Portal codes (spoilers)

Portal bookshelves reveal these inside the game. Expand the section only when you want the complete list.

<details>
<summary>Show every portal code</summary>

| Destination | Type during play |
|---|---|
| Earth | `Homeward` |
| Moon | `MoonMe` |
| Emberdeep | `BurnBright` |
| Frostvoid | `ColdSnap` |
| Prismatica | `NeonPulse` |
| Blacktide Abyss | `BlackTide` |
| Verdant Wilds | `GrowWild` |
| Clockwork Expanse | `TickTock` |
| Lucid Dream | `LucidLoop` |
| Cloudsea | `CloudNine` |
| The Static | `GlitchMe` |

</details>

### Important dimension rules

- Boss rituals and normal bosses operate only on Earth.
- The Moon never appears naturally inside Earth generation.
- Earth continues to generate normal Earth biomes at arbitrarily distant coordinates.
- Portal travel does not erase or merge either world.
- Gravity changes movement, falls, swimming, projectiles, and bunnyhop routes.
- No-oxygen dimensions consume breath even when the player is not underwater.

---

## The rocket and the Moon

Earth contains one unique underground rocket silo in the early portion of the generated world.

To launch:

1. Find the underground silo.
2. Enter its marked launch zone near the rocket.
3. Press `W`, `Up`, or `Space`.
4. The launch sequence locks the player through ignition, ascent, space travel, and lunar landing.

The rocket switches the active world from Earth to the separate Moon dimension. It does not move the player to a distant Earth coordinate.

The Moon has:

- 0.38× gravity.
- No breathable oxygen.
- Infinite lunar terrain.
- Craters, regolith, crystal deposits, monoliths, and outposts.
- Clear weather.
- Large potential bunnyhop distances.

Use `Homeward` or another dimension code to leave. `MoonMe` provides a hidden direct route that bypasses the rocket.

---

## Fauna and enemy behavior

Earth supports **78 ordinary species** across surface and underground habitats. Six additional species appear only through unstable dimension invasions.

### Ordinary fauna by habitat

<details>
<summary>Show the full 78-species Earth roster</summary>

#### Plains

Meadow hare, field mouse, prairie deer, burrow badger, honey bee, grassland fox, tusk boar, thorn hornet, and songbird.

#### Snow Peaks

Grey wolf, snow hare, mountain goat, woolly yak, snow owl, cliff penguin, glacier beetle, frost fox, ice mite, and snow wolf.

#### Bamboo Grove

Giant panda, red panda, bamboo pheasant, leaf gecko, bamboo beetle, dart frog, stalker mantis, and vine snake.

#### Swamp

Dart frog, marsh frog, reed duck, bog turtle, firefly, lantern newt, swamp rat, giant leech, mosquito swarm, mud crab, and bog crawler.

#### Volcano

Ember lizard, ash beetle, magma moth, cinder imp, fire bat, lava crab, ash crawler, and obsidian scarab.

#### Giant Forest

Thorn hornet, red squirrel, forest deer, hedgehog, songbird, dusk owl, bark beetle, grey wolf, giant spider, stump mimic, and vine crawler.

#### Ocean

Cliff penguin, reef fish, seahorse, sea turtle, dolphin, moon jelly, sand crab, lantern fish, piranha, shark pup, electric eel, and reef squid.

#### Standard caves

Cave bat, glow worm, stone beetle, cave spider, rock mite, crystal scorpion, burrow worm, and cave slime.

#### Mushroom caverns

Spore moth, mushroom snail, glowcap beetle, puffcap hopper, mycelial grub, and sporeling.

Some species appear in more than one biome, so the grouped habitat lists contain repeated names while the registry contains 78 unique ordinary species.

</details>

### Temperament and movement

Species can be passive or hostile and can walk, hop, fly, swim, climb, charge, ambush, or burrow. Ordinary creatures respond to terrain, liquids, lava, fire, weather wind, attacks, and nearby threats.

Defeated creatures can drop food and materials such as meat, hides, fur, feathers, eggs, horns, fangs, claws, chitin, silk, venom, slime, glow dust, spores, fish, shells, pearls, electric glands, and crystal fragments.

### Advanced behavior roles

#### Burrowers

Burrowers enter solid terrain, follow the player beneath the surface, leave visible disturbances, and erupt when close.

Examples: burrow badger, burrow worm, Frost Borer.

#### Wall climbers

Climbers detect blocked pursuit routes, attach to walls, and move vertically.

Examples: red squirrel, bark beetle, giant spider, red panda, cave spider, glow worm, Gear Gremlin, Void Climber.

#### Pack hunters

Nearby allies increase pursuit speed up to a cap and split to different sides of the player instead of stacking into one path.

Examples: grassland fox, grey wolf, snow wolf, fire bat, piranha, thorn hornet, Ember Raider, Static Leech.

#### Mimics

Mimics remain motionless and resemble terrain until approached, attacked, or burned. They then reveal themselves and leap into combat.

Examples: stump mimic, sporeling, Prism Mimic.

#### Nest builders

Builders can establish persistent nests when left undisturbed.

- Build time: roughly 18 seconds.
- Reinforcement interval: roughly 12 seconds.
- Nest lifetime: roughly four minutes.
- Maximum: eight nests per dimension.
- Nests stop producing reinforcements when the active enemy count reaches 18.

Examples: giant spider, cave spider, thorn hornet, honey bee, sporeling, Ember Raider, Void Climber.

#### Scavengers

Scavengers sense nearby loose seeds, produce, and loot, pursue them, consume them, heal, and gain a small bounded growth bonus.

Examples: field mouse, swamp rat, tusk boar, sand crab, mud crab, Gear Gremlin.

#### Parasites

Parasites can leave the normal enemy layer and attach directly to the player.

- Up to three can attach at once.
- Each attachment slows movement and swimming.
- They inflict periodic damage.
- Sustained movement and jumping builds shake-off progress.
- A removed parasite returns to the world with reduced health.

Examples: giant leech, rock mite, ice mite, Static Leech.

#### Weapon thieves

Gear Gremlins can steal the currently equipped weapon.

- The stolen weapon disappears from the `Q` cycle.
- The carrier visibly displays the weapon icon.
- Defeat the carrier to restore it immediately.
- Dimension travel also restores it as a safety measure.

### Full tactical-update scope

Only fauna in the camera chunk receives the full tactical behavior update. This keeps large persistent worlds and advanced roles within the performance budget.

---

## Unstable rift invasions

Natural unstable rifts are rare timed encounters. They are not caused by typed portal codes, the Reality Zipper, player actions, boss rituals, or enemy nests.

### Timing

- First possible natural invasion: **6–10 minutes** after a fresh world begins.
- Later invasions: **12–20 minutes apart**.
- Maximum active natural rifts: **one**.

### Behavior

- The source dimension is chosen from a dimension other than the current one.
- The rift opens roughly 25–42 pixels to one side of the player.
- It remains active for up to approximately 16 seconds.
- It releases a finite wave of 3–6 invaders.
- The portal closes after the wave or when its lifetime ends.
- Active invasion state is dimension-scoped and save-compatible.

### Invasion-only species

| Invader | Main roles |
|---|---|
| Ember Raider | Charging pack hunter and nest builder |
| Frost Borer | Armored burrower |
| Prism Mimic | Durable terrain ambusher |
| Gear Gremlin | Scavenger, wall climber, and weapon thief |
| Static Leech | Flying pack parasite |
| Void Climber | Wall-climbing nest builder |

Portal colors identify the source dimension. The `RIFT RAID` status remains visible during an active invasion.

---

## Bosses and rituals

Earth contains **14 bosses**. Bosses do not appear randomly: each one has an environmental ritual that must be maintained for several seconds. The HUD shows the ritual title, requirement, and progress when the player is in the correct context.

General rules:

- Only one boss can be active at a time.
- Ritual progress decays slowly when interrupted rather than instantly resetting.
- Required inventory offerings are consumed only when a ritual completes.
- Boss encounter and defeat state is saved.
- Combat weapons can damage bosses; the Hook is primarily for traversal and the Destruculator is primarily for extraction.
- Defeating a boss awards crystal score.
- Several bosses require a previous boss victory or a total victory count.

### Ritual table (major spoilers)

<details>
<summary>Show every boss, ritual, and reward</summary>

| Boss | HP | Location and ritual | Offering consumed | Reward |
|---|---:|---|---|---:|
| **Caldera Tyrant** | 320 | In a Volcano surface region, remain near the caldera center with at least eight nearby lava/fire cells for 180 frames | None | 25 crystals |
| **Abyssal Sea Serpent** | 380 | In deep Ocean water, carry at least one fresh or cooked fish and remain submerged in the ritual area for 180 frames | 1 fish | 30 |
| **Frost Colossus** | 420 | In Snow Peaks during snowfall or blizzard, carry 12 snow for 180 frames | 12 snow | 28 |
| **Bog Leviathan** | 390 | In Swamp mire, carry three venom sacs and stand in mud/water during night, rain, thunderstorm, or fog for 180 frames | 3 venom sacs | 27 |
| **Mycelial Monarch** | 440 | In a Mushroom Cavern, keep at least 16 nearby fungal terrain cells and three nearby fires for 180 frames | None | 32 |
| **Bamboo War Machine** | 410 | In a Bamboo Grove, carry eight bamboo while at least six bamboo cells and one fire are nearby for 180 frames | 8 bamboo | 29 |
| **Ancient Canopy Wyrm** | 360 | In Giant Forest, carry two bright feathers, climb at least 18 pixels above ground, and remain in strong wind for 180 frames | 2 bright feathers | 28 |
| **Crystal Burrower** | 460 | Deep underground: exceed 58 pixels of depth, remain near five crystal cells, and carry five crystal fragments for 180 frames | 5 crystal fragments | 35 |
| **Magma Behemoth** | 500 | Deep below a Volcano: exceed 48 pixels of depth and maintain at least five lava and two steam cells nearby for 180 frames | None | 38 |
| **Storm Roc** | 370 | On exposed Plains terrain during a thunderstorm, remain under an open sky for 240 frames | None | 30 |
| **Moon Stalker** | 340 | On any Earth surface at deep night, remove nearby fire and remain almost completely still for 240 frames | None | 34 |
| **The Drowned Fleet** | 520 | After defeating the Sea Serpent, carry three pearls and stand exposed in an Ocean storm for 180 frames | 3 pearls | 40 |
| **Sky Jellyfish** | 400 | After the appropriate Snow or Ocean boss chain, carry two electric glands and stand high/exposed in a severe storm for 180 frames | 2 electric glands | 36 |
| **The World Eater** | 650 | After five boss victories, travel at least 1.5 biome regions from the original spawn, descend more than 48 pixels below the surface, and remain there for 180 frames | None | 50 |

</details>

### Boss combat traits

- **Caldera Tyrant:** flies above the crater and fires spread fireballs.
- **Abyssal Sea Serpent:** emerges from deep water and launches water bursts.
- **Frost Colossus:** throws ice boulders and takes severe extra damage from heat.
- **Bog Leviathan:** erupts from mire, dives, repositions, and launches mud.
- **Mycelial Monarch:** spreads spores and fungal terrain and can create minions.
- **Bamboo War Machine:** fires bamboo shards and can repair itself from nearby bamboo.
- **Ancient Canopy Wyrm:** moves through the canopy and attacks with branches.
- **Crystal Burrower:** tunnels and fires crystal shards.
- **Magma Behemoth:** launches magma rocks, heals in lava, and is vulnerable to water and steam.
- **Storm Roc:** uses wind and marked lightning attacks.
- **Moon Stalker:** teleports, fires homing shadow bolts, and weakens as dawn arrives.
- **The Drowned Fleet:** behaves as a large warship and launches terrain-breaking cannonballs.
- **Sky Jellyfish:** floats through storms and attacks with electric orbs.
- **The World Eater:** tunnels through terrain and uses destructive world-spit projectiles.

### Environmental boss damage

Bosses can be affected by simulated terrain:

- Most bosses take lava damage.
- Frost Colossus takes especially high fire and lava damage.
- Mycelial Monarch, Bamboo War Machine, and Canopy Wyrm take increased fire damage.
- Magma Behemoth behaves differently around lava and is harmed by cooling reactions.

---

## Saving and world slots

The game stores saves in browser `localStorage`.

### Slots

- Three independent save slots.
- The last active slot is loaded automatically at startup.
- Each slot shows seed, day, biome, HP, hunger, and save time.

### Save controls

- `F5`: save active slot.
- `F9`: load active slot.
- `O` or `R`: open the slot menu.
- Pausing with `P` triggers an autosave attempt.
- Normal autosave occurs every **three minutes of active play**.
- The game saves before the browser page unloads when possible.

### What is saved

A slot preserves:

- World seed and time.
- Active dimension and return position in every dimension.
- Player position, velocity, HP, hunger, breath, bunnyhop state, parasites, and theft state.
- Equipped weapon, cooldowns, Laser Rifle heat, build mode, seed mode, and magnifier.
- Inventory materials, seeds, produce, loot, and crafted furniture.
- Sparse terrain changes and crop metadata.
- Plants.
- Boss progress and victories.
- Weather state.
- Relevant projectiles and pickups.
- Dimension-scoped fauna, nests, invasions, and furniture.
- Rocket progress and visited dimensions.

Only modified terrain cells and necessary entity state are serialized. Unchanged procedural terrain is regenerated from the seed when loaded.

### Temporary-state safety

- An active Reality Zipper is collapsed before saving.
- A typed destination portal is not restored after loading.
- Saving during portal transit does not permanently lock the player.
- A stolen weapon cannot become permanently stranded during dimension travel.

### Browser-storage warning

Clearing site data, private-browsing storage, or browser local storage can erase world slots. Copy the package or browser profile data separately when long-term preservation is important.

---

## Useful player tips

### Starting a first base

1. Use the Destruculator to gather wood, rock, dirt, leaves, and crystal material.
2. Build a compact terrain shell with an open door footprint.
3. Craft a door, floor lamp, collector chest, bed, ladder, and planter.
4. Put the collector chest near a farm or common combat area.
5. Use a wall switch near the entrance to operate nearby doors and lights together.
6. Place a portal bookshelf to learn destination codes without reading spoilers.

### Surviving an oxygenless dimension

- Begin with full health, hunger, and breath.
- Open the return portal before exploring far when possible.
- Use low gravity to move quickly, but avoid losing the portal position.
- Keep cooked food ready for health recovery.
- Blacktide also consumes breath through its atmosphere even when inside an air-filled structure.

### Preserving terrain

- Use the Gun, Sword, Glaive, or Hook when you do not want to reshape the world.
- Use the Destruculator for exact extraction.
- Grenades, drone strikes, Nyan Cat, fire, napalm, bosses, and the laser can cause large secondary reactions.
- The Reality Zipper restores its original snapshot, but materials can continue moving while it is open.

### Gathering ritual items

- Fish and pearls come from ocean fauna.
- Venom sacs come from venomous creatures such as spiders, snakes, scorpions, and swamp enemies.
- Bright feathers come from appropriate bird species.
- Electric glands come from electric eels.
- Crystal fragments come from crystal-related creatures and invaders.

### Combat against advanced enemies

- Watch the ground disturbance for burrowers.
- Fight pack hunters before their group bonus builds.
- Burn or approach suspicious terrain to expose mimics.
- Destroy nest builders before they finish establishing a nest.
- Pick up valuable drops before scavengers reach them.
- Move and jump continuously to shake parasites off.
- Prioritize a Gear Gremlin carrying a stolen weapon.
- Close doors to block ordinary attackers, but remember that burrowers and climbers can bypass simple walls.

### Bunnyhop practice

Jump immediately after each landing. The `BHOP ×N` indicator confirms the chain. Long, flat routes are easiest; walls and water reset it.

### Drone-strike targeting

Choose a column with visible sky access. The strike hits the first solid terrain from above, not the exact cursor depth.

### Laser safety

Release the trigger before reaching maximum heat. Short controlled bursts avoid the overheat lockout and reduce accidental terrain melting.

---

## Run locally and develop

The project uses browser-native JavaScript modules and a small custom standalone bundler. There are no package dependencies to install for gameplay or tests.

### Requirements

- A modern browser with Canvas, ES modules, and `localStorage`.
- Node.js for building and testing.
- Python 3 for the included `npm run serve` command.

### Standalone build

Open:

```text
index.html
```

This page loads:

```text
dist/game.bundle.js
```

### Development server

```bash
npm run serve
```

Open:

```text
http://localhost:8080/dev.html
```

### Rebuild the standalone bundle

```bash
npm run build
```

### Run the complete regression suite

```bash
npm test
```

The browser console exposes the active game object as:

```js
window.pixelWorldGame
```

This provides access to state, systems, and stores for debugging.

---

## Project structure

```text
.
├── index.html                  # Direct-open standalone entry
├── dev.html                    # Native-module development entry
├── styles.css                  # Full-window canvas and accessibility styles
├── dist/
│   └── game.bundle.js          # Generated standalone bundle
├── scripts/
│   └── build-standalone.mjs    # Project bundler
├── src/
│   ├── config.js               # Simulation constants and system limits
│   ├── game.js                 # Runtime composition and main loop
│   ├── main.js                 # Browser bootstrap
│   ├── pixel-grid.js           # Integer-grid enforcement
│   ├── player-geometry.js      # Authoritative player collision geometry
│   ├── data/                   # Materials, weapons, crops, fauna, bosses, weather, dimensions, furniture
│   ├── render/                 # Palette, renderer, pixel font, player sprite, reticle
│   ├── state/                  # Initial game state
│   ├── stores/                 # World, entity, and inventory stores
│   ├── systems/                # Player, weapons, enemies, bosses, weather, saves, furniture, materials, crops
│   ├── ui/                     # In-canvas HUD and overlays
│   └── world/                  # Noise, generation, chunks, cells, and authored structures
└── tests/                      # Regression and standalone smoke tests
```

### Runtime architecture

`src/game.js` composes the data stores and systems, then executes a fixed-step loop with:

- 60 Hz target simulation.
- Maximum three catch-up steps per animation frame.
- Integer-pixel normalization after simulation.
- Separate render and simulation responsibilities.
- A 3×3 active chunk neighborhood.
- Sparse persistent world changes.

---

## Testing and performance

The regression suite covers:

- DOM and startup contracts.
- Player stepping, spawn safety, depenetration, jumping, and bunnyhopping.
- Swimming classification, surface stability, breath, oxygen, and rotated rendering.
- Every major weapon and targeting rule.
- Terrain, liquids, gases, fire, napalm, steam, grass recovery, and crops.
- Biome blending, structures, Moon travel, and all dimensions.
- All bosses and rituals.
- Fauna, advanced behaviors, nests, parasites, thieves, and invasion frequency.
- Furniture recipes, placement, collision, interaction, persistence, and dimensions.
- Weather, visibility, HUD, cooking, save/load, and performance.
- Pixel-only rendering and integer-grid invariants.
- Source-module and standalone-bundle smoke tests.

### Performance safeguards

- Only nine chunks are active around the player.
- Full tactical enemy behavior is limited to the camera chunk.
- Material updates use active-cell tracking and visible-chunk simulation.
- Terrain rendering uses a persistent image cache.
- Cave and fungal-noise queries are cached during chunk generation.
- Catch-up work is capped.
- Effects are pooled and bounded:
  - 320 generic particles.
  - 28 damage numbers.
  - 24 local flashes.
  - 12 shockwaves.
  - Eight hit-stop frames maximum.
  - 14 terrain-reaction bursts per frame.
- One Reality Zipper rift.
- One natural unstable invasion portal.
- Eight enemy nests per dimension.
- Three attached parasites.
- 160 furniture objects per dimension.
- 600 loose crop/loot pickups.

The renderer uses hard-edged pixel operations and disables smoothing so the 360×210 internal image remains crisp at any browser-window size.

---

## Design summary

Infinite Pixel World combines:

- Procedural Earth biomes and caves.
- Eleven independent infinite dimensions.
- A cellular material sandbox.
- Survival through health, hunger, breath, and atmosphere.
- Skill-based movement and bunnyhopping.
- Swimming, climbing, grappling, and low-gravity traversal.
- Eleven terrain-reactive weapons.
- Farming, weather, cooking, and food.
- Functional furniture crafting and persistent bases.
- Seventy-eight ordinary species, six invaders, and advanced enemy roles.
- Fourteen ritual bosses.
- Three local save slots with sparse world persistence.

The intended experience is systemic rather than linear: most interesting outcomes come from interactions among terrain, weather, creatures, weapons, crops, structures, furniture, and dimensions.
