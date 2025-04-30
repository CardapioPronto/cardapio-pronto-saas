
-- Schema for CardápioPronto SaaS application

-- Enable RLS (Row Level Security)
alter table auth.users enable row level security;

-- Create restaurants table
create table public.restaurants (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    owner_id uuid references auth.users(id) not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Create products table
create table public.products (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    price numeric not null,
    category text not null,
    image_url text,
    available boolean default true not null,
    restaurant_id uuid references public.restaurants(id) not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Create orders table
create table public.orders (
    id uuid default uuid_generate_v4() primary key,
    order_number text default concat('ORD-', substr(uuid_generate_v4()::text, 1, 8)) not null,
    customer_name text not null,
    customer_phone text,
    order_type text not null,
    table_number text,
    status text not null,
    total numeric not null,
    payment_method text,
    restaurant_id uuid references public.restaurants(id) not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    source text,
    ifood_id text
);

-- Create order items table
create table public.order_items (
    id uuid default uuid_generate_v4() primary key,
    order_id uuid references public.orders(id) not null,
    product_id uuid references public.products(id) not null,
    product_name text not null,
    quantity integer not null,
    price numeric not null,
    observations text,
    created_at timestamp with time zone default now() not null
);

-- Create menus table
create table public.menus (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    active boolean default true not null,
    restaurant_id uuid references public.restaurants(id) not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Create menu categories table
create table public.menu_categories (
    id uuid default uuid_generate_v4() primary key,
    menu_id uuid references public.menus(id) not null,
    name text not null,
    description text,
    order integer not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Create menu items table
create table public.menu_items (
    id uuid default uuid_generate_v4() primary key,
    menu_id uuid references public.menus(id) not null,
    category_id uuid references public.menu_categories(id) not null,
    product_id uuid references public.products(id) not null,
    order integer not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Create subscriptions table
create table public.subscriptions (
    id uuid default uuid_generate_v4() primary key,
    restaurant_id uuid references public.restaurants(id) not null,
    plan_id text not null,
    status text not null,
    start_date timestamp with time zone not null,
    end_date timestamp with time zone,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Create restaurant settings table
create table public.restaurant_settings (
    restaurant_id uuid references public.restaurants(id) not null,
    setting_key text not null,
    setting_value jsonb not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    primary key (restaurant_id, setting_key)
);

-- Create ifood integration table
create table public.ifood_integration (
    restaurant_id uuid references public.restaurants(id) not null primary key,
    client_id text not null,
    client_secret text not null,
    merchant_id text not null,
    restaurant_ifood_id text,
    is_enabled boolean default false not null,
    webhook_url text,
    polling_enabled boolean default true not null,
    polling_interval integer default 60 not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Create RLS policies

-- Restaurants: users can only access their own restaurants
create policy "Users can view their own restaurants"
on public.restaurants
for select
using (auth.uid() = owner_id);

create policy "Users can insert their own restaurants"
on public.restaurants
for insert
with check (auth.uid() = owner_id);

create policy "Users can update their own restaurants"
on public.restaurants
for update
using (auth.uid() = owner_id);

-- Products: based on restaurant ownership
create policy "Users can view their restaurant's products"
on public.products
for select
using (
  restaurant_id in (
    select id from public.restaurants
    where owner_id = auth.uid()
  )
);

create policy "Users can insert products to their restaurants"
on public.products
for insert
with check (
  restaurant_id in (
    select id from public.restaurants
    where owner_id = auth.uid()
  )
);

create policy "Users can update their restaurant's products"
on public.products
for update
using (
  restaurant_id in (
    select id from public.restaurants
    where owner_id = auth.uid()
  )
);

-- Similar policies for other tables
-- Orders
create policy "Users can view their restaurant's orders"
on public.orders
for select
using (
  restaurant_id in (
    select id from public.restaurants
    where owner_id = auth.uid()
  )
);

create policy "Users can insert orders to their restaurants"
on public.orders
for insert
with check (
  restaurant_id in (
    select id from public.restaurants
    where owner_id = auth.uid()
  )
);

create policy "Users can update their restaurant's orders"
on public.orders
for update
using (
  restaurant_id in (
    select id from public.restaurants
    where owner_id = auth.uid()
  )
);

-- Enable RLS on all tables
alter table public.restaurants enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.ifood_integration enable row level security;
