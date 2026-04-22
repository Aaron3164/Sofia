# Configuration de la Base de Données Supabase

Pour que le profil utilisateur et les forfaits fonctionnent, vous devez créer la table `profiles` dans votre projet Supabase.

### 1. Accédez à l'Éditeur SQL
Connectez-vous à votre [Tableau de bord Supabase](https://app.supabase.com/), sélectionnez votre projet, et cliquez sur **SQL Editor** dans la barre latérale gauche.

### 2. Copiez et Exécutez ce code
Collez le code suivant dans un nouvel onglet SQL et cliquez sur **RUN** :

```sql
-- 1. Table des Profils
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'premium')),
  preferences jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Table des Dossiers et Cours (Système de fichiers)
create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text check (type in ('folder', 'course')) not null,
  parent_id uuid references public.nodes(id) on delete cascade,
  color text,
  "order" integer default 0,
  created_at timestamptz default now()
);

-- 3. Table des Données de Cours (Résumés, Flashcards, QCM)
create table if not exists public.course_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  course_id uuid references public.nodes(id) on delete cascade unique,
  extracted_content text,
  pdf_url text,
  file_name text,
  generations jsonb default '{}'::jsonb,
  naive_attachments jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 4. Table des Révisions Espacées (Méthode J)
create table if not exists public.spaced_repetition (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  course_id uuid references public.nodes(id) on delete cascade,
  course_name text not null,
  date text not null, -- yyyy-MM-dd
  step integer not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- 5. Table des Statistiques (Temps d'étude)
create table if not exists public.course_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  course_id uuid references public.nodes(id) on delete cascade unique,
  seconds integer default 0,
  updated_at timestamptz default now()
);

-- 6. Table des Notes aux Annales
create table if not exists public.annale_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  parent_id uuid references public.annale_folders(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.annales_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  folder_id uuid references public.annale_folders(id) on delete set null,
  subject text not null,
  score numeric not null,
  attachments jsonb default '[]'::jsonb,
  date timestamptz default now()
);

-- 7. Table des Résultats QCM
create table if not exists public.mcq_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  course_id uuid references public.nodes(id) on delete cascade,
  course_name text not null,
  score integer not null,
  total integer not null,
  date timestamptz default now(),
  mcqs jsonb default '[]'::jsonb,
  selected_answers jsonb default '{}'::jsonb
);

-- Activer la sécurité (RLS) sur toutes les tables
alter table public.profiles enable row level security;
alter table public.nodes enable row level security;
alter table public.course_data enable row level security;
alter table public.spaced_repetition enable row level security;
alter table public.course_stats enable row level security;
alter table public.annale_folders enable row level security;
alter table public.annales_grades enable row level security;
alter table public.mcq_grades enable row level security;

-- Politiques pour PROFILES
drop policy if exists "Users can see own profile" on profiles;
create policy "Users can see own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Politiques pour NODES
drop policy if exists "Users can manage own nodes" on nodes;
create policy "Users can manage own nodes" on nodes for all using (auth.uid() = user_id);

-- Politiques pour COURSE_DATA
drop policy if exists "Users can manage own course data" on course_data;
create policy "Users can manage own course data" on course_data for all using (auth.uid() = user_id);

-- Politiques pour SPACED_REPETITION
drop policy if exists "Users can manage own spaced repetition" on spaced_repetition;
create policy "Users can manage own spaced repetition" on spaced_repetition for all using (auth.uid() = user_id);

-- Politiques pour COURSE_STATS
drop policy if exists "Users can manage own course stats" on course_stats;
create policy "Users can manage own course stats" on course_stats for all using (auth.uid() = user_id);

-- Politiques pour ANNALES (Table et Dossiers)
drop policy if exists "Users can manage own annale folders" on annale_folders;
create policy "Users can manage own annale folders" on annale_folders for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own annales grades" on annales_grades;
create policy "Users can manage own annales grades" on annales_grades for all using (auth.uid() = user_id);

-- Politiques pour MCQ_GRADES
drop policy if exists "Users can manage own mcq grades" on mcq_grades;
create policy "Users can manage own mcq grades" on mcq_grades for all using (auth.uid() = user_id);
```

### 3. Pourquoi c'est nécessaire ?
Sans cette table, l'application ne peut pas enregistrer votre nom, vos préférences ou votre statut d'abonnement (Premium/Gratuit). Une fois la table créée, tout fonctionnera instantanément !
