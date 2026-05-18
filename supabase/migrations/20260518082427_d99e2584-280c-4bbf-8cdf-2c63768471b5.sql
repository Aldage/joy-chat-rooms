
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Guest',
  avatar_url TEXT,
  bio TEXT,
  coin_balance INTEGER NOT NULL DEFAULT 1000,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat_count INTEGER NOT NULL DEFAULT 8 CHECK (seat_count IN (6, 8)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  tag TEXT DEFAULT 'Sohbet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Room seats
CREATE TABLE public.room_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  seat_index INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, seat_index)
);
ALTER TABLE public.room_seats ENABLE ROW LEVEL SECURITY;

-- Room messages
CREATE TABLE public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Gifts catalog
CREATE TABLE public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  cost INTEGER NOT NULL CHECK (cost > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- Gift transactions
CREATE TABLE public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_id UUID NOT NULL REFERENCES public.gifts(id),
  amount INTEGER NOT NULL DEFAULT 1,
  total_cost INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Roles viewable by self" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Rooms viewable by all auth" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update room" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete room" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Seats viewable by auth" ON public.room_seats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth update seats" ON public.room_seats FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth insert seats" ON public.room_seats FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Messages viewable by auth" ON public.room_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth send messages" ON public.room_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gifts viewable by all" ON public.gifts FOR SELECT USING (true);

CREATE POLICY "Gift tx viewable by participants" ON public.gift_transactions FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Auth send gifts" ON public.gift_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, is_guest)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Guest'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, false)
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-seed seats when a room is created
CREATE OR REPLACE FUNCTION public.seed_room_seats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i INTEGER;
BEGIN
  FOR i IN 0..(NEW.seat_count - 1) LOOP
    INSERT INTO public.room_seats (room_id, seat_index, user_id)
    VALUES (NEW.id, i, CASE WHEN i = 0 THEN NEW.owner_id ELSE NULL END);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_room_created
  AFTER INSERT ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.seed_room_seats();

-- Gift transaction: deduct sender, credit receiver atomically
CREATE OR REPLACE FUNCTION public.apply_gift_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_balance INTEGER;
BEGIN
  SELECT coin_balance INTO sender_balance FROM public.profiles WHERE id = NEW.sender_id FOR UPDATE;
  IF sender_balance IS NULL OR sender_balance < NEW.total_cost THEN
    RAISE EXCEPTION 'Yetersiz bakiye';
  END IF;
  UPDATE public.profiles SET coin_balance = coin_balance - NEW.total_cost, updated_at = now() WHERE id = NEW.sender_id;
  UPDATE public.profiles SET coins_earned = coins_earned + NEW.total_cost, coin_balance = coin_balance + NEW.total_cost, updated_at = now() WHERE id = NEW.receiver_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_gift_sent
  BEFORE INSERT ON public.gift_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_gift_transaction();

-- Seed gifts
INSERT INTO public.gifts (name, emoji, cost) VALUES
  ('Gül', '🌹', 10),
  ('Kalp', '❤️', 50),
  ('Tac', '👑', 200),
  ('Araba', '🚗', 500),
  ('Yat', '🛥️', 1000),
  ('Roket', '🚀', 2500);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_seats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
