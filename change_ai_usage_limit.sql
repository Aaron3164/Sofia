-- Cette fonction SQL met à jour les limites de générations d'IA quotidiennes.
-- Elle définit :
--   - 5 générations max par jour pour le forfait gratuit (free)
--   - 50 générations max par jour pour le forfait payant (premium)

create or replace function public.check_and_increment_ai_usage()
returns boolean as $$
declare
  user_plan text;
  current_count integer;
  max_limit integer;
  last_updated timestamptz;
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

  -- Définir les limites correspondantes
  if user_plan = 'premium' then
    max_limit := 50;
  else
    max_limit := 5;
  end if;

  -- 3. Récupérer la consommation actuelle de l'utilisateur
  select count, updated_at into current_count, last_updated
  from public.ai_usage
  where user_id = auth.uid();

  -- 4. Si aucune ligne n'existe, on insère la première utilisation
  if not found or current_count is null then
    insert into public.ai_usage (user_id, count, updated_at)
    values (auth.uid(), 1, now());
    return true;
  else
    -- Si c'est un nouveau jour (en date serveur), on réinitialise le compteur à 1
    if last_updated::date < current_date then
      update public.ai_usage
      set count = 1,
          updated_at = now()
      where user_id = auth.uid();
      return true;
    else
      -- Si on est le même jour, on vérifie si la limite est atteinte
      if current_count < max_limit then
        update public.ai_usage
        set count = current_count + 1,
            updated_at = now()
        where user_id = auth.uid();
        return true;
      else
        return false;
      end if;
    end if;
  end if;
end;
$$ language plpgsql security definer;
