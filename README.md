# ATL Nexus

An Approaches to Learning tracker for GEMS Modern Academy, covering both MYP and DP.

Students record what they actually did in a unit against the specific ATL
sub-skills their teacher tagged, attach evidence, and write a structured
reflection. Teachers approve or return that work, then rate each sub-skill.
Term reports aggregate from real entries rather than from a guess at the end of
term.

---

## Getting it running

Four steps, about ten minutes. You do not need a Firebase key to look around.

### 1. Install and start MySQL 8

```bash
brew install mysql && brew services start mysql
```

On Linux use your package manager; on Windows use the MySQL installer. Anything
8.0 or newer works, 5.7 does not.

### 2. Create the database

```bash
mysql -u root -e "CREATE DATABASE atl_nexus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'atl'@'localhost' IDENTIFIED BY 'devpassword'; GRANT ALL ON atl_nexus.* TO 'atl'@'localhost';"
```

### 3. Load schema, curriculum and demo data

```bash
mysql -u atl -pdevpassword atl_nexus < db/schema.sql
mysql -u atl -pdevpassword atl_nexus < db/curriculum.sql
mysql -u atl -pdevpassword atl_nexus < db/seeds/005_demo_people.sql
```

`schema.sql` is every table. `curriculum.sql` is the subject list, the five ATL
categories and 326 sub-skills. `005_demo_people.sql` is optional but
recommended: it creates fictional staff and students so there is something to
click through.

### 4. Configure and run

```bash
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173**.

That starts two processes: Vite on 5173 and the API on 3001, with Vite proxying
`/api` across. You do not need the Vercel CLI.

---

## Looking around without signing in

`.env.example` ships with a development login enabled, so the app opens as a
teacher straight away. A pill in the bottom-right corner switches account.

| Account | Role | What they have |
|---|---|---|
| `r.mehta@example.edu` | Teacher | Chemistry DP1, Chemistry MYP4, with units and a student waiting to be confirmed |
| `f.haddad@example.edu` | Teacher | Math AI DP1, with a reflection waiting to be reviewed |
| `j.okafor@example.edu` | Student | DP1, one approved reflection and one sent back for revision |
| `s.tanaka@example.edu` | Student | MYP4, so you can see the MYP sub-skill set |
| `coordinator@example.edu` | Admin | The roster |

The choice is held per browser tab, so you can open two tabs and watch the
student and teacher sides at the same time.

This bypass cannot reach production. `VITE_DEV_LOGIN` sits behind
`import.meta.env.DEV`, the API half lives in `api/_lib/dev-server.mjs` which
Vercel never executes, and the seam it uses refuses to install when `NODE_ENV`
is production. Delete both lines from `.env` once you have real sign-in working.

---

## Going live

Two things are needed beyond the above.

**A Firebase service-account key**, so real Google sign-ins can be verified.
Firebase console, Project settings, Service accounts, Generate new private key.
Put the downloaded JSON into `.env` as a single-line string under
`FIREBASE_SERVICE_ACCOUNT`. Treat it like a password.

**A MySQL host the API can reach.** Vercel functions connect from the public
internet, so an internal-only school server will not work unless the API runs
inside the network too. Point `DATABASE_URL` at whatever you use and run the
same three SQL files.

There is no sign-up by design, so the first admin is inserted by hand:

```sql
INSERT INTO users (email, full_name, role, status)
VALUES ('you@school.edu', 'Your Name', 'admin', 'invited');
```

Everyone else is added through the admin interface after that.

---

## How it fits together

```
src/                React app
  api/client.js     the only thing that talks to the backend
  contexts/         auth state, resolved from /api/me
  pages/            one file per screen
  components/       shared UI, charts, the evidence dropbox
api/                Vercel serverless functions (the backend)
  _lib/auth.js      verifies the Firebase token, resolves the roster
  _lib/db.js        pooled MySQL connection
  _lib/storage.js   evidence files: Firebase Storage, or local disk in dev
  _lib/dev-server.mjs   runs the above locally; never deployed
db/                 schema, curriculum, seeds, migration and test scripts
```

**Firebase does identity only.** It proves who someone is. Whether they have an
account, and what they can see, is answered entirely by MySQL. Nothing is
stored in Firestore.

**`sections` is the access-control boundary.** A section is one taught class.
A teacher sees a student's work only when that student has an active enrolment
in a section that teacher owns, and every teacher-facing query joins through it.
Filtering happens in SQL, so the browser never receives another student's data.

**Sub-skills are addressed on two axes.** `subject_id` null means generic,
set means that subject only. `programme` null means both MYP and DP, set means
one. So Chemistry DP offers *deducing a mechanism from kinetic evidence* while
Chemistry MYP offers *spotting a pattern in your results*, and neither class is
ever shown the other's set.

---

## Commands

```bash
npm run dev        # Vite + the API together
npm run build      # production build
npm test           # 33 assertions against the real database
npm run lint
```

`npm test` runs `db/smoke-test.mjs`, which exercises the real route handlers:
the sub-skill gate, cross-teacher isolation, the return/revise/approve loop and
its audit trail, per-sub-skill rating upserts, and student-to-student privacy.
It creates its own fixtures and cleans up after itself.

---

## A note on the data in this repository

No real staff or student records are committed here. `curriculum.sql` holds
subjects and sub-skills only, and everyone in `005_demo_people.sql` is invented,
on `example.edu`, which cannot receive mail or be signed in to.

The seeded sub-skills are a considered starting set, not curriculum. Chemistry
and Math AI are written out in full as the worked examples. Before any pilot,
the teacher who owns each subject should read their own list and change what
does not match how they actually teach it. That is editable in the app.
