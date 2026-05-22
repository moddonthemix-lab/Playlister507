// Main entry — starts the bi-weekly cron scheduler.
// `npm start` keeps this process alive; it fires every Monday at 9 AM
// and skips if fewer than 14 days have passed since the last run.
require('dotenv').config();
const cron = require('node-cron');
const store = require('./store');
const { runAll } = require('./update');

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 9 * * 1'; // Every Monday 9 AM

console.log('╔══════════════════════════════════════════╗');
console.log('║        Playlister507  🎵                 ║');
console.log('╠══════════════════════════════════════════╣');
console.log(`║  Schedule : ${CRON_SCHEDULE.padEnd(28)}║`);
console.log(`║  Interval : Bi-weekly (14-day minimum)   ║`);
console.log('╚══════════════════════════════════════════╝');

const lastRun = store.getLastRun();
if (lastRun) {
  console.log(`\n  Last run  : ${new Date(lastRun).toLocaleString()}`);
} else {
  console.log('\n  No previous run found — will update on next schedule tick.');
  console.log('  Tip: run `npm run update` to trigger an immediate update.\n');
}

cron.schedule(CRON_SCHEDULE, async () => {
  if (!store.isUpdateDue()) {
    const lastRun = store.getLastRun();
    console.log(`[Scheduler] Skipping — last run was ${lastRun}, less than 14 days ago.`);
    return;
  }

  console.log('[Scheduler] Bi-weekly update triggered.');
  try {
    await runAll();
  } catch (e) {
    console.error('[Scheduler] Update failed:', e);
  }
}, {
  timezone: 'America/New_York',
});

console.log('\n  Scheduler running. Press Ctrl+C to stop.\n');
