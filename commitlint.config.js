/**
 * M_FUN.FOUNDATION.COMMITLINT — enforce conventional commits.
 *
 * Already honoured by convention; this config makes it mechanical.
 * Husky hook in .husky/commit-msg invokes commitlint on every
 * commit. Bypass with --no-verify (banned by the commit-gate hook
 * per the standard-repo profile).
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow longer subject lines for sub-task ids
    // (M_FUN.QA.AIVAI.TUNE.PATTERN-G etc).
    'subject-case': [0],
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
