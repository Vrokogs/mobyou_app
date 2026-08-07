-- ============================================================================
-- MOBYOU APP - Corrige o trigger handle_new_user
-- O trigger criava o perfil ao inserir em auth.users, mas se essa inserção
-- falha (ex.: RLS no contexto do trigger), o createUser inteiro quebra com
-- "Database error creating new user" (500). A criação de conta passa a NUNCA
-- ser bloqueada pelo perfil (o app cria/atualiza o perfil em seguida).
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, nome, role, ativo)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
      COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'cliente'),
      TRUE
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- ignora qualquer erro do perfil; nao bloqueia o auth
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
