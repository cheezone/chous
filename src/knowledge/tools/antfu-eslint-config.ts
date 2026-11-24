import { defineTool } from "../types";

/** antfu's shared ESLint flat config. */
export default defineTool({
  id: "@antfu/eslint-config",
  name: "@antfu/eslint-config",
  roles: {
    formatter: {
      // antfu eslint-config also formats — prettier is the sibling to forbid
      signals: [{ type: "deps", names: ["@antfu/eslint-config"] }],
      files: [],
    },
  },
});
