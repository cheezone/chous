import type { Issue, Rule, InDirOnlyRule } from "../../types";
import type ignore from "ignore";
import type { RuleStatisticsCollector } from "./base";

/**
 * Shared context for all rule validators
 */
export interface RuleValidatorContext {
  root: string;
  cachedGlobScan: (
    pattern: string | string[],
    cwd: string,
    root: string,
    opts?: { onlyFiles?: boolean; ig?: ReturnType<typeof ignore> }
  ) => Promise<string[]>;
  ig: ReturnType<typeof ignore>;
  rawIssues: Issue[];
  debugLogMsg?: (msg: string, ...args: any[]) => void;
  // Statistics collector for rule metrics
  statisticsCollector?: RuleStatisticsCollector;
  // Additional context for complex rules
  inDirGroups?: Map<string, InDirOnlyRule[]>;
  rootAllowedSet?: Set<string>;
  filesMatchedByMoveRules?: Set<string>;
  forceStrict?: boolean;
  config?: { rules: Rule[] };
  // Track processed patterns for thoseOnly rules to allow later rules to override earlier ones
  processedThoseOnlyPatterns?: Map<string, number>;
  // Track matched glob files from "has" rules
  matchedGlobFiles?: Set<string>;
}

/**
 * Base interface for rule validators
 */
export interface RuleValidator<R extends Rule = Rule> {
  /**
   * Check if this validator can handle the given rule
   */
  canHandle(rule: Rule): rule is R;

  /**
   * Validate the rule and add issues to rawIssues
   */
  validate(
    rule: R,
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: Rule[] }
  ): Promise<void>;
}
