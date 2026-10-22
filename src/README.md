# Riseo

A local-first personal habit tracker built with React, Vite, IndexedDB, date-fns, Lucide, and Recharts. Records stay in this browser and are not cloud-synchronized.

## Run Locally

```sh
npm install
npm run dev
```

## Install on a Phone

Riseo is designed for iOS Safari and Android Chrome. Deploy it over HTTPS to enable installation and offline app-shell caching. Localhost is accepted for previewing; the development server intentionally skips service-worker registration so Vite hot reload is not cached.

- iPhone/iPad: open the site in Safari, tap Share, then choose **Add to Home Screen**.
- Android: open the site in Chrome, open the browser menu, then choose **Install app** or **Add to Home screen**.

Habit records remain in that browser's IndexedDB. Offline support caches the app shell after the first successful online visit; it does not sync data between devices. iOS and Android may clear site data under storage pressure, so keep JSON backups.

## Verify and Build

```sh
npm test
npm run build
```

## Behavior and Data

- Daily, weekday, and selected-weekday schedules use local calendar dates.
- Skipped occurrences are excused: they do not count in completion denominators or break streaks. A missed scheduled day breaks a streak.
- Recovery can complete an eligible missed occurrence within the configured previous 0-7 calendar days. Future dates and older dates cannot be checked in.
- A habit completion awards the configured XP once. Undoing a completion writes a compensating ledger entry; re-completing it restores the same original award. The all-habits daily bonus follows the same reversible ledger policy.
- Reward redemptions permanently spend XP and are not reversed by later habit edits.
- Archiving stops future scheduling but preserves earlier records. Deletion removes that habit's records after confirmation.
- IndexedDB stores a versioned state snapshot in one read/write transaction. Backup import validates schema, IDs, schedules, occurrences, settings, and rewards before replacing current data.

Use Settings to export a JSON backup regularly. Clearing browser site data removes the local database. This app does not send notifications; reminder times are saved with habits but notification permission and reliable background delivery are not implemented.

## Deployment

Push to `main` to run the GitHub Pages deployment workflow. In repository Settings > Pages, select **GitHub Actions** as the build and deployment source if it is not already enabled. The site is published at `https://akhileshmanda21.github.io/Evergrow/` after the workflow succeeds.

For a manual static deployment, run `npm run build` and serve the generated `dist/` directory. No server or API is required for core use. Browser storage remains local to each browser and origin.
