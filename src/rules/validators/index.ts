import { MoveRuleValidator } from "./move";
import { ThoseOnlyRuleValidator } from "./thoseOnly";
import { RenameDirRuleValidator } from "./renameDir";
import { RenameGlobRuleValidator } from "./renameGlob";
import { NoFilesRuleValidator } from "./no";
import { HasFileRuleValidator } from "./has";
import { AllowRuleValidator } from "./allow";
import { OptionalRuleValidator } from "./optional";
import { NamingRuleValidator } from "./naming";
import { InDirOnlyRuleValidator } from "./inDirOnly";
import type { RuleValidator } from "./types";

/**
 * All available rule validators
 */
export const validators: RuleValidator[] = [
  new MoveRuleValidator(),
  new ThoseOnlyRuleValidator(),
  new RenameDirRuleValidator(),
  new RenameGlobRuleValidator(),
  new NoFilesRuleValidator(),
  new HasFileRuleValidator(),
  new AllowRuleValidator(),
  new OptionalRuleValidator(),
  new NamingRuleValidator(),
  new InDirOnlyRuleValidator(),
];

/**
 * Find a validator that can handle the given rule
 */
export function findValidator(rule: any): RuleValidator | undefined {
  return validators.find(v => v.canHandle(rule));
}

export type { RuleValidator, RuleValidatorContext } from "./types";
export { processInDirOnlyGroup } from "./inDirOnly";
export { BaseRuleValidator, RuleStatisticsCollector, type RuleMetrics } from "./base";
