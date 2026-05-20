export const ENGINE_KEYS = ['google', 'github', 'shodan'] as const;
export type EngineKey = (typeof ENGINE_KEYS)[number];

export type OperatorValueType =
  | 'text'
  | 'enum'
  | 'number'
  | 'range'
  | 'date'
  | 'date-range'
  | 'url'
  | 'domain';

export type OperatorSpec = {
  key: string;
  label: string;
  description: string;
  category?: string;
  valueType: OperatorValueType;
  enumValues?: string[];
  placeholder?: string;
  supportsNegation: boolean;
};
