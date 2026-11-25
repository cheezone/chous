import type en from "./en";

/** The shape of en.ts with any string as a leaf: what every locale must provide. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export type Messages = Shape<typeof en>;
