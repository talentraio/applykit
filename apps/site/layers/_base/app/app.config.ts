export default defineAppConfig({
  redirects: {
    auth: {
      landingTryIt: '/auth/post-login'
    },
    postLogin: {
      resolver: '/auth/post-login',
      hasVacancies: '/vacancies',
      noVacancies: '/resume',
      fallback: '/resume'
    },
    protected: {
      unauthenticated: '/login'
    }
  },
  resume: {
    autosaveDelay: 2000
  }
});
