import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LintResult, Rule, RuleMetrics } from "../types";

export type RuleStatsEntry = {
  index: number;
  kind: Rule["kind"];
  rule: Rule;
  configPath: string;
  duration: number;
  hitCount: number;
};

export type StatsOutput = {
  configPath: string;
  root: string;
  totalDuration: number;
  totalHits: number;
  totalRules: number;
  rules: RuleStatsEntry[];
  timestamp: string;
};

/**
 * Generate statistics JSON output from lint result
 */
export function generateStatsJson(result: LintResult): StatsOutput | null {
  if (!result.ruleMetrics || result.ruleMetrics.size === 0) {
    return null;
  }

  if (!result.rules) {
    return null;
  }

  const rules: RuleStatsEntry[] = [];
  let totalDuration = 0;
  let totalHits = 0;

  // Sort by rule index to maintain order
  const sortedEntries = Array.from(result.ruleMetrics.entries()).sort((a, b) => a[0] - b[0]);

  for (const [index, metrics] of sortedEntries) {
    const rule = result.rules[index];
    if (!rule) continue;

    rules.push({
      index,
      kind: rule.kind,
      rule,
      configPath: result.configPath,
      duration: metrics.duration,
      hitCount: metrics.hitCount,
    });

    totalDuration += metrics.duration;
    totalHits += metrics.hitCount;
  }

  return {
    configPath: result.configPath,
    root: result.root,
    totalDuration,
    totalHits,
    totalRules: rules.length,
    rules,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Write statistics to JSON file
 */
export function writeStatsJson(result: LintResult, outputPath: string): void {
  const stats = generateStatsJson(result);
  if (!stats) {
    return;
  }

  const absolutePath = resolve(outputPath);
  writeFileSync(absolutePath, JSON.stringify(stats, null, 2) + "\n", { encoding: "utf8" });
}
