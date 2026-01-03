type ColorFn = (s: string) => string;

export type Colorizer = {
  enabled: boolean;
  bold: ColorFn;
  dim: ColorFn;
  red: ColorFn;
  green: ColorFn;
  yellow: ColorFn;
  cyan: ColorFn;
};

function wrap(code: string, s: string): string {
  return `\u001b[${code}m${s}\u001b[0m`;
}

export function createColorizer(opts?: { enabled?: boolean }): Colorizer {
  const enabled = opts?.enabled ?? false;
  const id: ColorFn = (s) => s;
  if (!enabled) {
    return { enabled, bold: id, dim: id, red: id, green: id, yellow: id, cyan: id };
  }
  return {
    enabled,
    bold: (s) => wrap("1", s),
    dim: (s) => wrap("2", s),
    red: (s) => wrap("31", s),
    green: (s) => wrap("32", s),
    yellow: (s) => wrap("33", s),
    cyan: (s) => wrap("36", s),
  };
}

