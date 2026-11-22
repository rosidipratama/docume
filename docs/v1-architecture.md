# V1 Architecture: Markdown Knowledge Base

## Goals and decisions

- Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, and Auth.js.
- PostgreSQL `TEXT` is the canonical store for Markdown. Rendered HTML is derived and is never written back as the source.
- A document has a stable system ID (`{username}-{5-digit-sequence}`), a title, and a normalized slug. Lookup is scoped to the requesting user's accessible documents.
- Private folders are private by default. Public folders are explicitly read-only to visitors; folder members can receive a role. Standalone documents can receive a read-only public-link or user-specific share.
- The v1 `/api/mcp/docs` route is an authenticated, versionable resource API that can later be wrapped by an MCP server. It is not itself an MCP protocol transport.
- Keep the initial UI focused on navigation, editing, and readable documents; defer real-time collaboration and advanced permission administration.

## Data model

The following Prisma models describe the application schema and Auth.js adapter tables. `cuid()` IDs are opaque record keys, not access tokens. Prisma does not express SQL `CHECK` constraints, so add the listed constraints in a checked-in SQL migration.

```prisma
enum FolderVisibility {
  PRIVATE
  PUBLIC
}

enum FolderRole {
  VIEWER
  EDITOR
}

enum DocumentShareType {
  USER
  PUBLIC_LINK
}

enum DocumentPermission {
  READ
}

model User {
  id            String   @id @default(cuid())
  name          String?
  email         String?  @unique
  emailVerified DateTime?
  image         String?
  username      String   @unique
  docCounter    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  accounts               Account[]
  sessions               Session[]
  folders                Folder[]         @relation("FolderOwner")
  documents              Document[]       @relation("DocumentOwner")
  folderMemberships      FolderMember[]
  receivedDocumentShares DocumentShare[]  @relation("ShareRecipient")
  createdDocumentShares  DocumentShare[]  @relation("ShareCreator")
}

model Folder {
  id          String           @id @default(cuid())
  ownerId     String
  name        String
  slug        String
  visibility  FolderVisibility @default(PRIVATE)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  owner       User             @relation("FolderOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  documents   Document[]
  members     FolderMember[]

  @@unique([ownerId, slug])
  @@index([ownerId, updatedAt])
  @@index([visibility, updatedAt])
}

model FolderMember {
  id        String     @id @default(cuid())
  folderId  String
  userId    String
  role      FolderRole @default(VIEWER)
  createdAt DateTime   @default(now())

  folder    Folder     @relation(fields: [folderId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([folderId, userId])
  @@index([userId, createdAt])
}

model Document {
  id         String   @id @default(cuid())
  ownerId    String
  folderId   String?
  sequence   Int
  systemId   String   @unique
  title      String
  slug       String
  markdown   String   @default("") @db.Text
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  owner      User            @relation("DocumentOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  folder     Folder?         @relation(fields: [folderId], references: [id], onDelete: SetNull)
  shares     DocumentShare[]

  @@unique([ownerId, sequence])
  @@unique([ownerId, slug])
  @@index([ownerId, updatedAt])
  @@index([folderId, updatedAt])
  @@index([ownerId, title])
}

model DocumentShare {
  id                String             @id @default(cuid())
  documentId        String
  createdById       String
  recipientUserId   String?
  type              DocumentShareType
  permission        DocumentPermission @default(READ)
  tokenHash         String?            @unique
  expiresAt         DateTime?
  revokedAt         DateTime?
  createdAt         DateTime           @default(now())

  document          Document           @relation(fields: [documentId], references: [id], onDelete: Cascade)
  createdBy         User               @relation("ShareCreator", fields: [createdById], references: [id], onDelete: Cascade)
  recipient         User?              @relation("ShareRecipient", fields: [recipientUserId], references: [id], onDelete: Cascade)

  @@unique([documentId, recipientUserId])
  @@index([documentId, revokedAt])
  @@index([recipientUserId, revokedAt])
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
  @@index([userId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### Constraints and migrations

Add database checks in a Prisma SQL migration so invalid data cannot be written outside the application:

```sql
ALTER TABLE "User"
  ADD CONSTRAINT "user_doc_counter_range"
    CHECK ("docCounter" BETWEEN 0 AND 99999),
  ADD CONSTRAINT "user_username_format"
    CHECK ("username" = lower("username")
       AND "username" ~ '^[a-z0-9][a-z0-9_-]{1,29}$');

