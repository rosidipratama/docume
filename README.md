# DocuMe

DocuMe is a Markdown knowledge base with a visual editor, private and public folders, and per-document sharing.

## Run locally

You need Node.js 22 and a PostgreSQL database. Create a database and role the app can use, then run:

```sh
npm ci
cp .env.example .env
openssl rand -base64 32
```

Set `DATABASE_URL` in `.env` to your connection string and paste the generated secret into `AUTH_SECRET`. Keep `AUTH_URL` set to the origin you open in your browser. Then run:

```sh
npm run db:deploy
npm run dev
```

Open http://localhost:3000 and create an account. Usernames are permanent and form the prefix of each document ID.

The editor offers visual editing, Markdown source, and a rendered preview. If visual editing cannot preserve a document's formatting, edit it in Markdown mode. Standalone documents support named recipients and expiring public links. Documents in folders inherit the folder's visibility and member permissions.

## Document API

The authenticated JSON API uses the current Auth.js session. `GET /api/mcp/docs?q=...&page=1` searches by ID, slug, or title. `POST /api/mcp/docs` creates a document with a title and optional slug, Markdown, and folder ID. Use `GET`, `PATCH`, or `DELETE` on `/api/mcp/docs/{systemId}` for an individual document.

Run `npm run typecheck` and `npm run build` to verify the app locally. Run `npm run db:generate` after editing the Prisma schema.
