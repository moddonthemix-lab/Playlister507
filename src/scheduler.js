require('dotenv').config();
const cron  = require('node-cron');
const store = require('./store');
const { runAll } = require('./update');

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 9 * * 1';

function startScheduler() {
  cron.schedule(CRON_SCHEDULE, async () => {
    if (!store.isUpdateDue()) {
      console.log('[Scheduler] Skipping — last run less than 14 days ago.');
      return;
    }
    console.log('[Scheduler] Bi-weekly update triggered.');
    try {
      await runAll();
    } catch (e) {
      console.error('[Scheduler] Update failed:', e.message);
    }
  }, { timezone: 'America/New_York' });

  console.log(`  Scheduler active (${CRON_SCHEDULE})\n`);
}

module.exports = { startScheduler };
