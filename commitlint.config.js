export default {
  extends: ['@commitlint/config-conventional'],
  plugins: ['commitlint-plugin-function-rules'],
  rules: {
    // Type must be lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Type cannot be empty
    'type-empty': [2, 'never'],
    // Type enum
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ],
    ],
    // Subject cannot be empty
    'subject-empty': [2, 'never'],
    // Subject max length
    'subject-max-length': [2, 'always', 30],
    // Subject min length
    'subject-min-length': [2, 'always', 3],
    // Disable default subject-case rule
    'subject-case': [0],
    // Custom function rule for subject-case
    'function-rules/subject-case': [
      2,
      'always',
      (parsed) => {
        const { subject, scope } = parsed;
        if (!subject) return [true];
        
        // Allow version format like "v0.1.4" for release commits
        const isVersionFormat = /^v\d+\.\d+\.\d+/.test(subject);
        if (isVersionFormat && scope === 'release') {
          // Check if contains Chinese characters
          const hasChinese = /[\u4e00-\u9fa5]/.test(subject);
          if (hasChinese) {
            return [
              false,
              `subject must not contain Chinese characters, but got: "${subject}"`,
            ];
          }
          return [true];
        }
        
        // Check if first letter is uppercase (if it's a letter)
        const firstChar = subject[0];
        const isLetter = /[a-zA-Z]/.test(firstChar);
        if (isLetter) {
          const isUpperCase = firstChar === firstChar.toUpperCase();
          if (!isUpperCase) {
            return [
              false,
              `subject must start with uppercase letter, but got: "${subject}"`,
            ];
          }
        }
        
        // Check if contains Chinese characters
        const hasChinese = /[\u4e00-\u9fa5]/.test(subject);
        if (hasChinese) {
          return [
            false,
            `subject must not contain Chinese characters, but got: "${subject}"`,
          ];
        }
        
        return [true];
      },
    ],
    // Disable body (description)
    'body-max-length': [2, 'always', 0],
    'body-max-line-length': [2, 'always', 0],
  },
};
