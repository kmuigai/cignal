-- Fix user_profiles table by adding missing columns if they don't exist

-- Add avatar_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to user_profiles';
    ELSE
        RAISE NOTICE 'avatar_url column already exists in user_profiles';
    END IF;
END $$;

-- Add full_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'full_name') THEN
        ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to user_profiles';
    ELSE
        RAISE NOTICE 'full_name column already exists in user_profiles';
    END IF;
END $$;

-- Add encrypted_claude_api_key column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'encrypted_claude_api_key') THEN
        ALTER TABLE user_profiles ADD COLUMN encrypted_claude_api_key TEXT;
        RAISE NOTICE 'Added encrypted_claude_api_key column to user_profiles';
    ELSE
        RAISE NOTICE 'encrypted_claude_api_key column already exists in user_profiles';
    END IF;
END $$;

-- Add created_at and updated_at columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'created_at') THEN
        ALTER TABLE user_profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL;
        RAISE NOTICE 'Added created_at column to user_profiles';
    ELSE
        RAISE NOTICE 'created_at column already exists in user_profiles';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL;
        RAISE NOTICE 'Added updated_at column to user_profiles';
    ELSE
        RAISE NOTICE 'updated_at column already exists in user_profiles';
    END IF;
END $$;

-- Show current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position; 