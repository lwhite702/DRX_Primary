export type FlagPrimitive = boolean | string | number;

export type FlagValue = FlagPrimitive | Record<string, unknown> | undefined;

export type FlagGroups = Record<string, string>;

export type FlagEvaluationContext = {
  distinctId?: string;
  userId?: string;
  businessId?: string;
  role?: string;
  personProperties?: Record<string, unknown>;
  groups?: FlagGroups;
  request?: {
    method?: string;
    path?: string;
    userAgent?: string;
  };
  defaultValue?: boolean;
};

export type NormalizedFlagEvaluationContext = {
  distinctId: string;
  personProperties: Record<string, unknown>;
  groups: FlagGroups;
};

export type ServerFlagProvider = {
  getBooleanFlag(
    key: string,
    context?: FlagEvaluationContext,
    defaultValue?: boolean,
  ): Promise<boolean>;
  getFlagValue<TValue extends FlagValue>(
    key: string,
    context?: FlagEvaluationContext,
    defaultValue?: TValue,
  ): Promise<TValue | FlagValue>;
};
