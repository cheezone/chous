import { MoveRuleValidator } from "./move";
import { ThoseOnlyRuleValidator } from "./thoseOnly";
import { NoFilesRuleValidator } from "./no";
import { HasFileRuleValidator } from "./has";
import { AllowRuleValidator } from "./allow";
import { NamingRuleValidator } from "./naming";
import { InDirOnlyRuleValidator } from "./inDirOnly";
import { DepsRuleValidator } from "./deps";
import { ExclusiveRuleValidator, OneToolPerRoleValidator } from "./stack";
import { ManifestRuleValidator, WorkspaceRuleValidator } from "./manifest";
import { LifecycleRuleValidator } from "./lifecycle";
import type { RuleValidator } from "./types";

/**
 * All available rule validators
 */
export const validators: RuleValidator[] = [
  new MoveRuleValidator(),
  new ThoseOnlyRuleValidator(),
  new NoFilesRuleValidator(),
  new HasFileRuleValidator(),
  new AllowRuleValidator(),
  new NamingRuleValidator(),
  new InDirOnlyRuleValidator(),
  new DepsRuleValidator(),
  new OneToolPerRoleValidator(),
  new ExclusiveRuleValidator(),
  new ManifestRuleValidator(),
  new WorkspaceRuleValidator(),
  new LifecycleRuleValidator(),
];

/**
 * Find a validator that can handle the given rule
 */
export function findValidator(rule: any): RuleValidator | undefined {
  return validators.find(v => v.canHandle(rule));
}

export type { RuleValidator, RuleValidatorContext } from "./types";
export { processInDirOnlyGroup } from "./inDirOnly";
export { BaseRuleValidator } from "./base";
