type ColorFn = (s: string) => string;

/**
 * The report's palette, after oxlint's (miette's): a finding's headline in the
 * colour of its verdict, locations in blue, measurements in magenta, the way
 * out in a quiet teal. Everything else is plain, bold or dim.
 */
export type Colorizer = {
  enabled: boolean;
  bold: ColorFn;
  dim: ColorFn;
  green: ColorFn;
  /** A smell: something to fix. */
  smell: ColorFn;
  /** Something to review: a fact whose purpose only the project knows. */
  review: ColorFn;
  /** A path. */
  link: ColorFn;
  /** A measurement beside a path: lines, sizes, counts. */
  label: ColorFn;
  /** What to do about it. */
  help: ColorFn;
};

function wrap(code: string, s: string): string {
  return `\u001b[${code}m${s}\u001b[0m`;
}

/** 24-bit colour where the terminal says it has it, else the nearest of the 256. */
function tone(rgb: [number, number, number], xterm: number, truecolor: boolean, bold = false): ColorFn {
  const fg = truecolor ? `38;2;${rgb.join(";")}` : `38;5;${xterm}`;
  return (s) => wrap(bold ? `${fg};1` : fg, s);
}

export function supportsTruecolor(env: NodeJS.ProcessEnv = process.env): boolean {
  return /^(truecolor|24bit)$/i.test(env.COLORTERM ?? "") || env.WT_SESSION != null;
}

export function createColorizer(opts?: { enabled?: boolean; truecolor?: boolean }): Colorizer {
  const enabled = opts?.enabled ?? false;
  const id: ColorFn = (s) => s;
  if (!enabled) {
    return { enabled, bold: id, dim: id, green: id, smell: id, review: id, link: id, label: id, help: id };
  }
  const tc = opts?.truecolor ?? supportsTruecolor();
  return {
    enabled,
    bold: (s) => wrap("1", s),
    dim: (s) => wrap("2", s),
    green: (s) => wrap("32", s),
    smell: tone([225, 80, 80], 167, tc, true),
    review: tone([244, 191, 117], 216, tc, true),
    link: tone([92, 157, 255], 75, tc, true),
    label: tone([246, 87, 248], 207, tc),
    help: tone([106, 159, 181], 73, tc),
  };
}
