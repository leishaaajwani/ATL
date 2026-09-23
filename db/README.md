# ATL Nexus database

MySQL 8.0+. The app talks to it through `/api` serverless functions. The browser
never connects to the database directly, which is the point: access control is
enforced in SQL by section ownership, not in JavaScript the user can edit.

## Local setup

Install MySQL:

```bash
brew install mysql && brew services start mysql
```

Create the database and a user:

```bash
mysql -u root -e "CREATE DATABASE atl_nexus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'atl'@'localhost' IDENTIFIED BY 'devpassword'; GRANT ALL ON atl_nexus.* TO 'atl'@'localhost';"
```

Run the migration and seeds, in order:

```bash
mysql -u atl -pdevpassword atl_nexus < db/migrations/001_init.sql
mysql -u atl -pdevpassword atl_nexus < db/seeds/001_reference.sql
mysql -u atl -pdevpassword atl_nexus < db/seeds/002_atl_subskills.sql
```

Then add to `.env`:

```
DATABASE_URL=mysql://atl:devpassword@localhost:3306/atl_nexus
```

## Creating the first admin

There is no sign-up. The roster is the authorisation, so the first admin has to
be inserted by hand. Use the real Google account email:

```sql
INSERT INTO users (email, full_name, role, status)
VALUES ('you@example.com', 'Your Name', 'admin', 'invited');
```

On first sign-in the app binds the Google uid and flips the status to `active`.
Everyone else is added through the admin interface from then on.

## Schema notes

**`sections` is the access-control boundary.** One row per taught class
(DP1 Math AI, Mahek, 2026-27). A teacher sees a student's work only when that
student has an `active` enrollment in a section the teacher owns. Every
teacher-facing query joins through it. This replaces the old approach of
downloading every document and filtering in the browser.

**Sub-skills are two-tier.** `atl_subskills.subject_id IS NULL` means generic and
offered everywhere. A set `subject_id` means it only appears when planning a unit
in that subject. Thinking and Communication are where the subject-specific sets
actually matter, which is why the seed concentrates there. Query both tiers with:

```sql
WHERE subject_id = ? OR subject_id IS NULL
```

`created_by IS NULL` marks a seeded row. Anything a teacher adds through the UI
carries their user id, so you can always tell the starter set from school-authored
content.

**One reflection per (unit, student).** Status cycles
`draft -> pending -> returned -> pending -> approved`. `reflection_events` keeps
the full history, so a returned reflection that gets revised is provable rather
than being replaced by an unrelated new submission.

**Ratings are per sub-skill**, not per category. `unit_ratings` has a unique key
on `(unit_id, student_id, subskill_id)`, so the Reports page upserts against it.
A term report aggregates upward: sub-skill to category, unit to term.

## Moving to the school's server

Nothing here is specific to a host. When IT confirms where MySQL lives, point
`DATABASE_URL` at it and run the same three files. Things to check with them:

- Is the server reachable from outside the school network? Vercel functions
  connect from the public internet. If it is internal only, the API has to run
  somewhere inside the network instead.
- Does it enforce TLS? If so, append `?ssl={"rejectUnauthorized":true}` to the
  connection URL.
- MySQL 8.0 or newer. The schema uses features 5.7 does not have.

## Running it locally

```bash
npm run dev
```

That starts two things: Vite on 5173 and the API on 3001, with Vite proxying
`/api` across. In production Vercel runs the files in `/api` as serverless
functions and there is no proxy; `api/_lib/dev-server.mjs` exists only to give
the same routing in development, so you do not need the Vercel CLI.

`npm test` runs `db/smoke-test.mjs`, which exercises the real route handlers
against this database: the sub-skill gate, cross-teacher isolation, the
return/revise/approve loop and its audit trail, per-sub-skill rating upserts,
and student-to-student privacy.
