import * as Dialog from '@radix-ui/react-dialog';
import { HUD_THEME } from './hud-theme';
import { ModalShell } from './ModalShell';

/**
 * M_AUDIT2.SEC2.34 — Credits modal.
 *
 * Even though every bundled asset turned out to be CC0 (KayKit
 * Adventurers + Mystery, Kenney Hexagon/Nature/Castle/Town/Graveyard/
 * Tower Defense) or PixelLoops royalty-free audio — attribution is
 * not legally required — surfacing the asset authors is the right
 * thing to do for a commercial release and gives the player a clear
 * statement of provenance. The modal also includes the engine /
 * library stack so a curious developer can see the foundation.
 *
 * Reachable from TitleScreen (footer button) and SettingsModal.
 */
export interface CreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreditSection {
  heading: string;
  entries: Array<{ name: string; license: string; author?: string; url?: string }>;
}

const SECTIONS: ReadonlyArray<CreditSection> = [
  {
    heading: 'Characters & Creatures',
    entries: [
      {
        name: 'KayKit Adventurers Character Pack',
        license: 'CC0',
        author: 'Kay Lousberg',
        url: 'https://www.kaylousberg.com',
      },
      {
        name: 'KayKit Mystery Monthly (4 & 5)',
        license: 'CC0',
        author: 'Kay Lousberg',
        url: 'https://www.kaylousberg.com',
      },
    ],
  },
  {
    heading: 'World, Tiles & Structures',
    entries: [
      { name: 'Hexagon Kit', license: 'CC0', author: 'Kenney', url: 'https://kenney.nl' },
      { name: 'Nature Kit', license: 'CC0', author: 'Kenney', url: 'https://kenney.nl' },
      { name: 'Castle Kit', license: 'CC0', author: 'Kenney', url: 'https://kenney.nl' },
      { name: 'Fantasy Town Kit', license: 'CC0', author: 'Kenney', url: 'https://kenney.nl' },
      { name: 'Graveyard Kit', license: 'CC0', author: 'Kenney', url: 'https://kenney.nl' },
      { name: 'Tower Defense Kit', license: 'CC0', author: 'Kenney', url: 'https://kenney.nl' },
    ],
  },
  {
    heading: 'Audio',
    entries: [
      {
        name: 'Footsteps SFX Pack',
        license: 'PixelLoops Royalty-Free',
        author: 'PixelLoops Audio',
      },
      {
        name: 'Impact & Hit SFX Pack',
        license: 'PixelLoops Royalty-Free',
        author: 'PixelLoops Audio',
      },
      {
        name: 'Fantasy Magic Spell SFX Pack',
        license: 'PixelLoops Royalty-Free',
        author: 'PixelLoops Audio',
      },
      {
        name: 'Inventory & Item SFX Pack',
        license: 'PixelLoops Royalty-Free',
        author: 'PixelLoops Audio',
      },
      {
        name: 'Fantasy Tavern Music Pack (12 loops)',
        license: 'PixelLoops Royalty-Free',
        author: 'PixelLoops Audio',
      },
      {
        name: 'Main Menu Music Pack v1.0',
        license: 'PixelLoops Royalty-Free',
        author: 'PixelLoops Audio',
      },
      {
        name: 'Victory & Level-Complete Stingers (24)',
        license: 'PixelLoops Royalty-Free',
        author: 'PixelLoops Audio',
      },
      {
        name: 'GameLoops Vol.5 — Fantasy RPG',
        license: 'GameLoops Royalty-Free',
        author: 'GameLoops Audio',
      },
    ],
  },
  {
    heading: 'Engine & Libraries',
    entries: [
      { name: 'React + React Three Fiber', license: 'MIT', author: 'Meta + Poimandres' },
      { name: 'Three.js + drei', license: 'MIT', author: 'mrdoob et al. / Poimandres' },
      { name: 'koota (ECS)', license: 'MIT', author: 'Poimandres' },
      { name: 'Radix UI + framer-motion', license: 'MIT', author: 'WorkOS / Framer' },
      { name: 'Capacitor', license: 'MIT', author: 'Ionic' },
      { name: '@capacitor-community/sqlite', license: 'MIT', author: 'jeep-sqlite contributors' },
      { name: 'seedrandom', license: 'MIT', author: 'David Bau' },
      { name: 'Vite + Vitest + Biome', license: 'MIT', author: 'Evan You / Anthony Fu / Biome team' },
    ],
  },
];

export function CreditsModal({ open, onOpenChange }: CreditsModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <ModalShell
        zIndex={210}
        width="min(560px, 94vw)"
        maxHeight="80vh"
        contentStyle={{
          border: `1px solid ${HUD_THEME.color.border}`,
          borderRadius: 16,
          padding: 28,
          fontFamily: HUD_THEME.font.body,
          overflowY: 'auto',
        }}
      >
        <Dialog.Title
          style={{
            fontFamily: HUD_THEME.font.display,
            fontSize: '1.5rem',
            color: HUD_THEME.color.gold,
            margin: '0 0 6px',
          }}
        >
          Credits
        </Dialog.Title>
        <Dialog.Description
          style={{
            color: HUD_THEME.color.muted,
            fontSize: '0.82rem',
            margin: '0 0 20px',
          }}
        >
          Aethelgard ships with assets and libraries from the people listed
          below. License terms vary per entry — see the right-hand column.
        </Dialog.Description>

        {SECTIONS.map((section) => (
          <div key={section.heading} style={{ marginBottom: 18 }}>
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: '0.95rem',
                color: HUD_THEME.color.accent,
                fontFamily: HUD_THEME.font.display,
                letterSpacing: '0.04em',
              }}
            >
              {section.heading}
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {section.entries.map((entry) => (
                <li
                  key={entry.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '4px 0',
                    fontSize: '0.82rem',
                    color: HUD_THEME.color.text,
                  }}
                >
                  <span>
                    <strong>{entry.name}</strong>
                    {entry.author && (
                      <span style={{ color: HUD_THEME.color.muted }}> · {entry.author}</span>
                    )}
                  </span>
                  <span style={{ color: HUD_THEME.color.muted, whiteSpace: 'nowrap' }}>
                    {entry.license}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '12px',
            borderRadius: 10,
            border: `1px solid ${HUD_THEME.color.border}`,
            background: 'rgba(56,189,248,0.14)',
            color: HUD_THEME.color.accent,
            fontFamily: HUD_THEME.font.body,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </ModalShell>
    </Dialog.Root>
  );
}
