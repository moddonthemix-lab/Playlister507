/* ═══════════════════════════════════════════════════════════════════
   PLAYLIST ENGINE — Submit Page JS
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

(function () {
  /* ─── Field error helpers ──────────────────────────────────────── */
  function showFieldError(el, msg) {
    el.style.borderColor = 'rgba(255,85,85,0.5)';
    const existing = el.parentElement.querySelector('.field-error');
    if (existing) existing.remove();
    const err = document.createElement('p');
    err.className = 'field-error';
    err.style.cssText = 'color:#ff5555;font-size:12px;margin-top:6px;';
    err.textContent = msg;
    el.parentElement.appendChild(err);
  }

  function clearFieldError(el) {
    el.style.borderColor = '';
    const existing = el.parentElement.querySelector('.field-error');
    if (existing) existing.remove();
  }

  /* ─── Validation ───────────────────────────────────────────────── */
  const ALLOWED_TRACK_HOSTS = [
    'spotify.com',
    'soundcloud.com',
    'youtube.com',
    'youtu.be',
    'music.apple.com',
  ];

  function isValidUrl(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  function isAllowedTrackLink(value) {
    if (!isValidUrl(value)) return false;
    return ALLOWED_TRACK_HOSTS.some((host) => value.includes(host));
  }

  function isValidEmail(value) {
    return value.includes('@') && value.includes('.');
  }

  function validateForm(fields) {
    let valid = true;

    if (!fields.artistName.value.trim()) {
      showFieldError(fields.artistName, 'Artist name is required.');
      valid = false;
    }

    if (!fields.trackTitle.value.trim()) {
      showFieldError(fields.trackTitle, 'Track title is required.');
      valid = false;
    }

    if (!fields.trackLink.value.trim()) {
      showFieldError(fields.trackLink, 'Please use a Spotify, SoundCloud, YouTube, or Apple Music link.');
      valid = false;
    } else if (!isAllowedTrackLink(fields.trackLink.value.trim())) {
      showFieldError(fields.trackLink, 'Please use a Spotify, SoundCloud, YouTube, or Apple Music link.');
      valid = false;
    }

    if (!fields.email.value.trim()) {
      showFieldError(fields.email, 'Email is required.');
      valid = false;
    } else if (!isValidEmail(fields.email.value.trim())) {
      showFieldError(fields.email, 'Please enter a valid email address.');
      valid = false;
    }

    if (!fields.pitch.value.trim()) {
      showFieldError(fields.pitch, 'Tell us more about your track (at least 20 characters).');
      valid = false;
    } else if (fields.pitch.value.trim().length < 20) {
      showFieldError(fields.pitch, 'Tell us more about your track (at least 20 characters).');
      valid = false;
    }

    return valid;
  }

  /* ─── Character counter for pitch ─────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const pitch = document.getElementById('pitch');
    if (!pitch) return;
    pitch.maxLength = 500;
    const counter = document.createElement('p');
    counter.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.25);margin-top:6px;text-align:right;';
    counter.textContent = '0 / 500';
    pitch.parentElement.appendChild(counter);
    pitch.addEventListener('input', () => {
      counter.textContent = `${pitch.value.length} / 500`;
    });
  });

  /* ─── Clear errors on input ────────────────────────────────────── */
  function attachClearOnInput(form) {
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach((el) => {
      el.addEventListener('input', () => clearFieldError(el));
      el.addEventListener('change', () => clearFieldError(el));
    });
  }

  /* ─── Submit handler ───────────────────────────────────────────── */
  const form = document.getElementById('submit-form');
  if (!form) return;

  attachClearOnInput(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submit-btn');

    const fields = {
      artistName: e.target.artistName,
      trackTitle: e.target.trackTitle,
      trackLink: e.target.trackLink,
      email: e.target.email,
      pitch: e.target.pitch,
    };

    // Hide any previous global error
    const globalError = document.getElementById('submit-error');
    if (globalError) {
      globalError.style.display = 'none';
      globalError.textContent = '';
    }

    // Run client-side validation
    if (!validateForm(fields)) return;

    btn.textContent = 'SUBMITTING...';
    btn.disabled = true;

    const data = {
      artistName: e.target.artistName.value.trim(),
      trackTitle: e.target.trackTitle.value.trim(),
      trackLink: e.target.trackLink.value.trim(),
      playlist: e.target.playlist.value,
      genre: e.target.genre.value,
      email: e.target.email.value.trim(),
      pitch: e.target.pitch.value.trim(),
      submittedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || 'Something went wrong. Please try again.';
        throw new Error(msg);
      }

      form.style.display = 'none';
      const success = document.getElementById('submit-success');
      if (success) success.style.display = 'block';
    } catch (err) {
      if (globalError) {
        globalError.textContent = err.message || 'Something went wrong. Please try again.';
        globalError.style.display = 'block';
      }
      btn.textContent = 'SUBMIT FOR REVIEW';
      btn.disabled = false;
    }
  });
})();
