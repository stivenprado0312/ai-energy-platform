// Injection tokens for AI analysis ports. Using a Symbol keeps the
// dependency graph explicit and prevents accidental collisions.
export const AI_EXPLANATION_PROVIDER = Symbol.for('AI_EXPLANATION_PROVIDER');
