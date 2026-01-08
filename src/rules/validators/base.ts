import { resolve } from "node:path";
import type { Rule } from "../../types";
import type { RuleValidator, RuleValidatorContext } from "./types";
import { evaluateWhenConditions } from "./conditions";

/**
 * Rule execution metrics
 */
export interface RuleMetrics {
  duration: number; // Duration in milliseconds
  hitCount: number; // Number of files/directories matched by this rule
}

/**
 * Statistics collector for rule execution
 */
export class RuleStatisticsCollector {
  private metrics = new Map<number, RuleMetrics>();

  /**
   * Record rule execution metrics
   */
  record(ruleIndex: number, metrics: RuleMetrics): void {
    this.metrics.set(ruleIndex, metrics);
  }

  /**
   * Get metrics for a specific rule
   */
  getMetrics(ruleIndex: number): RuleMetrics | undefined {
    return this.metrics.get(ruleIndex);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<number, RuleMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

/**
 * Base class for all rule validators with built-in statistics tracking
 */
export abstract class BaseRuleValidator<R extends Rule = Rule> implements RuleValidator<R> {
  /**
   * Check if this validator can handle the given rule
   */
  abstract canHandle(rule: Rule): rule is R;

  /**
   * Internal validation method that subclasses must implement
   */
  protected abstract validateInternal(
    rule: R,
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: Rule[] }
  ): Promise<{ hitCount: number }>;

  /**
   * Check if rule should apply based on when conditions
   * This checks rule-level conditions (e.g., root directory conditions)
   */
  protected async shouldApplyRule(
    rule: R,
    context: RuleValidatorContext
  ): Promise<boolean> {
    if (!rule.when || rule.when.length === 0) {
      return true; // No conditions means rule always applies
    }

    // For rule-level conditions, check against root directory
    const rootPath = resolve(context.root);
    return await evaluateWhenConditions(rule.when, rootPath, context);
  }

  /**
   * Check if rule should apply to a specific target path
   * This checks target-level conditions (e.g., file/directory conditions)
   */
  protected async shouldApplyToTarget(
    rule: R,
    targetPath: string, // Absolute path to the file/directory being checked
    context: RuleValidatorContext
  ): Promise<boolean> {
    if (!rule.when || rule.when.length === 0) {
      return true; // No conditions means rule always applies
    }

    return await evaluateWhenConditions(rule.when, targetPath, context);
  }

  /**
   * Validate the rule with automatic statistics tracking
   */
  async validate(
    rule: R,
    context: RuleValidatorContext,
    ruleIndex: number,
    config: { rules: Rule[] }
  ): Promise<void> {
    const startTime = performance.now();
    
    // Check rule-level conditions first
    const shouldApply = await this.shouldApplyRule(rule, context);
    if (!shouldApply) {
      // Rule doesn't apply due to conditions, record zero metrics
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      if (context.statisticsCollector) {
        context.statisticsCollector.record(ruleIndex, {
          duration,
          hitCount: 0,
        });
      }
      return;
    }
    
    // Execute the actual validation
    const result = await this.validateInternal(rule, context, ruleIndex, config);
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    // Record metrics if statistics collector is available
    if (context.statisticsCollector) {
      context.statisticsCollector.record(ruleIndex, {
        duration,
        hitCount: result.hitCount,
      });
    }
  }
}