ALTER TABLE "Document"
  ADD CONSTRAINT "document_sequence_range"
    CHECK ("sequence" BETWEEN 1 AND 99999);

ALTER TABLE "DocumentShare"
  ADD CONSTRAINT "document_share_target_matches_type"
    CHECK (
      ("type" = 'USER' AND "recipientUserId" IS NOT NULL AND "tokenHash" IS NULL)
      OR
      ("type" = 'PUBLIC_LINK' AND "recipientUserId" IS NULL AND "tokenHash" IS NOT NULL)
    );
```

The application must additionally enforce these relational rules, which are not expressible as ordinary row checks:

- A folder's `ownerId` must match the owner of every document in it.
- Only a document with `folderId IS NULL` can receive a `DocumentShare`. Documents in folders inherit the folder's access instead.
- Only the folder owner can change visibility, invite/remove members, or change member roles. A `VIEWER` can read; an `EDITOR` can read and edit; only the owner can delete or reshare.
- For a public folder, visitors can read but not edit. For a private folder, only the owner and members can access it.
- On folder deletion, documents are detached (`SetNull`) and remain owned by the original user. Re-evaluate or disable any folder-derived public access as part of the same operation.

`username` is lowercase and immutable after account creation in v1; signup and account-update services must reject changes. This keeps the prefix on existing system IDs stable. If mutable usernames are added later, existing IDs remain unchanged and new IDs use the new username; never rename stored IDs.

The five-digit format supports sequence values `00001` through `99999`. Reject creation once the counter is exhausted, with a clear limit error; do not wrap, reuse deleted numbers, or silently emit a six-digit ID.

### Safe document ID allocation

Never calculate an ID with `COUNT(*) + 1`. The per-user counter is monotonic and is incremented in the same database transaction as document insertion:

```ts
const created = await prisma.$transaction(async (tx) => {
  const [user] = await tx.$queryRaw<
    { username: string; docCounter: number }[]
  >`
    UPDATE "User"
    SET "docCounter" = "docCounter" + 1
    WHERE id = ${authenticatedUserId} AND "docCounter" < 99999
    RETURNING username, "docCounter"
  `;

  if (!user) {
    const account = await tx.user.findUnique({
      where: { id: authenticatedUserId },
      select: { id: true },
    });
    if (!account) throw new AuthenticatedUserMissingError();
    throw new DocumentIdLimitError();
  }

  const systemId = `${user.username}-${String(user.docCounter).padStart(5, "0")}`;
  return tx.document.create({
    data: {
      ownerId: authenticatedUserId,
      sequence: user.docCounter,
      systemId,
      title,
      slug,
      markdown,
      folderId,
    },
  });
});
```

PostgreSQL serializes concurrent updates to the same user's row; each transaction receives a different incremented value. The unique `systemId` and `(ownerId, sequence)` constraints are final safeguards. If insertion fails, the transaction rolls back the counter increment. Deleting a document never decrements the counter. When moving a document into a folder, verify that the folder belongs to the same owner.

## App Router structure

```text
src/
  app/
    (auth)/
      login/page.tsx
      signup/page.tsx
    (workspace)/
      layout.tsx                    # Authenticated shell and responsive sidebar
      dashboard/page.tsx
      folders/[folderId]/page.tsx
      docs/[systemId]/edit/page.tsx # WYSIWYG editor
    d/[systemId]/page.tsx           # Clean, human-readable document view
    f/[folderId]/page.tsx           # Public read-only folder view
    share/[token]/page.tsx          # Read-only individual public link
    api/
      auth/[...nextauth]/route.ts
      mcp/
        docs/route.ts               # Collection lookup/search and create
        docs/[systemId]/route.ts    # Read, update, and delete one document
  components/
    app-sidebar.tsx
    document-list.tsx
    markdown-editor.tsx
    markdown-viewer.tsx
    folder-dialog.tsx
  lib/
    auth.ts
    db.ts
    documents/
      access.ts
      ids.ts
      markdown.ts
      slugs.ts
    shares/
      tokens.ts
  types/
    next-auth.d.ts
