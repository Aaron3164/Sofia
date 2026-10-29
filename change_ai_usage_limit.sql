-- Cette fonction SQL met à jour les limites de générations d'IA quotidiennes.
-- Schéma réel de la table public.ai_usage :
--   - user_id (uuid)
--   - usage_date (date)
--   - generation_count (int4)
--
-- Limites définies :
--   - 5 générations max par jour pour le forfait gratuit (free)
--   - 50 générations max par jour pour le forfait payant (premium)

create or replace function public.check_and_increment_ai_usage()
returns boolean as $$
declare
  user_plan text;
  current_count integer;
  max_limit integer;
  today_date date := current_date;
begin
  -- 1. Récupérer l'ID de l'utilisateur connecté
  if auth.uid() is null then
    return false;
  end if;

  -- 2. Récupérer le plan de l'utilisateur (par défaut 'free')
  select plan into user_plan from public.profiles where id = auth.uid();
  if user_plan is null then
    user_plan := 'free';
  end if;

  -- Définir les limites correspondantes (5 gratuit, 50 premium)
  if user_plan = 'premium' then
    max_limit := 50;
  else
    max_limit := 5;
  end if;

  -- 3. Récupérer la consommation du jour pour cet utilisateur
  select generation_count into current_count
  from public.ai_usage
  where user_id = auth.uid()
    and usage_date = today_date;

  -- 4. Si aucune ligne pour aujourd'hui, on insère la première utilisation (1)
  if not found or current_count is null then
    insert into public.ai_usage (user_id, usage_date, generation_count)
    values (auth.uid(), today_date, 1);
    return true;
  else
    -- 5. Si la ligne existe aujourd'hui, on vérifie la limite
    if current_count < max_limit then
      update public.ai_usage
      set generation_count = current_count + 1
      where user_id = auth.uid()
        and usage_date = today_date;
      return true;
    else
      return false; -- Limite quotidienne atteinte
    end if;
  end if;
end;
$$ language plpgsql security definer;
