-- Document 20 MB image upload limit (bucket already allows up to 1 GB for videos).
-- Supabase plan storage caps still apply first (Dashboard -> Settings -> Storage).

update storage.buckets
set
  file_size_limit = greatest(coalesce(file_size_limit, 0), 20971520) -- 20 MB minimum
where id = 'lms-media';
