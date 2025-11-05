# TODO List for OTAKU VALLEY Backend Implementation

## Approved Plan
- Create package.json with dependencies: express, sqlite3, cors, body-parser.
- Create db.js to set up SQLite database with tables: items, orders, order_items.
- Create server.js with Express server, API routes for login, items CRUD, orders CRUD, and static file serving for the HTML.
- Modify OTAKU.html to replace in-memory logic with fetch calls to the APIs, handle async operations, and update UI accordingly.
- Populate database with initial sample data matching the frontend's demo data.

## Dependent Files
- package.json (new)
- db.js (new)
- server.js (new)
- OTAKU.html (modify)

## Followup Steps
- Run npm install to install dependencies.
- Run node server.js to start the server.
- Open browser to localhost:3000 to test the app.
- Ensure login works, inventory and orders persist across sessions.
- Prepare for hosting: Add Procfile for Heroku, ensure environment variables if needed.

## Progress
- [x] Create package.json
- [x] Create db.js
- [x] Create server.js
- [x] Modify OTAKU.html
- [x] Test locally
- [x] Prepare for GitHub upload and hosting
- [x] Add Procfile for Heroku deployment
- [x] Update server.js for production environment
