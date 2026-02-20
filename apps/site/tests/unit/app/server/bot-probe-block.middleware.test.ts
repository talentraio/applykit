import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setResponseStatus = vi.fn();
const setResponseHeader = vi.fn();

let requestPath = '/';

vi.mock('h3', () => ({
  defineEventHandler: (handler: (event: unknown) => unknown) => handler,
  getRequestURL: () => new URL(`https://applykit.work${requestPath}`),
  setResponseHeader,
  setResponseStatus
}));

beforeEach(() => {
  vi.resetModules();
  setResponseStatus.mockClear();
  setResponseHeader.mockClear();
  requestPath = '/';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('bot-probe-block server middleware', () => {
  it.each(['/wordpress/wp-admin/setup-config.php', '/wp-admin', '/wp-login.php', '/xmlrpc.php'])(
    'returns 404 for blocked probe path %s',
    async path => {
      requestPath = path;

      const module = await import('../../../../server/middleware/bot-probe-block');
      const handler = module.default as (event: unknown) => unknown;
      const event = {};

      const result = handler(event);

      expect(setResponseStatus).toHaveBeenCalledWith(event, 404, 'Not Found');
      expect(setResponseHeader).toHaveBeenCalledWith(
        event,
        'content-type',
        'text/plain; charset=utf-8'
      );
      expect(result).toBe('Not Found');
    }
  );

  it('does nothing for regular app routes', async () => {
    requestPath = '/vacancies';

    const module = await import('../../../../server/middleware/bot-probe-block');
    const handler = module.default as (event: unknown) => unknown;

    const result = handler({});

    expect(setResponseStatus).not.toHaveBeenCalled();
    expect(setResponseHeader).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
