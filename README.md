# AgriConnect

AgriConnect is a web platform that connects **farmers, buyers, agricultural experts and equipment providers** in one place, with an **administrator panel** for managing users, registrations, reports and conflicts.

It was built as a Human-Computer Interaction (HCI) focused project, with attention to usability, consistency, feedback, error prevention, accessibility and efficiency.

## Roles and features

| Role | What they can do |
|------|------------------|
| **Farmer** | List and manage crops, view and process orders, book expert consultations, rent equipment, use the activity calendar, report issues |
| **Buyer** | Browse the marketplace, search crops by text or image, place and track orders (pending, confirmed, delivered), message farmers |
| **Agricultural expert** | Handle consultations, chat with farmers, access curated resources matched to their specialization |
| **Equipment provider** | Manage equipment listings and quantities, handle rental requests, view rental history |
| **Administrator** | Approve or reject registrations, manage users (including conduct scores and activation), resolve conflicts, review reports, send system notifications |

Common to all roles: notifications, messaging, history, help and support, settings (including profile picture) and a confirmation prompt before logging out. A user with more than one role can switch between them.

## Tech stack

- **Backend:** Node.js, Express
- **Database:** MySQL / MariaDB (`mysql2`)
- **Frontend:** HTML, CSS and vanilla JavaScript
- **Other:** `multer` (file uploads), `bcrypt` (password hashing), `jsonwebtoken` (login tokens), `jimp` (image search), `dotenv` (configuration)

## Project structure

```
AgriConnect/
├── backend/
│   ├── controllers/     # Request handling and business logic
│   ├── routes/          # API routes
│   ├── db.js            # MySQL connection (reads from .env)
│   └── server.js        # Express server entry point
├── database/            # SQL scripts (schema, migrations, seed data)
├── frontend/            # HTML pages and assets
├── uploads/             # User uploads (not tracked in Git)
├── .env.example         # Template for environment variables
└── package.json
```

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- MySQL or MariaDB

### 1. Clone and install
```bash
git clone https://github.com/Kilshan2801/AgriConnect.git
cd AgriConnect
npm install
```

### 2. Set up the database
Create a database named `agriconnect`, then run the scripts in the `database/` folder. Run `schema.sql` first, then the others:

```bash
mysql -u root -p -P 3307 agriconnect < database/schema.sql
```

Then run the remaining scripts as needed (migrations such as `add_*.sql` and `fix_*.sql`, `resources_seed.sql` for the sample resources, and `create_admin_account.sql` for the administrator account).

### 3. Configure environment variables
Copy `.env.example` to `.env` and fill in your values:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=agriconnect
DB_PORT=3307
ADMIN_EMAIL=admin@agriconnect.com
ADMIN_PASSWORD=your_admin_password
JWT_SECRET=a_long_random_string
```

Generate a random `JWT_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> The `.env` file contains secrets and is excluded from Git. Never commit it.
> If your password contains `#`, wrap the value in double quotes.

### 4. Create the uploads folder
```bash
mkdir uploads
```

### 5. Run the server
```bash
npm start
```

Open **http://localhost:5000** in your browser.

## Administrator login

The administrator signs in at `/admin-login.html` with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` set in `.env`. The password is verified on the server and is not stored in the frontend.

## Notes

- The default MySQL port in this project is **3307**. Change `DB_PORT` in `.env` if yours is different (the MySQL default is 3306).
- Uploaded files (profile pictures, crop images, ID photos) are stored in `uploads/` and are intentionally not committed.

## Author

Developed by [Kilshan2801](https://github.com/Kilshan2801).
