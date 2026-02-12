import { isString } from './typeguards';

export const parseListFromEnv = (env: unknown): string[] => {
  if (!isString(env)) {
    return [];
  }

  return env
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};
