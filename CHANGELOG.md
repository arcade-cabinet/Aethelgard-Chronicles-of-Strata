# Changelog

All notable changes to Aethelgard: Chronicles of Strata will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- M0 foundation: pnpm + Vite + TypeScript (strict) project scaffold
- React + react-three-fiber render shell
- koota ECS dependency and module layout
- Biome lint/format configuration (strict, no `as any`)
- Vitest node + browser project configuration with smoke tests
- Playwright e2e configuration with desktop + mobile projects
- Capacitor Android configuration (`com.arcadecabinet.aethelgard`)
- Asset ingest pipeline: `references/` → `public/assets/` with `manifest.json` contract
- Typed asset accessor (`createAssetAccessor`) with logical-id resolution
- Asset curation map for M1 board tiles (Kenney Hexagon Kit, CC0)
- Pillar documentation set (`docs/specs/00` through `99`)
- Milestone contract docs (`docs/milestones/M0` through `M6`)
- GitHub Actions CI: build/test + Android debug APK jobs
- GitHub Pages deploy workflow
- Coverage gates (`.claude/gates.json`): visual-test coverage, RNG determinism, `as any` ban
- release-please configuration for automated changelog + version management
