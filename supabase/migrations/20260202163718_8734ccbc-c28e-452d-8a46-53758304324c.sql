-- Create tutorials storage bucket for video hosting
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorials', 'tutorials', true);

-- RLS policy: Allow public read access to tutorial videos
CREATE POLICY "Public can view tutorial videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutorials');