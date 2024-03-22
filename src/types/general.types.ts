export type anyPrimitive = Record<string, string | number | boolean>;

export type anyObject = Record<string, number | string | anyPrimitive | string[] | number[]>;
