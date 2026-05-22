/**
 * Hand-written type declarations for the yuka subset used by src/ai/.
 *
 * yuka@0.7.8 ships only a UMD/ESM bundle (no .d.ts). These declarations cover
 * exactly the classes and members accessed by the AI subpackage; they do not
 * attempt to type the full library.
 *
 * When yuka publishes official types, delete this file and run `pnpm check`.
 */
declare module 'yuka' {
  /** A 3-component vector (x, y, z). */
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
    add(v: Vector3): this;
    sub(v: Vector3): this;
    subVectors(a: Vector3, b: Vector3): this;
    multiplyScalar(s: number): this;
    divideScalar(s: number): this;
    normalize(): this;
    length(): number;
    squaredDistanceTo(v: Vector3): number;
    toArray(out?: number[]): number[];
    fromArray(arr: readonly number[]): this;
  }

  /** A walkable path of Vector3 waypoints. */
  export class Path {
    loop: boolean;
    constructor();
    add(waypoint: Vector3): this;
    clear(): this;
    current(): Vector3;
    finished(): boolean;
    advance(): this;
    toJSON(): object;
    fromJSON(json: object): this;
  }

  /** Abstract base steering behaviour. */
  export class SteeringBehavior {
    active: boolean;
    weight: number;
    calculate(vehicle: Vehicle, force: Vector3, delta?: number): Vector3;
    toJSON(): object;
    fromJSON(json: object): this;
  }

  /** Seek toward a target position. */
  export class SeekBehavior extends SteeringBehavior {
    target: Vector3;
    constructor(target?: Vector3);
  }

  /** Arrive (decelerate) at a target position. */
  export class ArriveBehavior extends SteeringBehavior {
    target: Vector3;
    deceleration: number;
    tolerance: number;
    constructor(target?: Vector3, deceleration?: number, tolerance?: number);
  }

  /** Follow a Path of waypoints. */
  export class FollowPathBehavior extends SteeringBehavior {
    path: Path;
    nextWaypointDistance: number;
    /** Internal ArriveBehavior used for the last waypoint. */
    _arrive: ArriveBehavior;
    /** Internal SeekBehavior used for intermediate waypoints. */
    _seek: SeekBehavior;
    constructor(path?: Path, nextWaypointDistance?: number);
  }

  /** Manages and accumulates steering behaviours for a Vehicle. */
  export class SteeringManager {
    vehicle: Vehicle;
    behaviors: SteeringBehavior[];
    constructor(vehicle: Vehicle);
    add(behavior: SteeringBehavior): this;
    remove(behavior: SteeringBehavior): this;
    clear(): this;
    calculate(delta: number, result: Vector3): Vector3;
  }

  /** Base game entity with a world transform. */
  export class GameEntity {
    uuid: string;
    name: string;
    position: Vector3;
    rotation: { x: number; y: number; z: number; w: number };
    active: boolean;
    update(delta: number): this;
  }

  /** Kinematic entity with velocity. */
  export class MovingEntity extends GameEntity {
    velocity: Vector3;
    maxSpeed: number;
    updateOrientation: boolean;
    getSpeedSquared(): number;
    lookAt(target: Vector3): this;
  }

  /** Steerable vehicle — the central class used by the AI subpackage. */
  export class Vehicle extends MovingEntity {
    mass: number;
    maxForce: number;
    steering: SteeringManager;
    smoother: null;
    update(delta: number): this;
  }

  /** Manages the lifecycle of all GameEntity instances. */
  export class EntityManager {
    constructor();
    add(entity: GameEntity): this;
    remove(entity: GameEntity): this;
    clear(): this;
    update(delta: number): this;
  }
}
