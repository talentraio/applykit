import { getProp, isBoolean, isNumber, isString } from './typeguards';

export type H3ErrorLike = Error & {
  statusCode: number;
  statusMessage?: string;
  fatal?: boolean;
  unhandled?: boolean;
  data?: unknown;
};

/**
 * Type guard for H3 errors.
 */
export const isH3Error = (error: unknown): error is H3ErrorLike => {
  if (!(error instanceof Error)) {
    return false;
  }

  const statusCode = getProp(error, 'statusCode');
  if (!isNumber(statusCode)) {
    return false;
  }

  const statusMessage = getProp(error, 'statusMessage');
  if (statusMessage !== undefined && !isString(statusMessage)) {
    return false;
  }

  const fatal = getProp(error, 'fatal');
  if (fatal !== undefined && !isBoolean(fatal)) {
    return false;
  }

  const unhandled = getProp(error, 'unhandled');
  if (unhandled !== undefined && !isBoolean(unhandled)) {
    return false;
  }

  return true;
};

/**
 * Safely narrows unknown error to H3Error.
 */
export const toH3Error = (error: unknown): H3ErrorLike | null => {
  return isH3Error(error) ? error : null;
};
