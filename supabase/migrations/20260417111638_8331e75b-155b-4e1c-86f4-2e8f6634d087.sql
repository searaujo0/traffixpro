create type public.app_role as enum ('admin', 'cliente');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment text,
  status text not null default 'ativo',
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  status text not null default 'ativa',
  spend numeric not null default 0,
  conversations integer not null default 0,
  clicks integer not null default 0,
  impressions integer not null default 0,
  reach integer not null default 0,
  ctr numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  quantity integer not null default 0,
  unit_value numeric not null default 0,
  sale_date date not null default current_date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.sales enable row level security;

create policy "Users see own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins all clients" on public.clients for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Clients view own" on public.clients for select to authenticated using (owner_user_id = auth.uid());

create policy "Admins all campaigns" on public.campaigns for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Clients view own campaigns" on public.campaigns for select to authenticated using (exists (select 1 from public.clients c where c.id = campaigns.client_id and c.owner_user_id = auth.uid()));

create policy "Admins all sales" on public.sales for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Clients view own sales" on public.sales for select to authenticated using (exists (select 1 from public.clients c where c.id = sales.client_id and c.owner_user_id = auth.uid()));
create policy "Clients insert own sales" on public.sales for insert to authenticated with check (exists (select 1 from public.clients c where c.id = sales.client_id and c.owner_user_id = auth.uid()));