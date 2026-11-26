import { tool } from "../../define";
import { unread } from "../../kinds";
import { type ContractFile, nearest } from "../../kit";

const NOTES = "https://raw.githubusercontent.com/rails/rails/main/guides/source";

/** The Rails version a project locks, from the nearest Gemfile.lock: `[8, 0]`. */
function railsVersion(f: ContractFile): [number, number] | undefined {
  const dir = nearest(f, "Gemfile.lock");
  if (dir === undefined) return undefined;
  const m = /^ {4}(?:rails|railties) \((\d+)\.(\d+)/m.exec(f.read(`${dir}Gemfile.lock`));
  return m ? [Number(m[1]), Number(m[2])] : undefined;
}

const lock = (version: string) => `GEM\n  remote: https://rubygems.org/\n  specs:\n    rails (${version})\n`;

export default tool({
  id: "rails",
  name: "Rails",
  researched: "2026-11",
  facts: [
    unread({
      id: "railsSecrets",
      files: ["config/secrets.yml"],
      when: (f) => {
        const v = railsVersion(f);
        return v && (v[0] > 7 || (v[0] === 7 && v[1] >= 2)) ? { version: `${v[0]}.${v[1]}` } : undefined;
      },
      message: {
        en: "Rails {{version}} no longer reads config/secrets.yml: Rails 7.2 removed Rails.application.secrets; use credentials",
        zh: "Rails {{version}} 不再读 config/secrets.yml：Rails 7.2 已移除 Rails.application.secrets；改用 credentials",
      },
      sources: [
        { url: "https://guides.rubyonrails.org/7_1_release_notes.html", check: `${NOTES}/7_1_release_notes.md`, quote: "Deprecate usage of `Rails.application.secrets`." },
        { url: "https://guides.rubyonrails.org/7_2_release_notes.html", check: `${NOTES}/7_2_release_notes.md`, quote: "Remove deprecated `Rails.application.secrets`." },
      ],
      examples: {
        smell: [{ "Gemfile.lock": lock("8.0.5.2"), "config/secrets.yml": "development:\n  secret_key_base: x\n" }],
        clean: [{ "Gemfile.lock": lock("7.1.3"), "config/secrets.yml": "development:\n  secret_key_base: x\n" }, { "config/secrets.yml": "development: {}\n" }],
      },
    }),
  ],
});
