-- Cette fonction SQL permet de mettre à jour le forfait d'un utilisateur
-- en recherchant son ID à partir de son adresse e-mail.
-- Elle utilise "security definer" pour contourner le RLS (Row Level Security) 
-- et pouvoir lire la table auth.users en toute sécurité.

create or replace function public.update_profile_plan_by_email(user_email text, new_plan text)
returns void as $$
declare
  target_user_id uuid;
begin
  -- 1. Récupère l'ID utilisateur à partir de la table d'authentification Supabase (auth.users)
  select id into target_user_id 
  from auth.users 
  where email = user_email;
  
  -- 2. Si l'utilisateur existe, met à jour son profil
  if target_user_id is not null then
    update public.profiles
    set plan = new_plan,
        updated_at = now()
    where id = target_user_id;
  else
    raise warning 'Aucun utilisateur trouvé avec l''adresse e-mail %', user_email;
  end if;
end;
$$ language plpgsql security definer;
