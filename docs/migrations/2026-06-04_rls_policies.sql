-- Migration: enable RLS policies for core tables

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.pickup_points enable row level security;
alter table public.notifications enable row level security;

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their profile" ON public.profiles;
CREATE POLICY "Users can insert their profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their profile" ON public.profiles;
CREATE POLICY "Users can update their profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Favorites
DROP POLICY IF EXISTS "Favorites are visible to owner" ON public.favorites;
CREATE POLICY "Favorites are visible to owner" ON public.favorites
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Favorites can be inserted by owner" ON public.favorites;
CREATE POLICY "Favorites can be inserted by owner" ON public.favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Favorites can be deleted by owner" ON public.favorites;
CREATE POLICY "Favorites can be deleted by owner" ON public.favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Pickup points
DROP POLICY IF EXISTS "Pickup points are viewable by everyone" ON public.pickup_points;
CREATE POLICY "Pickup points are viewable by everyone" ON public.pickup_points
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Pickup points can be created by owner" ON public.pickup_points;
CREATE POLICY "Pickup points can be created by owner" ON public.pickup_points
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Pickup points can be updated by owner" ON public.pickup_points;
CREATE POLICY "Pickup points can be updated by owner" ON public.pickup_points
  FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Pickup points can be deleted by owner" ON public.pickup_points;
CREATE POLICY "Pickup points can be deleted by owner" ON public.pickup_points
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Notifications
DROP POLICY IF EXISTS "Notifications are visible to owner" ON public.notifications;
CREATE POLICY "Notifications are visible to owner" ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Notifications can be inserted by authenticated users" ON public.notifications;
CREATE POLICY "Notifications can be inserted by authenticated users" ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Notifications can be updated by owner" ON public.notifications;
CREATE POLICY "Notifications can be updated by owner" ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Notifications can be deleted by owner" ON public.notifications;
CREATE POLICY "Notifications can be deleted by owner" ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);
