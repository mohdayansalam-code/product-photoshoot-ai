-- PRODUCTION HARDENING SQL MIGRATIONS

-- 1. Add request_id to generations for Idempotency
ALTER TABLE generations ADD COLUMN IF NOT EXISTS request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_generations_request_id ON generations (request_id) WHERE request_id IS NOT NULL;

-- 2. Add worker_id for Concurrency Locking
ALTER TABLE generations ADD COLUMN IF NOT EXISTS worker_id TEXT;

-- 3. Create metrics table for Failure Analytics
CREATE TABLE IF NOT EXISTS generation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    user_id UUID NOT NULL,
    model TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_reason TEXT,
    credits_used NUMERIC NOT NULL,
    image_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Atomic Transaction RPC: create_generation_job
-- This ensures credits are deducted and job is created in ONE atomic block.
-- It also handles Idempotency.
CREATE OR REPLACE FUNCTION create_generation_job(
    p_user_id UUID,
    p_request_id TEXT,
    p_image_url TEXT,
    p_prompt TEXT,
    p_model TEXT,
    p_image_count INTEGER,
    p_fetchers_json JSONB,
    p_credits_cost NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_job_id UUID;
    v_current_credits NUMERIC;
BEGIN
    -- A. Idempotency Check
    IF p_request_id IS NOT NULL THEN
        SELECT id INTO v_job_id FROM generations WHERE request_id = p_request_id AND user_id = p_user_id;
        IF FOUND THEN
            RETURN jsonb_build_object('success', true, 'id', v_job_id, 'idempotent', true);
        END IF;
    END IF;

    -- B. Credit Check
    SELECT credits_remaining INTO v_current_credits FROM credits WHERE user_id = p_user_id;
    IF v_current_credits < p_credits_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS');
    END IF;

    -- C. Deduct Credits
    UPDATE credits SET credits_remaining = credits_remaining - p_credits_cost WHERE user_id = p_user_id;

    -- D. Insert Job
    INSERT INTO generations (
        user_id, request_id, image_url, prompt, model, image_count, fetchers_json, credits_used, status
    ) VALUES (
        p_user_id, p_request_id, p_image_url, p_prompt, p_model, p_image_count, p_fetchers_json, p_credits_cost, 'queued'
    ) RETURNING id INTO v_job_id;

    RETURN jsonb_build_object('success', true, 'id', v_job_id, 'idempotent', false);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
