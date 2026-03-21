/** Shared limits for login + register (Zod + UI maxLength). */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 80;
/** Password length 0–20 (0 = no password / NULL hash on register). */
export const PASSWORD_MIN = 0;
export const PASSWORD_MAX = 20;
