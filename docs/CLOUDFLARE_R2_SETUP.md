# Photo uploads: Cloudflare R2 setup (YORVIA)

Photos are stored in a Cloudflare **R2** bucket. The database keeps only each photo's storage key.

## Ground rules for your Cloudflare account

- Claude has **no access** to your Cloudflare account and has changed nothing in it. You do every step below yourself.
- Everything is **new and named `yorvia-…`**. You never edit your existing projects.
- The access key is limited to the one new bucket, so it cannot read or change anything in your other projects.
- Only one existing-account thing is touched, and only if you choose it: adding a media subdomain to a domain you already have (Step 2, Option A). It adds one new DNS record and leaves existing records alone. Skip it if you'd rather not (use Option B for testing).

## What you'll create

| Thing | Name |
|---|---|
| R2 bucket | `yorvia-media` |
| R2 API token | `yorvia-r2-media` (Object Read & Write, `yorvia-media` bucket only) |
| Media subdomain (optional) | `media.<your-domain>` |

## Step 1: Create the bucket

Cloudflare dashboard -> **R2 Object Storage** -> **Create bucket** -> name it `yorvia-media`. Pick a location near your users (for India, an Asia-Pacific hint). R2 may ask for a payment method even for the free allowance; check the current free-tier limits and pricing on Cloudflare's R2 pricing page.

## Step 2: Make images viewable by the public

Images need a public web address. Choose one:

**Option A (recommended for real use): a custom domain.** Bucket -> **Settings -> Custom Domains -> Add** -> `media.<your-domain>` (the domain must be on Cloudflare). Wait until it shows Active. Your media base URL is `https://media.<your-domain>`.

**Option B (testing only): the `r2.dev` address.** Bucket -> **Settings -> Public Development URL -> Enable**. This is intended for development and is rate-limited, so don't launch on it. Your media base URL is the `https://pub-….r2.dev` address shown.

Only put **public** images in this bucket. Never private files.

## Step 3: Allow uploads from your site (CORS)

Photos are uploaded straight from the browser to R2, so the bucket must allow it. Bucket -> **Settings -> CORS Policy -> Add** and paste (use your real site address, with no trailing slash):

```json
[
  {
    "AllowedOrigins": ["https://YOUR-SITE.vercel.app", "https://your-domain.com", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

If your uploads fail with a "CORS" error in the browser console, this is the first place to look. Add each address you use, including preview URLs if you test on them.

## Step 4: Create the access key (limited to this bucket)

R2 Object Storage -> **Manage API Tokens** -> **Create API Token**:
- Name: `yorvia-r2-media`
- Permissions: **Object Read & Write**
- Specify bucket: **`yorvia-media` only** (do not choose "all buckets")
- Create, then copy the **Access Key ID** and **Secret Access Key** now. The secret is shown only once.

Also copy your **Account ID** (shown on the R2 overview page).

## Step 5: Add settings in Vercel

Vercel -> your project -> Settings -> Environment Variables (then **redeploy**, because `NEXT_PUBLIC_*` values are baked in at build time):

| Name | Value | Notes |
|---|---|---|
| `R2_ACCOUNT_ID` | your Cloudflare account ID | |
| `R2_ACCESS_KEY_ID` | from Step 4 | |
| `R2_SECRET_ACCESS_KEY` | from Step 4 | **secret**; mark it Sensitive |
| `R2_BUCKET` | `yorvia-media` | |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | e.g. `https://media.your-domain.com` | no trailing slash |
| `UPLOADS_PER_DAY` | optional, default 30 | per-user daily cap |

Locally, put the same names in `web/.env.local` (see `web/.env.example`).

## Step 6: Database

Run `web/supabase/phase6_photos.sql` in the Supabase SQL editor, once.

## Step 7: Check it works

1. Open `/api/health`. You want `"photo_uploads": true`.
2. Log in, open a place, click **Add photos**, choose a picture.
3. The photo should appear in the gallery. Right-click it, open the image in a new tab, and confirm the address starts with your media base URL.
4. In Cloudflare R2, open `yorvia-media`. You should see `places/<user-id>/<random>.jpg`.

## How it works (and what protects it)

1. The browser shrinks the photo (max 1600 px, JPEG). This usually cuts a phone photo from several MB to a few hundred KB, which keeps storage and bandwidth cheap. It also **removes location data (EXIF)** from photos.
2. The browser asks the server (`POST /api/upload`, logged-in users only) for an upload link.
3. The server checks the file type (JPG/PNG/WebP) and size (max 5 MB), applies a **per-user daily cap**, and returns a link that expires in **5 minutes**. The link is signed for that exact content type and size and for a **random file name in the user's own folder**, so it can't be reused to overwrite other files.
4. The browser uploads straight to R2. The file never passes through your server.
5. The app records the photo against the place. The database refuses any key that isn't in the right folder or format, so nobody can attach outside links.
6. Limits: 20 photos per place, 8 per person per place.
7. Moderation: other users get a **report** button on every photo (it goes to the same `reports` table). To remove a photo yourself, delete its row in `place_photos` and delete the file in the R2 dashboard.

## Housekeeping

- **Orphaned uploads** (uploaded but never attached, e.g. the user closed the tab) are not deleted automatically yet. Find them in the Supabase SQL editor:

  ```sql
  select u.storage_key, u.created_at
  from media_uploads u
  left join place_photos p on p.storage_key = u.storage_key
  where p.id is null and u.created_at < now() - interval '1 day';
  ```
  Delete those files from `yorvia-media` in the R2 dashboard. They cost very little, so this can wait.
- **Rotating the key:** create a new token (e.g. `yorvia-r2-media-2`), update Vercel, redeploy, then delete the old token.
- **Spend alerts:** set a billing notification in Cloudflare so surprises are visible early.
- **Terms of use:** tell users to upload only photos they took. Add that to your terms before launch.

## Not yet verified

Verified locally: the upload-link route (login, type/size limits, daily cap, delete rules, that the link is signed for the exact content type and size, and a fix for a checksum problem that would have made R2 reject uploads), the in-browser compression (in Chromium), and the database rules.

**Not verified against the real R2 service or a live deployed site.** Expect to confirm CORS and the first real upload yourself using Step 7. If something fails, the browser console and the Network tab will name the cause.
