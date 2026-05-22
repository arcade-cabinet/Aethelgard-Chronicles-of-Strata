import type { Entity, World } from 'koota';
import { AssignedJob, Building, Harvester } from '@/ecs/components';

/**
 * Advance construction. Each peon in the BUILDING state adds
 * `harvestRate * delta` to its target building's progress. When progress
 * reaches 1.0 the building completes and the peon returns to IDLE.
 */
export function buildSystem(world: World, sites: Map<string, Entity>, delta: number): void {
  world.query(AssignedJob, Harvester).updateEach(([job, harvester]) => {
    if (job.state !== 'BUILDING') return;
    const site = sites.get(job.targetKey);
    const building = site?.get(Building);
    if (!site || !building || building.isComplete) {
      job.state = 'IDLE';
      job.targetKey = '';
      return;
    }
    const progress = Math.min(1, building.progress + harvester.harvestRate * delta);
    if (progress >= 1) {
      site.set(Building, { ...building, progress: 1, isComplete: true });
      job.state = 'IDLE';
      job.targetKey = '';
    } else {
      site.set(Building, { ...building, progress });
    }
  });
}
