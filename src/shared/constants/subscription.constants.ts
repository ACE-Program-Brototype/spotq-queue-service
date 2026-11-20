export const SUBSCRIPTION_PLAN_CODES = {
	QUEUE_PRO: 'QUEUE_PRO',
} as const;

export type SubscriptionPlanCode =
	(typeof SUBSCRIPTION_PLAN_CODES)[keyof typeof SUBSCRIPTION_PLAN_CODES];

export const SUBSCRIPTION_PLAN = SUBSCRIPTION_PLAN_CODES;
export type SubscriptionPlan = SubscriptionPlanCode;
