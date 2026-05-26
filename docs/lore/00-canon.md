---
title: Aethelgard Canon — World, Strata, Eras, Bestiary
updated: 2026-05-25
status: current
domain: creative
---

# The Canon of Aethelgard

This is the founding lore document. Every faction sheet, biome
description, Discovery row, and MYTH-event flavour line traces back
here. New canon proposals open a PR against this file first, then
ripple into the dependent docs (`factions/`, `biomes.md`, the
`MYTH` JSON registry, the Discovery descriptions).

## I. The world

**Aethelgard** is a continental archipelago of hexagonal land-tiles
floating on a sea of glass-clear, faintly luminescent water. The
geometry is literal — every tile is a perfect hex, every coastline
zigzags between flat edges, every mountain rises as a faceted
cone. The natives have never known a curved shore. Their cartography
is exact; their navigation is by tile-count, not by stars.

The realm sits atop **The Strata** — eleven nested sedimentary layers
of magic-laden stone laid down across the deep past. Each stratum was
deposited during one of the great ages and carries that age's
character: the **Glacial Stratum** at the base is cold and slow; the
**Verdant Stratum** above it pulses with growth-magic; the **Ember
Stratum** higher up hums with fire and iron; the **Mythic Stratum**
near the surface flickers with the residual will of forgotten gods.
Where the strata break the surface, gold-veined runes ignite and the
land remembers what it once was.

The strata are why the factions fight. Holding a tile means holding
its column of strata, and the deeper your column, the more eras of
magic you can draw on.

## II. The eras (and their game-mode mapping)

The fiction recognises six **Eras**, each named for the dominant
mode of conflict in that age. The game's six modes (M_MODES) map
one-to-one to those eras — playing a mode is playing in its era.

| Era | Game mode | Character |
|---|---|---|
| **Era of Border-Clash** | `border-clash` | Two thrones, one border, no quarter. The classical raze-the-other-keep duel. |
| **Era of Frontier-Raid** | `frontier-raid` | A defender's age — raids from beyond the cartographic edge test how long a kingdom can hold its frontier. |
| **Era of Long-Reign** | `long-reign` | The endurance age. A dynasty that survives long enough through escalating mythic events earns its place in the chronicle. |
| **Era of Strata-Wars** | `strata-wars` | The territorial age. Whoever holds the strata long enough redraws the map. |
| **Era of the Aged Strata** | `age-of-strata` | The grand-strategic age (4X). N rival realms; technology, diplomacy, wonders, and the Renaissance-tier mythic ascendancy. |
| **Era of Coexistence** | `coexistence` | The pacific age — the strata teach restraint. Conflict is muted; cohabitation is the win condition. |

A campaign is, conceptually, a journey through the eras as the
chronicler tells them. A match is one chapter.

## III. The factions

Every faction in Aethelgard descends from one of four **archetypes**
(`src/config/factions.ts` FactionConfig.archetype). The archetype
determines silhouette, signature units, and a default diplomatic
disposition; the personality (`src/config/ai-personalities.ts`) flavours
HOW the faction enacts its archetype.

| Archetype | Origin | Disposition |
|---|---|---|
| **medieval** | Heirs of the Aethelgard charter-realms, gold-banner kingdoms that codified the hex-cartography and built the first Keeps. | Lawful expansion. Wants firm borders, formal pacts, and named wars. |
| **orc** | Crimson-banner highland clans descended from the strata-miners who broke the Ember layer and bound its heat into their forges. | Pressure-applying. Prefers raid + tribute over occupation. |
| **undead** | Memory-bound revenants risen from a Glacial-Stratum incident that froze a whole realm mid-march. They wake when their strata are disturbed. | Reclamation. Wants to reseal the breached layers; treats the living as the disturbance. |
| **mystic** | Scholars + ascetics who study the Mythic Stratum directly. Robes, charts, glowing things. | Knowledge-hoarding. Trades secrets, demands sanctuaries, withdraws from war where possible. |

**Barbarian camps** (the neutral aggressors from v0.5) are *unaffiliated
strata-bound revenants* — fragments of the same Glacial incident, but
too localised and undirected to form a faction. They guard a tile and
attack what comes near.

## IV. The bestiary (unit-level lore)

| Unit | What it is | Why it matters |
|---|---|---|
| **Peon** | Non-combatant strata-attuned labourer. Carries a chisel; the chisel is also a holy implement of measurement. | Peons "harvest" by *singing the strata awake*. They never fight because to take a life is to break the chant. |
| **Footman** | A peon who took an oath at the Keep's brazier. The gold pauldron is the oath-mark. | Their morale comes from the brazier; if the keep falls, the foot does too. |
| **Watchtower** | A stone-and-brazier post that sees a 3-hex radius via strata-resonance. | Sees through fog because the strata under fog still hum to the brazier. |
| **Wall** | A masonry strip that blocks tile-to-tile pathing. | The mortar is strata-dust; that's why walls feel "rooted" — they're literally locked to the layer beneath them. |
| **Wonder** | A multi-era architectural marvel that fixes a Renaissance-tier breakthrough in stone. | Building a Wonder lets a faction's claim on a tile survive the faction's death. The strata remember it. |
| **Barbarian raider** | An unaffiliated revenant fragment, hex-locked to a Camp tile. | Their aggression is the strata's pain made visible. They cannot be negotiated with. |

## V. The MYTH events (in-fiction)

The MYTH events (the JSON-driven random events from v0.6 / v0.7) are
*the strata speaking*. A wildfire is the Ember Stratum venting; a
quake is the Glacial Stratum settling; a portal opening is the Mythic
Stratum yawning between two of its own resonance points. Each event
has both a mechanical effect AND an in-fiction meaning that the
companion file (`docs/lore/myth-events.md`, planned M_LORE.3) will
expand row-by-row.

## VI. The Renaissance ascendancy

When a faction in `age-of-strata` mode reaches the Renaissance era and
builds a Wonder, they have *touched the Mythic Stratum directly*.
This is the win condition's fiction: the realm has graduated from
caring about borders to caring about understanding. The Wonder is
both a building and a covenant.

## VII. Why the player's faction is "player"

Within the fiction, the player is a *Chronicler-King* — a named
sovereign whose realm the chronicler (the player) is recording. The
seed phrase is the chronicler's manuscript number; the random events
are entries the chronicler must explain after-the-fact. This is why
the GameOverModal generates a procedural nickname for the match:
each match becomes a chapter in the lorebook.

---

## Cross-references

- Per-faction lore: `docs/lore/factions/{medieval,orc,undead,mystic}.md` — planned M_LORE.1.
- Per-biome lore: `docs/lore/biomes.md` — planned M_LORE.2.
- MYTH event lore: `docs/lore/myth-events.md` — planned M_LORE.3.
- Discovery lore companion: `docs/lore/discoveries.md` — planned M_LORE.4.
- Promo prompt library: `docs/prompts/` (each prompt should be consistent with this canon — palette refs, banner colours, era language).
