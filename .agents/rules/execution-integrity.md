# Execution Integrity Rules

## 1. Quality Over Speed
- NEVER prioritize speed or the "appearance of rapid completion" over rigorous verification.
- Quality of work is the only measure that matters.
- Take whatever time is necessary to verify thoroughly.

## 2. Exit Code 0 Means Nothing Alone
- An exit code 0 is meaningless if there are warnings, swallowed errors, invalid credentials, or broken data anywhere in the logs.
- Every line of output must be inspected and verified.

## 3. Codebase-Specific Truth, Not Generic "Best Practices"
- Do NOT introduce generic, theoretical "best practices" that pollute the codebase or break existing test suites.
- Practice strictly what is right for THIS codebase, keeping all changes isolated, minimal, and fully compatible with existing tests and architecture.
