INSERT INTO public.gifts (name, emoji, cost) VALUES
  ('Çöl Dansçısı', '💃', 2000),
  ('Ayıcık Kucağı', '🧸', 3500),
  ('Kağıt Uçak Yolculuğu', '✈️', 2000)
ON CONFLICT DO NOTHING;