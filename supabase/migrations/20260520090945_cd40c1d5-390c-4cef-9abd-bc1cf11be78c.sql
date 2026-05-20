-- XP/Level sistemi
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;

-- İstenen hediyeler (idempotent)
INSERT INTO public.gifts (name, emoji, cost)
SELECT 'Elmas', '💎', 100
WHERE NOT EXISTS (SELECT 1 FROM public.gifts WHERE name='Elmas');

INSERT INTO public.gifts (name, emoji, cost)
SELECT 'Spor Araba', '🏎️', 1000
WHERE NOT EXISTS (SELECT 1 FROM public.gifts WHERE name='Spor Araba');

INSERT INTO public.gifts (name, emoji, cost)
SELECT 'Ejderha', '🐉', 5000
WHERE NOT EXISTS (SELECT 1 FROM public.gifts WHERE name='Ejderha');