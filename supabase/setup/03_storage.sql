-- ============================================================
-- FonDesk AI - Storage バケット作成 & ポリシー設定
-- ============================================================

-- knowledge-files バケット作成 (プライベート)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-files',
  'knowledge-files',
  false,
  52428800,  -- 50MB
  array['application/pdf', 'text/plain']
)
on conflict (id) do nothing;

-- ポリシー: 自分のテナントのファイルのみアクセス可
create policy "knowledge_files_select" on storage.objects
  for select using (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
  );

create policy "knowledge_files_insert" on storage.objects
  for insert with check (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
  );

create policy "knowledge_files_delete" on storage.objects
  for delete using (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
  );
