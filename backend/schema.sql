CREATE TABLE IF NOT EXISTS public.face_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT,
  tune_id TEXT NOT NULL,
  preview_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  tune_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  face_model_id UUID REFERENCES public.face_models(id),
  product_model_id UUID REFERENCES public.product_models(id),
  prompt TEXT NOT NULL,
  shoot_type TEXT,
  ai_model TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'pending',
  astria_request_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USERS TABLE (main credit holder)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  credits INT DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CREDIT TRANSACTIONS (history)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES public.users(id),
  type TEXT, -- 'free', 'usage', 'purchase'
  amount INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FUNCTION TO SAFELY DEDUCT CREDITS (ATOMIC)
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id TEXT, p_amount INT)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INT;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT credits INTO current_credits FROM public.users WHERE id = p_user_id FOR UPDATE;
  
  IF current_credits >= p_amount THEN
    UPDATE public.users SET credits = credits - p_amount WHERE id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO ADD CREDITS
CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id TEXT, p_amount INT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.users SET credits = credits + p_amount WHERE id = p_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
