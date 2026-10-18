export const SUBSCRIPTION_PLAN = {
	QUEUE_PRO: 'QUEUE_PRO',
} as const;

export const SUBSCRIPTION_PLANS = SUBSCRIPTION_PLAN;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];
