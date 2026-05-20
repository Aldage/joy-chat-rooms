ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_seat_count_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_seat_count_check CHECK (seat_count BETWEEN 1 AND 12);

ALTER TABLE public.rooms ALTER COLUMN seat_count SET DEFAULT 10;

INSERT INTO public.room_seats (room_id, seat_index, user_id)
SELECT r.id, gs.idx, NULL
FROM public.rooms r
CROSS JOIN LATERAL generate_series(0, 9) AS gs(idx)
WHERE NOT EXISTS (
  SELECT 1 FROM public.room_seats s WHERE s.room_id = r.id AND s.seat_index = gs.idx
);

UPDATE public.rooms SET seat_count = 10 WHERE seat_count < 10;