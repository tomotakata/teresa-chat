#!/bin/bash
# ============================================================
# FonDesk AI - Supabase リモートセットアップスクリプト
# 使い方: bash supabase/setup/setup.sh
# 事前準備:
#   1. https://supabase.com/dashboard でプロジェクト作成
#   2. Project Settings > General > Reference ID をコピー
#   3. このスクリプトを実行
# ============================================================

set -e

echo "=== FonDesk AI Supabase セットアップ ==="
echo ""

# プロジェクトIDの入力
read -p "Supabase Project Reference ID を入力してください: " PROJECT_REF
if [ -z "$PROJECT_REF" ]; then
  echo "エラー: Project Reference IDが必要です"
  exit 1
fi

# ログイン
echo ""
echo ">>> Supabase にログインします..."
npx supabase login

# プロジェクトにリンク
echo ""
echo ">>> プロジェクト ($PROJECT_REF) にリンクします..."
npx supabase link --project-ref "$PROJECT_REF"

# マイグレーション適用
echo ""
echo ">>> データベースマイグレーションを適用します..."
npx supabase db push

echo ""
echo "=== マイグレーション完了 ==="
echo ""
echo "次のステップ:"
echo "1. Supabase Dashboard > SQL Editor で以下を実行:"
echo "   - supabase/setup/03_storage.sql (Storageバケット作成)"
echo "2. Project Settings > Authentication > Hooks で"
echo "   custom_access_token_hook を JWT Hook として設定"
echo "3. Authentication > Users で管理者ユーザーを作成"
echo "4. supabase/setup/02_seed_superadmin.sql のUIDを書き換えて実行"
echo ""
echo "5. .env.local に以下を設定:"
echo "   NEXT_PUBLIC_SUPABASE_URL=https://$PROJECT_REF.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>"
echo "   SUPABASE_SERVICE_ROLE_KEY=<service role key>"
echo "   OPENAI_API_KEY=sk-..."
echo "   NEXT_PUBLIC_APP_URL=https://your-domain.com"
