import { tool } from "../../define";
import { legacy } from "../../kinds";

const DOCS = "https://raw.githubusercontent.com/docker/docs/main/content";

export default tool({
  id: "compose",
  name: "Docker Compose",
  researched: "2026-11",
  configs: ["compose.yaml", "compose.yml"],
  legacy: ["docker-compose.yaml", "docker-compose.yml"],
  facts: [
    legacy({
      id: "composeVersion",
      match: /(^|\/)(docker-)?compose(\.[\w-]+)?\.ya?ml$/,
      when: (f) => (/^version\s*:/m.test(f.text()) ? {} : undefined),
      message: { en: "a top-level version: Docker calls it obsolete and warns about it; delete the line", zh: "顶层的 version：Docker 称它已过时，用了会警告；删掉这一行" },
      sources: [
        { url: "https://docs.docker.com/reference/compose-file/version-and-name/", check: `${DOCS}/reference/compose-file/version-and-name.md`, quote: "you'll receive a warning message that it is obsolete if used." },
      ],
      examples: {
        smell: [{ "compose.yaml": "version: '3.8'\nservices: {}\n" }],
        clean: [{ "compose.yaml": "services:\n  web:\n    environment:\n      version: 1\n" }],
      },
    }),
    legacy({
      id: "composeName",
      match: /(^|\/)docker-compose(\.[\w-]+)?\.ya?ml$/,
      message: {
        en: "the old name: Docker prefers compose.yaml and keeps docker-compose.yml for earlier versions",
        zh: "旧文件名：Docker 首选 compose.yaml，docker-compose.yml 只是为了兼容旧版本",
      },
      sources: [
        {
          url: "https://docs.docker.com/compose/intro/compose-application-model/",
          check: `${DOCS}/manuals/compose/intro/compose-application-model.md`,
          quote: "Compose also supports docker-compose.yaml and docker-compose.yml for backwards compatibility of earlier versions.",
        },
      ],
      examples: {
        smell: [{ "docker-compose.yml": "services: {}\n" }, { "docker-compose.override.yml": "services: {}\n" }],
        clean: [{ "compose.yaml": "services: {}\n" }],
      },
    }),
  ],
});
