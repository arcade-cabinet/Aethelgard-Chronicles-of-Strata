import * as Dialog from '@radix-ui/react-dialog';
import creditsJson from '@/config/credits.json';
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

// M_EXPANSION.D.176 — credits data lives in src/config/credits.json
// so a localisation pass or asset-pack rotation can ship without
// re-reviewing this component. Shape matches the local interface.
interface CreditSection {
  heading: string;
  entries: Array<{ name: string; license: string; author?: string; url?: string }>;
}

const SECTIONS: ReadonlyArray<CreditSection> = creditsJson as ReadonlyArray<CreditSection>;

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
          Aethelgard ships with assets and libraries from the people listed below. License terms
          vary per entry — see the right-hand column.
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

        {/* M_EXPANSION.O.144 — privacy policy link (static page in
            public/privacy.html). App-store listings + Play Store
            require a public privacy URL; this is the in-game pointer
            for users discovering through the app itself. */}
        <p
          style={{
            margin: '14px 0 4px',
            fontSize: '0.78rem',
            color: HUD_THEME.color.muted,
            textAlign: 'center',
          }}
        >
          <a
            href="./privacy.html"
            target="_blank"
            rel="noreferrer"
            style={{ color: HUD_THEME.color.accent, textDecoration: 'underline' }}
          >
            Privacy Policy
          </a>
        </p>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          style={{
            width: '100%',
            marginTop: 4,
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
