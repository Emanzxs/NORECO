# Supabase Storage Setup Guide — NORECO I ElectService
# Fix "row violates row-level security policy" errors
# ─────────────────────────────────────────────────────

## WHAT'S HAPPENING

Supabase Storage uses Row-Level Security (RLS) on the `storage.objects`
table. If your bucket has no INSERT policy for the `anon` role, every
upload from an unauthenticated (guest) user will be blocked with:

  ⚠️ Upload failed: new row violates row-level security policy

All three pages (new-connection, bills, report) call `uploadFile()` which
uploads into the **"applications"** bucket. You need to allow anonymous
uploads into that bucket.

─────────────────────────────────────────────────────────────────────────
## STEP-BY-STEP FIX (takes ~2 minutes)
─────────────────────────────────────────────────────────────────────────

### Option A — Make the bucket fully public (easiest, recommended)
────────────────────────────────────────────────────────────────────────

1. Go to:  https://supabase.com/dashboard/project/qwlhjstscnxrlzjriqgl/storage/buckets
2. Click on the **"applications"** bucket.
3. Click ⚙️ **Edit bucket** (top right).
4. Toggle **"Public bucket"** → ON.
5. Click **Save**.

Done. The bucket now allows anyone to upload. Files are still only
readable via the public URL (no directory listing).

────────────────────────────────────────────────────────────────────────
### Option B — Keep bucket private, add RLS policies manually
────────────────────────────────────────────────────────────────────────

Go to:  https://supabase.com/dashboard/project/qwlhjstscnxrlzjriqgl/storage/policies

Click **"New policy"** → **"For full customization"** and create these
three policies on the `storage.objects` table:

--- POLICY 1: Allow anon INSERT (upload) ---
  Name:       anon_upload_applications
  Operation:  INSERT
  Role:       anon
  Expression: bucket_id = 'applications'

--- POLICY 2: Allow anon SELECT (read public URL) ---
  Name:       anon_read_applications
  Operation:  SELECT
  Role:       anon
  Expression: bucket_id = 'applications'

--- POLICY 3: Allow authenticated INSERT (for logged-in users) ---
  Name:       auth_upload_applications
  Operation:  INSERT
  Role:       authenticated
  Expression: bucket_id = 'applications'

Save each policy.

────────────────────────────────────────────────────────────────────────
### Option C — Use the Supabase SQL Editor (power users)
────────────────────────────────────────────────────────────────────────

Go to:  https://supabase.com/dashboard/project/qwlhjstscnxrlzjriqgl/editor

Paste and run this SQL:

```sql
-- Allow anyone (anon + authenticated) to upload to the applications bucket
CREATE POLICY "Allow public uploads to applications"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'applications');

-- Allow anyone to read/download files
CREATE POLICY "Allow public reads from applications"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'applications');

-- Allow file owners to delete/update (optional but good practice)
CREATE POLICY "Allow authenticated delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'applications');
```

─────────────────────────────────────────────────────────────────────────
## VERIFY IT WORKS

After applying any option above:
1. Open new-connection.html and try uploading a requirement document.
2. Open bills.html and try uploading a payment receipt.
3. Open report.html and try uploading a photo with a report.

No more RLS errors should appear.

─────────────────────────────────────────────────────────────────────────
## FOLDER STRUCTURE IN YOUR BUCKET

applications/
├── new-connections/{uid}/          ← requirement docs, PMES cert
├── connection-receipts/{appId}/    ← PayMongo receipt (new-connection)
├── reports/{refNum}/               ← problem report photos
└── receipts/{meterSN}/{billId}/    ← bill payment receipts

─────────────────────────────────────────────────────────────────────────
## NEED FURTHER HELP?

Supabase Storage docs:
  https://supabase.com/docs/guides/storage/security/access-control