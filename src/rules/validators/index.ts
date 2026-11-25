import { NoFilesRuleValidator } from "./no";
import { DepsRuleValidator } from "./deps";
import { ExclusiveRuleValidator, OneToolPerRoleValidator } from "./stack";
import { ManifestRuleValidator, WorkspaceRuleValidator } from "./manifest";
import { LifecycleRuleValidator } from "./lifecycle";
import { ArtifactsRuleValidator, CaseRuleValidator, WorklogRuleValidator } from "./hygiene";
import type { Rule } from "../../types";
import type { RuleValidator } from "./types";

const validators: RuleValidator[] = [
  new NoFilesRuleValidator(),
  new DepsRuleValidator(),
  new OneToolPerRoleValidator(),
  new ExclusiveRuleValidator(),
  new ManifestRuleValidator(),
  new WorkspaceRuleValidator(),
  new LifecycleRuleValidator(),
  new ArtifactsRuleValidator(),
  new WorklogRuleValidator(),
  new CaseRuleValidator(),
];

export function findValidator(rule: Rule): RuleValidator | undefined {
  return validators.find((v) => v.canHandle(rule));
}

export type { RuleValidator, RuleValidatorContext } from "./types";
