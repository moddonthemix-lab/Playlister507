/* ═══════════════════════════════════════════════════════════════════
   PLAYLIST ENGINE — Submit Page JS
   ═══════════════════════════════════════════════════════════════════ */

document.getElementById('submit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  btn.textContent = 'SUBMITTING...';
  btn.disabled = true;

  const data = {
    artistName: e.target.artistName.value,
    trackTitle: e.target.trackTitle.value,
    trackLink: e.target.trackLink.value,
    playlist: e.target.playlist.value,
    genre: e.target.genre.value,
    email: e.target.email.value,
    pitch: e.target.pitch.value,
    submittedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Server error');
    document.getElementById('submit-form').style.display = 'none';
    document.getElementById('submit-success').style.display = 'block';
  } catch {
    document.getElementById('submit-error').textContent = 'Something went wrong. Try again.';
    document.getElementById('submit-error').style.display = 'block';
    btn.textContent = 'SUBMIT FOR REVIEW';
    btn.disabled = false;
  }
});
