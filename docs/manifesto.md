# The chous manifesto

> It works. It still stinks.

chous checks a repository's taste: whether it is clean, orderly, and built on things that have not rotted. It does not check correctness, security, performance, features or tests. A repository full of bugs can be elegant; one that works perfectly can be ugly.

There is one taste. It cannot be configured or switched off. chous has the right to point out ugliness; you have the right to keep it.

## Four tastes

### Modernity

- What has reached end of life stinks, from the day it ends. There is no grace period. That it still runs has nothing to do with it.
- What its authors deprecated, or call legacy or in maintenance mode themselves, stinks.
- A healthy old technology does not stink. No chasing the new, no pecking order: slow, old or unfashionable is not a smell, and neither is silence nobody announced.

### Order

- One thing, one name; one directory, one way of naming.
- The root is an entrance, not a heap.
- Hidden files count like any others: a directory starting with `.` does not make what is in it smell any less.
- Configuration as gathered as it can be without crossing responsibilities: one tool's config in one place, each tool its own.
- Nothing laid out flat, nothing piled up. Hundreds of files in one directory, every responsibility in one file: neither is organised.
- One fact, said once.
- Which tools you use, how many, and how many dependencies, is yours to decide.

### Convention

- Where a language says how names are written, follow it. Where its makers call it unclear or stay unopinionated, chous prescribes nothing either.
- Supporting several runtimes is fine, and so is the duplication it needs; saying one thing twice and disagreeing is not.
- The convention is what the official docs say, word for word.

### Cleanliness

- No build output, OS junk or personal settings in the repository.
- No leftovers of the work: hand-made backups, one-off scripts, the record of one session. History belongs to version control, the story of a change to its pull request.
- No installers in the source tree, and nothing too large for its history. What a build hands to users belongs in releases.
- An empty file created for what comes next is fine. Empty is not useless.

## What chous knows

chous only states facts it is sure of, so every finding is one of two:

- **Smell**: the fact is certain and it goes against the taste above. There is nothing to decide.
- **To review**: the fact is certain, but what it means needs context chous does not have. You or your agent decide.

These are not degrees of badness but degrees of knowledge. There are no errors, warnings or hints, and no score. Smells make chous exit non-zero; things to review never do.

**A wrong fact is a false positive; a different taste is not.** Missing something is acceptable; stating something false is not. Well-known projects compromise too, and chous makes no exception for any of them; nor are they the standard of taste.

## What chous does not do

- It does not punish what is missing: no tests, no CI, no license. chous looks only at the choices you made.
- Line counts, sizes and file counts settle nothing: past chous's stance they are only a reason to look. Whether responsibilities have piled up is the agent's call, and it **must not split files mechanically**.
- It does not read the words in a name. A rule that has to guess again in every language is not a fact. Only names a tool or the operating system defines count, and only with content to confirm them.
- It adds no exceptions to suit a project.
- It does not collect knowledge that moves. A rule that would stop holding after three years without upkeep does not belong: apart from end of life and declared deprecation, a rule that needs a particular software's name and version is not collected.
- It does not go online, call an AI or need a key.

## What the agent judges

Some taste needs the code read and understood. That is not written into chous's rules; an agent judges it by this manifesto:

- Whether a long file chous lists carries too many responsibilities. Its line count is only a reason to look; a compiler's code generator is large for good reason. **Do not split a file mechanically to bring its line count down**: one file per responsibility, not one file per thousand lines.
- Whether a flat directory chous lists should be grouped by responsibility.
- Which of the identical files chous lists are needed (an icon per screen density) and which were pasted.
- Whether a tool's config is out of date, misplaced or shadowed by another: read the tool's current docs, or run its own diagnostics.
- Languages mixed without reason: one responsibility written in two languages, or a new language brought in for a sliver of functionality.
- Old implementations kept in comments: history belongs to version control.
- Compatibility, adapter and forwarding layers that nothing calls any more.
- Duplicated implementations and needless abstraction.
- Generated code committed without the means to generate it.
- Dispatch records, task reports, delivery notes and per-version release notes piled up in the source and docs: once the work is done, its story is in pull requests and the changelog. The agent can read them and decide which still belong.
- Whether a file is still of use: a work log, a hand-made backup, a one-off script, whether `plugin/` and `plugins/` are one thing. chous does not read the words in names; an agent can read the files and decide whether they go in docs/, in a pull request, or away.

`chous manifesto` prints this document and `chous --json` prints every finding as data, so an agent can read the taste first and then review the whole repository, not only what chous listed.

What chous checks, its numbers and its evidence: [chous's rules](rules.md).
