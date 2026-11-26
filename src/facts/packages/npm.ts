/**
 * npm packages with something wrong about them. Every entry meets one of
 * these checkable facts — facts that stay true once they are true:
 *
 * - deprecated (a smell): its own authors deprecated it, or call it legacy
 *   (moment), where npm itself does not say so: npm's `deprecated` field is
 *   read from the lockfile (src/vfs/lockfile.ts). Bower is not here: its
 *   README says it is maintained.
 *
 * "Old", "slow", "written in the wrong language", "the platform has one now" or
 * "there is something newer" are not rot: reusing a package is no smell. Those change; facts do not. Silence is not evidence either: an
 * unmaintained project nobody declared dead is left alone.
 *
 * `why` is the reason chous gives (`dep.<first name>`); `sources` hold the
 * authors' own words, required for every entry.
 */
import { packages } from "../define";

export default packages([
  // Deprecated, or called legacy, by its own authors where npm does not say so (npm's own `deprecated` is read from the lockfile).
  { kind: "deprecated", names: ["moment"], use: "dayjs / date-fns / Temporal", why: { en: "Its maintainers call it a legacy project in maintenance mode.", zh: "维护者称它为处于维护模式的遗留项目。" }, sources: [{ url: "https://momentjs.com/docs/#/-project-status/", check: "https://raw.githubusercontent.com/moment/moment/develop/README.md", quote: "Moment.js is a legacy project, now in maintenance mode" }] },
  { kind: "deprecated", names: ["babel-polyfill", "@babel/polyfill"], use: "a modern runtime target", why: { en: "Deprecated by Babel as of 7.4.0, in favor of core-js/stable.", zh: "Babel 自 7.4.0 起宣布废弃，改用 core-js/stable。" }, sources: [{ url: "https://babeljs.io/docs/babel-polyfill", check: "https://raw.githubusercontent.com/babel/website/main/docs/polyfill.md", quote: "As of Babel 7.4.0, this package has been deprecated" }] },
  { kind: "deprecated", names: ["karma"], use: "a browser-mode test runner (Vitest, Playwright)", why: { en: "Deprecated by its authors.", zh: "作者已宣布废弃。" }, sources: [{ url: "https://github.com/karma-runner/karma#readme", check: "https://raw.githubusercontent.com/karma-runner/karma/master/README.md", quote: "Karma is deprecated and is not accepting new features or general bug fixes." }] },
  { kind: "deprecated", names: ["react-scripts"], use: "a framework, or Vite / Parcel / Rsbuild", why: { en: "Create React App was deprecated in 2025.", zh: "Create React App 已于 2025 年废弃。" }, sources: [{ url: "https://github.com/facebook/create-react-app#readme", check: "https://raw.githubusercontent.com/facebook/create-react-app/main/README.md", quote: "## Deprecated" }] },
  { kind: "deprecated", names: ["@vue/cli-service"], use: "create-vue (Vite)", why: { en: "Its authors: Vue CLI is now in maintenance mode.", zh: "作者原话：Vue CLI 已进入维护模式。" }, sources: [{ url: "https://github.com/vuejs/vue-cli#readme", check: "https://raw.githubusercontent.com/vuejs/vue-cli/dev/README.md", quote: "Vue CLI is now in maintenance mode." }] },
  { kind: "deprecated", names: ["react-test-renderer"], use: "@testing-library/react", why: { en: "Deprecated by React and no longer maintained.", zh: "React 官方已宣布废弃，不再维护。" }, sources: [{ url: "https://www.npmjs.com/package/react-test-renderer", check: "https://raw.githubusercontent.com/facebook/react/main/packages/react-test-renderer/README.md", quote: "react-test-renderer is deprecated and no longer maintained." }] },

]);
