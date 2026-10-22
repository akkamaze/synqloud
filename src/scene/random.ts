export type RandomSource = () => number;

export const between = (random: RandomSource, minimum: number, maximum: number): number =>
  minimum + random() * (maximum - minimum);
