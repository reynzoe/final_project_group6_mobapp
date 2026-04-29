# Library Management System

This Expo project now includes a complete mobile Library Management System with a built-in Node REST API. It supports:

- `Librarian` accounts for book CRUD, user management, circulation monitoring, and overdue tracking
- `Student` accounts for registration, authentication, book search, borrowing, returns, and personal history
- Server-side validation, 14-day due dates, and automatic late-fee calculation

## Run the project

1. Install dependencies if needed:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase values if you want the
   book catalog to come from Supabase.

3. Start the backend API in one terminal:

   ```bash
   npm run api
   ```

4. Start the Expo app in another terminal:

   ```bash
   npm start
   ```

The mobile client will automatically target `http://<expo-host>:4000/api` during development. If you want to override that manually, set:

```bash
EXPO_PUBLIC_API_URL=http://YOUR-IP:4000/api
```

## Demo accounts

- Librarian: `admin@libraryapp.local` / `Admin123!`
- Student: `student@libraryapp.local` / `Student123!`

The backend seeds its local JSON store automatically on first launch and saves runtime data to `server/data/library.json`.

## API overview

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/dashboard`
- `GET /api/books?search=...`
- `POST /api/books`
- `PUT /api/books/:id`
- `DELETE /api/books/:id`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/transactions`
- `POST /api/transactions/borrow`
- `POST /api/transactions/:id/return`

## Implementation notes

- Borrowing uses a 14-day window.
- Late fees are calculated at `$2.50` per overdue day.
- Book availability is tracked through `availableQuantity` and updated on borrow/return.
- Users with active loans cannot be deleted.
- Books with active loans cannot be deleted.

## Supabase setup (books catalog)

The API reads and writes books from Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set. Users and transactions stay in the local JSON store.

1. Create a Supabase project and open **Settings → API**.
2. Copy your **Project URL** and **service_role** key.
3. Create the `books` table in Supabase:

   ```sql
   create table books (
     id uuid primary key default gen_random_uuid(),
     title text not null,
     author text not null,
     category text not null,
     cabinet text not null default '',
     rack text not null default '',
     row text not null default '',
     quantity int not null,
     available_quantity int not null,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );
   ```

4. Add the environment variables to `.env` before starting the API:

   ```bash
   SUPABASE_URL=your-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

5. Import your book data into the `books` table (CSV import works well for large lists).

You can confirm the API sees Supabase by opening `http://127.0.0.1:4000/api/health`.
It should return `"booksSource":"supabase"`.
