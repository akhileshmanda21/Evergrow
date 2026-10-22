# Evergrow

**Small habits. Consistent progress.**

Evergrow is a mobile-first habit tracker for building routines, reviewing progress, and recovering from missed days. It runs in the browser and can be installed on iOS and Android as a progressive web app.

## Features

- Create habits with daily, weekday, or selected-day schedules.
- Check off or excuse scheduled habits.
- Review streaks, completion rates, calendar history, and trends.
- Recover missed check-ins within the configured recovery window.
- Earn XP, progress through levels, and define personal rewards.
- Export and restore your data as a JSON backup.
- Choose a light or dark theme.

## Run Locally

Requires Node.js 18 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Install on iOS and Android

Evergrow is designed for mobile browsers and supports home-screen installation.

- **iPhone or iPad:** Open the deployed site in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** Open the deployed site in Chrome, open the browser menu, then choose **Install app** or **Add to Home screen**.

Installation and offline app-shell caching require HTTPS. The development server does not register the service worker; to preview the production version locally:

```sh
npm run build
npx vite preview
```

## Data and Privacy

Habit data is stored in IndexedDB in the current browser. It is not uploaded or synchronized between devices. Clearing browser site data can remove the local database, so export a JSON backup regularly.

The service worker caches the app shell for offline loading after the first successful online visit. Offline support does not synchronize or back up habit data.

## Tracking Rules

- Completion rates use scheduled occurrences as their denominator.
- Excused occurrences are excluded from completion rates and do not break streaks.
- A missed scheduled day breaks a streak.
- Recovery is limited to the configured window of previous calendar days. Future occurrences cannot be recovered.
- Habit XP is awarded once per completion. Undoing a check-in adds a compensating ledger entry; re-completing it restores the original award.
- Daily completion bonuses can also be reversed and restored.
- Reward redemptions permanently spend XP and are not reversed by later habit edits.
- Reminder times can be saved, but this version does not send notifications.

## Tests and Production Build

```sh
npm test
npm run build
```

Every push to `main` runs the GitHub Pages workflow, which runs tests, builds the app for the `/Evergrow/` project path, and deploys `dist/`.

The site will be available at [https://akhileshmanda21.github.io/Evergrow/](https://akhileshmanda21.github.io/Evergrow/) after the workflow succeeds. In the repository's **Settings > Pages**, select **GitHub Actions** as the build and deployment source if it is not already selected.

For a manual static deployment, run `npm run build` and deploy the generated `dist/` directory to an HTTPS host.

## Technology

React, Vite, JavaScript, IndexedDB, date-fns, Lucide React, Recharts, Vitest, and React Testing Library.
