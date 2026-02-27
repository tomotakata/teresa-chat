-- ============================================================
-- FonDesk AI - 初期スーパー管理者セットアップ
-- 手順:
--   1. Supabase Dashboard > Authentication > Users > 「Add user」で
--      管理者メールアドレスとパスワードを作成し、ユーザーUIDをコピー
--   2. 下の YOUR_AUTH_USER_ID を貼り付けて実行
-- ============================================================

do $$
declare
  v_user_id  uuid := 'YOUR_AUTH_USER_ID';   -- ← Auth画面でコピーしたUIDに書き換える
  v_email    text := 'admin@example.com';    -- ← 登録したメールアドレスに書き換える
  v_tenant_id uuid;
begin
  -- テナント作成
  insert into tenants (name, slug, plan)
  values ('管理テナント', 'admin', 'enterprise')
  returning id into v_tenant_id;

  -- ユーザー登録 (super_admin)
  insert into users (id, tenant_id, email, role)
  values (v_user_id, v_tenant_id, v_email, 'super_admin');

  -- AI初期設定
  insert into ai_settings (tenant_id)
  values (v_tenant_id);

  raise notice 'Setup complete. tenant_id = %', v_tenant_id;
end;
$$;
