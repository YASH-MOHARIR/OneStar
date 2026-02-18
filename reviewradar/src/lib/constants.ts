export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "ReviewRadar";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const PLAN_LIMITS = {
  FREE: 3,
  STARTER: 10,
  PRO: 50,
  TEAM: 200,
} as const;
