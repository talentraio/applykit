/**
 * Google OAuth Login Endpoint
 *
 * Handles complete Google OAuth flow:
 * - Initial request: Redirects to Google consent screen
 * - Callback: Handles OAuth response and creates/updates user session
 *
 * T059 [US1] GET /api/auth/google (initial redirect)
 * T060 [US1] GET /api/auth/google/callback (OAuth callback - handled automatically by nuxt-auth-utils)
 *
 * Note: nuxt-auth-utils automatically manages both the redirect and callback
 * with a single defineOAuthGoogleEventHandler
 */

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    const { email, sub: googleId } = user

    if (!email || !googleId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required user information from Google',
      })
    }

    // Find or create user
    const { userRepository } = await import('../../data/repositories/user')

    let dbUser = await userRepository.findByGoogleId(googleId)

    if (!dbUser) {
      // New user - create with default public role
      dbUser = await userRepository.create({
        email,
        googleId,
        role: 'public',
      })
    }
    else {
      // Existing user - update last login
      await userRepository.updateLastLogin(dbUser.id)
    }

    // Set session
    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      },
    })

    // Redirect to dashboard
    return sendRedirect(event, '/dashboard')
  },

  async onError(event, error) {
    console.error('OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_failed')
  },
})
