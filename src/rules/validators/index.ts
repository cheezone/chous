import { NoFilesRuleValidator } from "./no";
import { DepsRuleValidator } from "./deps";
import { OneToolPerRoleValidator } from "./stack";
import { ManifestRuleValidator, WorkspaceRuleValidator } from "./manifest";
import { LifecycleRuleValidator } from "./lifecycle";
import { ContractsRuleValidator } from "./contracts";
import { ArtifactsRuleValidator, LeftoverRuleValidator, TwinsRuleValidator } from "./hygiene";
import type { Rule } from "../../types";
import type { RuleValidator } from "./types";

const validators: RuleValidator[] = [
  new NoFilesRuleValidator(),
  new DepsRuleValidator(),
  new OneToolPerRoleValidator(),
  new ManifestRuleValidator(),
  new WorkspaceRuleValidator(),
  new LifecycleRuleValidator(),
  new ContractsRuleValidator(),
  new ArtifactsRuleValidator(),
  new LeftoverRuleValidator(),
  new TwinsRuleValidator(),
];

export function findValidator(rule: Rule): RuleValidator | undefined {
  return validators.find((v) => v.canHandle(rule));
}

export type { RuleValidator, RuleValidatorContext } from "./types";
