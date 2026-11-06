-- Для тех, кто уже запускал schema.sql: добавляет колонку с подробными метриками голоса.
alter table public.sessions add column if not exists metrics jsonb;
