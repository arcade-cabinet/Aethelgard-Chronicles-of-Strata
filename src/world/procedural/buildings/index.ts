/**
 * M_V11.PROCMESH.BUILDINGS — tier-2 building compositions.
 *
 * Each export is a React component composed entirely of tier-1
 * primitives (see `../primitives`). Primitives read materials from
 * the FactionMaterialsContext, so each building automatically
 * receives the per-faction palette when wrapped in a provider.
 *
 * BUILDING_COMPONENTS maps each koota BuildingType to its renderer —
 * SKINS' `structure[type].proceduralComponent` slot points at one of
 * these, and FactionBase / StructureMesh switches on it.
 */
import type { ReactElement } from 'react';
import type { BuildingType } from '@/ecs/components';
import { Barracks } from './Barracks';
import { Farm } from './Farm';
import { Granary } from './Granary';
import { House } from './House';
import { Library } from './Library';
import { Palace } from './Palace';
import { Wall } from './Wall';
import { Watchtower } from './Watchtower';
import { Wonder } from './Wonder';

export { Barracks, Farm, Granary, House, Library, Palace, Wall, Watchtower, Wonder };

/** Generic shape every building accepts so consumers can switch on
 *  BuildingType without inspecting which composition is wired. */
export type ProceduralBuildingComponent = (props: {
  position?: [number, number, number];
}) => ReactElement;

export const BUILDING_COMPONENTS: Record<BuildingType, ProceduralBuildingComponent> = {
  Palace: Palace as ProceduralBuildingComponent,
  Barracks: Barracks as ProceduralBuildingComponent,
  Wall: Wall as ProceduralBuildingComponent,
  Watchtower: Watchtower as ProceduralBuildingComponent,
  Farm: Farm as ProceduralBuildingComponent,
  House: House as ProceduralBuildingComponent,
  Granary: Granary as ProceduralBuildingComponent,
  Library: Library as ProceduralBuildingComponent,
  Wonder: Wonder as ProceduralBuildingComponent,
  // M_V11.BUILDINGS-EXPANSION (#77e) — new buildings reuse existing
  // closest procmesh until dedicated compositions land (per-building
  // procmesh polish lands in follow-up commits). The mapping is:
  //   Market    ≈ Granary  (storage silo shape — Market is a goods
  //                          hub; reads as "place where things stack")
  //   Embassy   ≈ Library  (civic temple shape — Embassy is a civic
  //                          building too)
  //   Lighthouse ≈ Watchtower (tall tower w/ flag)
  //   MageTower ≈ Watchtower (tall tower w/ glow)
  //   Workshop  ≈ Barracks  (wood-frame industrial building)
  Market: Granary as ProceduralBuildingComponent,
  Embassy: Library as ProceduralBuildingComponent,
  Lighthouse: Watchtower as ProceduralBuildingComponent,
  MageTower: Watchtower as ProceduralBuildingComponent,
  Workshop: Barracks as ProceduralBuildingComponent,
};
