/**
 * Minimal auth stub — no backend, no tier, no payment, no Recent/Likes.
 * All export and imagine work locally.
 */
(function () {
  'use strict';

  function ensureImagine(opts) {
    if (!opts.chords && !opts.rhythm && !opts.notes && !opts.sound && !opts.human) {
      alert('Turn on at least one of Chords, Rhythm, Notes, Human, or Sound.');
      return Promise.resolve(false);
    }
    if (typeof window.ccRandomize === 'function') {
      window.ccRandomize(opts);
    }
    return Promise.resolve(true);
  }

  function ensureSaveMidi() {
    return Promise.resolve(true);
  }

  function ensureSaveWav() {
    return Promise.resolve(true);
  }

  function ensureSaveAndLike() {
    return Promise.resolve({ ok: true });
  }

  window.chordcanvasAuth = {
    ensureImagine: ensureImagine,
    ensureSaveMidi: ensureSaveMidi,
    ensureSaveWav: ensureSaveWav,
    ensureSaveAndLike: ensureSaveAndLike,
    refreshMe: function () { return Promise.resolve(); },
    updateCreditsDisplay: function () {},
    goToGoogleSignIn: function () {},
    openLoginModal: function () {},
    closeLoginModal: function () {},
    closeUserMenu: function () {},
    openPlanModal: function () {},
    closePlanModal: function () {},
    getCredits: function () { return { remaining: 0, limit: 0 }; },
    setCreditsDisplayOverride: function () {},
    getUser: function () { return null; },
    getPlan: function () { return 'proplus'; },
    isLoggedIn: function () { return true; }
  };
})();
