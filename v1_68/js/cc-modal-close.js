/**
 * Universal modal close: backdrop/outside click + Escape.
 * Usage: ccBindModalClose({ modal: 'id' | el, close: fn, backdrop?: 'id' | el, isVisible?: fn, visibleClass?: 'visible' })
 */
(function () {
  'use strict';
  function resolve(elOrId) {
    return typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  }
  window.ccBindModalClose = function (opts) {
    var modal = resolve(opts.modal);
    var backdrop = opts.backdrop ? resolve(opts.backdrop) : null;
    var close = opts.close;
    var visibleClass = opts.visibleClass || 'visible';
    var isVisible = opts.isVisible || function () { return modal && modal.classList.contains(visibleClass); };
    if (!modal) return;
    if (!close) close = function () { modal.classList.remove(visibleClass); };
    if (backdrop) {
      backdrop.addEventListener('click', close);
    } else {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) close();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!isVisible()) return;
      close();
      e.preventDefault();
    });
  };
})();
