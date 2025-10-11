-- Ensure documents bucket exists and is private
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
  ELSE
    UPDATE storage.buckets SET public = false WHERE id = 'documents' AND (public IS DISTINCT FROM false);
  END IF;
END $$;

-- Enable RLS on storage.objects (safe if already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT only into documents bucket by owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'storage_documents_insert_is_owner'
  ) THEN
    CREATE POLICY "storage_documents_insert_is_owner"
      ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'documents' AND owner = auth.uid()
      );
  END IF;
END $$;

-- Policy: SELECT only own objects in documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'storage_documents_select_is_owner'
  ) THEN
    CREATE POLICY "storage_documents_select_is_owner"
      ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'documents' AND owner = auth.uid()
      );
  END IF;
END $$;

-- Policy: UPDATE only own objects in documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'storage_documents_update_is_owner'
  ) THEN
    CREATE POLICY "storage_documents_update_is_owner"
      ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'documents' AND owner = auth.uid()
      )
      WITH CHECK (
        bucket_id = 'documents' AND owner = auth.uid()
      );
  END IF;
END $$;

-- Policy: DELETE only own objects in documents bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'storage_documents_delete_is_owner'
  ) THEN
    CREATE POLICY "storage_documents_delete_is_owner"
      ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'documents' AND owner = auth.uid()
      );
  END IF;
END $$;
