/**
 * Homepage 3D text — hide depth faces at rest so front text fully covers rear.
 * Webflow animates ._3d-text---wrap; when rotation is near zero, side/back faces
 * can bleed through on mobile. Hide them until the animation tilts the block.
 */
(function () {
  'use strict';

  const wrap = document.querySelector('._3d-text---wrap');
  const depthFaces = document.querySelectorAll('._3d-text .x-rotate-b, ._3d-text .x-rotate-k');

  if (!wrap || !depthFaces.length) return;

  const EPSILON = 0.03;

  function isRestingTransform(matrix) {
    if (!matrix || matrix.isIdentity) return true;
    return (
      Math.abs(matrix.m12) < EPSILON &&
      Math.abs(matrix.m13) < EPSILON &&
      Math.abs(matrix.m21) < EPSILON &&
      Math.abs(matrix.m23) < EPSILON &&
      Math.abs(matrix.m31) < EPSILON &&
      Math.abs(matrix.m32) < EPSILON
    );
  }

  function syncDepthFaces() {
    const transform = getComputedStyle(wrap).transform;
    let resting = true;

    if (transform && transform !== 'none') {
      try {
        resting = isRestingTransform(new DOMMatrixReadOnly(transform));
      } catch (e) {
        resting = transform.includes('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)');
      }
    }

    depthFaces.forEach((face) => {
      face.style.visibility = resting ? 'hidden' : 'visible';
    });
  }

  function tick() {
    syncDepthFaces();
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(tick));
  } else {
    requestAnimationFrame(tick);
  }
})();
