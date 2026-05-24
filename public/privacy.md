# Privacy Policy — Aethelgard: Chronicles of Strata

_Last updated: 2026-05-23_

Aethelgard is an **offline single-player game**. This privacy policy
documents what data the game touches, where it stays, and what it
never does.

## TL;DR

- **No network calls.** The game does not contact any server. Ever.
- **No analytics, no telemetry, no third-party SDKs.**
- **No accounts, no login, no cloud sync.**
- **All data stays on your device.** Uninstalling the app removes it.

## What the Game Stores Locally

The following data is written to your device's local storage
(Capacitor Preferences for settings; SQLite for save games). None of
it ever leaves the device.

| Data | Where | Why |
|------|-------|-----|
| Save games | SQLite (`aethelgard` database) | Resume your last session |
| Audio mute preference | Preferences (`aethelgard.muted`) | Remember your sound choice |
| Onboarding-seen flag | Preferences (`aethelgard.onboardingSeen`) | Skip the tutorial after first run |
| Event-PRNG seed | Preferences (`aethelgard.eventPrngSeed`) | Deterministic random events across sessions |

On Android we explicitly **disable cloud backup** (`allowBackup=false`)
and **disable cross-device transfer** (`data_extraction_rules.xml`
deny-list), so even Google's own backup service does not see your
save data. See `android/app/src/main/AndroidManifest.xml`.

## What the Game Reads From Your Device

To pick an appropriate map size + visual quality, the game reads:

| API | What it returns | Where it's used |
|-----|-----------------|-----------------|
| `Device.getInfo()` | Memory + disk hints | Map-size tier selection only — see `src/core/map-size.ts` |
| WebGL renderer string | GPU model | Not currently used; future quality auto-detect (M_AUDIT2.SEC2.30) |
| Audio context sample rate | Audio output capability | Howler init (audio playback) |

None of these are transmitted off-device.

## What the Game Does **NOT** Do

- Camera, microphone, location, USB, serial, payment — all denied via
  the Permissions-Policy meta tag.
- Push notifications — the Google Services / Firebase plugin is
  explicitly **not** activated (see `android/app/build.gradle`
  M_SEC.20).
- Advertising IDs — never read.
- Contacts, calendar, files outside the app's own storage — never
  accessed.

## Third-Party Assets

The game ships with assets licensed under CC0 (Kenney) and CC-BY
(KayKit, audio packs). These are baked into the install package; no
runtime fetch. Attribution is in the in-game Credits screen
(M_AUDIT2.SEC2.34) and in `references/credits.md`.

## Children's Privacy

The game collects no personal information from any user, including
children under 13. There is no account system, no chat, no
user-generated-content upload path.

## Changes to This Policy

Changes to this policy land in `git log -- PRIVACY.md` and are
summarised in the CHANGELOG for any release that touches data
handling. The version-controlled file is the source of truth.

## Contact

Questions: `jonbogaty@gmail.com` with subject prefix
`[aethelgard-privacy]`.
