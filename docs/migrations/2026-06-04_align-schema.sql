-- Migration: align database with docs/sql.txt
-- Removes chat tables and notification read_at column if they exist.

alter table public.notifications
  drop column if exists read_at;

drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
