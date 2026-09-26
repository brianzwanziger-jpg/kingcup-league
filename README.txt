KingCup League — cloud-ready iPhone web app

1. Create a Supabase project at supabase.com. In Authentication > Users, add your commissioner email and password (do not share the password).
2. Open setup.sql, replace YOUR_COMMISSIONER_EMAIL with your actual email, then run it in the Supabase SQL Editor. This gives the public read-only access and the commissioner update access.
3. In Project Settings / API, copy Project URL and the publishable/anon key into config.js. NEVER use the service_role or secret key in a browser.
4. Upload index.html and config.js together to an HTTPS static host (e.g. Netlify Drop). Share that URL. On iPhone, open it in Safari > Share > Add to Home Screen.
5. In Manage, sign in with your commissioner email and password, then add members and scores. Other visitors can view standings without signing in. Public standings refresh every 30 seconds while the page is open.

Without config.js credentials the app runs in local demo mode, and does not synchronize. The app is not hosted or connected to a Supabase account by this package alone.

The current version is manual entry with live automatic recalculation and synchronization. Yahoo/ESPN automated result ingestion is not implemented: provider APIs and authorization are still required. Existing JSON backups can be imported after signing in; the import will replace the league's shared state.
