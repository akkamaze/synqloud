export type FogSeed = readonly [number, number];

export interface FogFrame {
  seconds: number;
  density: number;
}

export interface FogRenderer {
  readonly kind: 'webgl' | 'canvas';
  draw(frame: FogFrame): void;
  dispose(): void;
}
