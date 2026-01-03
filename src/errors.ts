import type { TranslationFunctions } from "./i18n/i18n-types";

export type FsLintErrorKey =
  | { key: "parser.invalidWhereDirective"; lineNum: number }
  | { key: "parser.invalidPathDirective"; lineNum: number }
  | { key: "parser.ruleFormatError"; params: { rule: string; line: string }; lineNum: number }
  | { key: "parser.renameMissingSources"; params: { line: string }; lineNum: number }
  | { key: "parser.unknownPreset"; params: { name: string }; lineNum: number }
  | { key: "parser.cannotParseLine"; params: { line: string }; lineNum: number };

export class FsLintError extends Error {
  readonly kind = "FsLintError";
  readonly info: FsLintErrorKey;
  configPath?: string;

  constructor(info: FsLintErrorKey, configPath?: string) {
    super(info.key);
    this.info = info;
    this.configPath = configPath;
  }
}

export function isFsLintError(err: unknown): err is FsLintError {
  return Boolean(err) && typeof err === "object" && (err as any).kind === "FsLintError";
}

export function formatFsLintError(LL: TranslationFunctions, err: FsLintError): string {
  const i = err.info;
  const pathPrefix = err.configPath ? `${err.configPath}:` : "";
  const prefix = `${pathPrefix}${i.lineNum} `;
  switch (i.key) {
    case "parser.invalidWhereDirective":
      return prefix + String(LL.errors.parser.invalidWhereDirective());
    case "parser.invalidPathDirective":
      return prefix + String(LL.errors.parser.invalidPathDirective());
    case "parser.ruleFormatError":
      return prefix + String(LL.errors.parser.ruleFormatError(i.params));
    case "parser.renameMissingSources":
      return prefix + String(LL.errors.parser.renameMissingSources(i.params));
    case "parser.unknownPreset":
      return prefix + String(LL.errors.parser.unknownPreset(i.params));
    case "parser.cannotParseLine":
      return prefix + String(LL.errors.parser.cannotParseLine(i.params));
  }
}

