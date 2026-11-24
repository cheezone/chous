import type { KindDef, ToolDef } from "./types";
import type { RoleId } from "./roles";
import { ROLE_IDS } from "./roles";

import pnpm from "./tools/pnpm";
import npm from "./tools/npm";
import yarn from "./tools/yarn";
import bun from "./tools/bun";
import eslint from "./tools/eslint";
import oxlint from "./tools/oxlint";
import antfuEslintConfig from "./tools/antfu-eslint-config";
import prettier from "./tools/prettier";
import oxfmt from "./tools/oxfmt";
import typescript from "./tools/typescript";
import vitest from "./tools/vitest";
import jest from "./tools/jest";
import tsdown from "./tools/tsdown";
import tsup from "./tools/tsup";
import vite from "./tools/vite";
import simpleGitHooks from "./tools/simple-git-hooks";
import husky from "./tools/husky";
import tslint from "./tools/tslint";
import nuxt from "./tools/nuxt";
import turbo from "./tools/turbo";
import nx from "./tools/nx";
import changelogen from "./tools/changelogen";
import cypress from "./tools/cypress";
import playwright from "./tools/playwright";

import library from "./kinds/library";
import cli from "./kinds/cli";
import nuxtApp from "./kinds/nuxt-app";
import viteApp from "./kinds/vite-app";
import electron from "./kinds/electron";
import nxWorkspace from "./kinds/nx-workspace";
import rustCrate from "./kinds/rust-crate";


export type KnowledgeBundle = {
  roles: readonly RoleId[];
  tools: ToolDef[];
  kinds: KindDef[];
};

export const knowledge: KnowledgeBundle = {
  roles: ROLE_IDS,
  tools: [
    pnpm,
    npm,
    yarn,
    bun,
    eslint,
    oxlint,
    antfuEslintConfig,
    prettier,
    oxfmt,
    typescript,
    vitest,
    jest,
    tsdown,
    tsup,
    vite,
    simpleGitHooks,
    husky,
    tslint,
    nuxt,
    turbo,
    nx,
    changelogen,
    cypress,
    playwright,
  ],
  kinds: [library, cli, nuxtApp, viteApp, electron, nxWorkspace, rustCrate],
};

export function getKnowledge(): KnowledgeBundle {
  return knowledge;
}

/** JSON-serializable dump for `chous knowledge --json` and external agents. */
export function knowledgeToJSON(): unknown {
  return {
    roles: [...knowledge.roles],
    tools: knowledge.tools,
    kinds: knowledge.kinds,
  };
}
