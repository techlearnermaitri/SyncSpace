# SyncSpace — Team Project Hub

A polished, responsive project coordination dashboard for student teams.

## Run locally on macOS

1. Install Node.js LTS if you do not already have it: https://nodejs.org/
2. Open Terminal and enter the project folder.
3. Run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite (usually `http://localhost:5173`).

## Included

- Overview dashboard and workspace health
- Create projects and tasks
- Kanban workflow: To do → In progress → Done
- Project filtering and search
- Team view, activity history, and analytics
- Browser-local persistence using `localStorage`
- Responsive layouts for desktop and mobile

## Important current limitation

This is a **working frontend demo**, not a multi-user cloud app yet. Data is stored in the current browser only. Authentication, Firebase/Firestore, Azure, and Zoho Catalyst are not connected. The UI intentionally labels these as not connected instead of pretending they are live.

## Next integration steps

1. Create a Firebase project and enable Email/Password Authentication and Cloud Firestore.
2. Add Firebase configuration through Vite environment variables.
3. Replace the local data service with Firestore reads/writes and add per-user/project access rules.
4. Add one genuinely useful server-side operation (for example, deadline digest generation) before deciding whether Azure or Zoho is needed.
5. Deploy the built frontend to a free static host.

Do not put service-account credentials or private API keys in frontend code or commit them to Git.
