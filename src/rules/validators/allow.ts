import type { AllowRule } from "../../types";
import { BaseRuleValidator } from "./base";

/**
 * `allow` only widens the root whitelist (folded in by the compiler).
 * It never cancels a ban: a taste that bans something means it.
 */
export class AllowRuleValidator extends BaseRuleValidator<AllowRule> {
  canHandle(rule: any): rule is AllowRule {
    return rule.kind === "allow";
  }

  protected async validateInternal(): Promise<{ hitCount: number }> {
    return { hitCount: 0 };
  }
}
