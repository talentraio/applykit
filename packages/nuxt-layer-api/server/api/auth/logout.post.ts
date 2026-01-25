/**
 * Logout Endpoint
 *
 * Clears user session and logs out
 *
 * T061 [US1] POST /api/auth/logout
 */

export default defineEventHandler(async event => {
  // Clear session
  await clearUserSession(event);

  return {
    success: true
  };
});