prisma/
  schema.prisma
  migrations/
```

### Main flows

- **Signup/auth:** Auth.js adapter persists account/session records. The signup/onboarding form requires a normalized username and relies on the database unique constraint to resolve races. Include the stable database user ID in the server-validated session; never use a posted username as the authorization identity.
- **Dashboard:** The authenticated layout loads the user's folders and recent documents. Sidebar navigation is server-rendered; client components are limited to interactive controls and editor state.
- **Editor:** Use TipTap with a Markdown parser/serializer extension (or an equivalent editor with proven Markdown round-tripping). Save only Markdown to `Document.markdown`; debounce saves, expose save/error state, and avoid silently replacing content on parse/serialization failures.
- **Human viewer:** Render semantic, accessible typography from Markdown. Sanitize generated HTML and disallow unsafe raw HTML or unsafe URL schemes. Public/private access is checked on the server before rendering.
- **Sharing:** Generate at least 256 bits of random entropy for public-link tokens, show the raw token only at creation, store only a cryptographic hash, and compare hashes server-side. Check expiry/revocation on every request. User-specific shares are limited to the named recipient and read-only.

## `/api/mcp/docs` contract

Use JSON, explicit validation, and consistent HTTP errors. In v1, authenticate with the Auth.js session and scope every lookup to the authenticated user's owned documents, recipient shares, accessible folders, and public resources. A future MCP server can call these services or expose these operations as tools without changing document storage.

- `GET /api/mcp/docs?q=...`: look up an exact system ID first, then an exact slug, then an exact normalized title; broader title search can return multiple matches. Never silently select one of several title matches.
- `POST /api/mcp/docs`: create a document, optionally in a folder owned by the caller. Allocate the system ID in the transaction above; folder editors can edit existing documents but cannot create documents in another user's folder.
- `GET /api/mcp/docs/{systemId}`: return metadata and Markdown only when the caller has read access.
- `PATCH /api/mcp/docs/{systemId}`: update title, slug, Markdown, or folder after ownership/editor checks. Keep `systemId`, `sequence`, and `ownerId` immutable.
- `DELETE /api/mcp/docs/{systemId}`: owner-only deletion; the user counter remains unchanged.

Return `401` when unauthenticated, `403` for insufficient access, `404` for inaccessible/nonexistent resources where enumeration should be avoided, `409` for slug/title conflicts, and `422` for invalid input or exhausted IDs. Validate request bodies with a shared schema and enforce Markdown size limits. Use bounded pagination for collection queries. Avoid logging document contents or share tokens.

For future integration, keep route handlers thin: call shared document/access services from both HTTP routes and a future MCP tool adapter. Add scoped machine credentials and explicit read/write scopes only when MCP access is implemented; do not make private documents public to simplify integration.

## Minimal UI and performance

- Use a compact left sidebar for folders and document navigation, with a single primary “New document” action.
- Keep the editor and viewer content area uncluttered; prioritize readable typography, keyboard navigation, and responsive layouts.
- Load editor code only on the edit route. Paginate/search document lists instead of loading all Markdown bodies.
- Fetch document metadata separately from full content where possible, and use indexed owner/folder/updated-time paths for common queries.
- Do not add collaboration, version history, comments, or elaborate folder ACL screens to v1.
