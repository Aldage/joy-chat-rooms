ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_password_format CHECK (password IS NULL OR password ~ '^[0-9]{4}$');