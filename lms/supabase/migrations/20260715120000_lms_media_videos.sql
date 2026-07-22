-- Allow lesson video uploads in the lms-media bucket.
-- Raises the size limit and adds common video formats to the allow-list.
-- NOTE: your Supabase plan's "max file size" still applies (50 MB on Free) —
-- raise it in Dashboard -> Settings -> Storage if you need bigger videos.

update storage.buckets
set
  file_size_limit = 1073741824, -- 1 GB bucket cap; plan limit applies first
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg'
  ]
where id = 'lms-media';
