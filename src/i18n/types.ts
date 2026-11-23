import type en from "./en";

/** `"a {x} b {y}"` → `"x" | "y"` */
type Params<S extends string> = S extends `${string}{${infer P}}${infer Rest}` ? P | Params<Rest> : never;

type Translate<S extends string> = [Params<S>] extends [never]
  ? () => string
  : (params: Record<Params<S>, unknown>) => string;

type Functions<T> = {
  [K in keyof T]: T[K] extends string ? Translate<T[K]> : Functions<T[K]>;
};

type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : Shape<T[K]>;
};

/** Every locale must have the same keys as English. */
export type Translation = Shape<typeof en>;

export type TranslationFunctions = Functions<typeof en>;
