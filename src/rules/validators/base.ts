import type { Rule } from "../../types";
import type { RuleValidator, RuleValidatorContext } from "./types";

/** Base class for rule validators. */
export abstract class BaseRuleValidator<R extends Rule = Rule> implements RuleValidator<R> {
  abstract canHandle(rule: Rule): rule is R;

  protected abstract validateInternal(rule: R, context: RuleValidatorContext): Promise<{ hitCount: number }>;

  async validate(rule: R, context: RuleValidatorContext): Promise<void> {
    await this.validateInternal(rule, context);
  }
}
