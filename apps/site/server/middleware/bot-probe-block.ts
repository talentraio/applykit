import { defineEventHandler, getRequestURL, setResponseHeader, setResponseStatus } from 'h3';

const blockedProbePatterns = [
  /^\/wordpress(?:\/|$)/i,
  /^\/wp-admin(?:\/|$)/i,
  /^\/wp-login\.php(?:\/|$)/i,
  /^\/xmlrpc\.php(?:\/|$)/i
];

const isBlockedProbePath = (pathname: string): boolean =>
  blockedProbePatterns.some(pattern => pattern.test(pathname));

export default defineEventHandler(event => {
  const pathname = getRequestURL(event).pathname;

  if (!isBlockedProbePath(pathname)) {
    return;
  }

  setResponseStatus(event, 404, 'Not Found');
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8');
  setResponseHeader(event, 'cache-control', 'public, max-age=300');

  return 'Not Found';
});
