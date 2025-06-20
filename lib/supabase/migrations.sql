-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  encrypted_claude_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('UTC', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  variations TEXT[] DEFAULT '{}',
  website TEXT,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL
);

-- Create updated_at trigger for companies
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create policies for companies
CREATE POLICY "Users can view their own companies" ON companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" ON companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" ON companies
  FOR DELETE USING (auth.uid() = user_id);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  press_release_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL,
  UNIQUE(user_id, press_release_id)
);

-- Enable Row Level Security for bookmarks
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies for bookmarks
CREATE POLICY "Users can view their own bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Create read_status table
CREATE TABLE IF NOT EXISTS read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  press_release_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL,
  UNIQUE(user_id, press_release_id)
);

-- Enable Row Level Security for read_status
ALTER TABLE read_status ENABLE ROW LEVEL SECURITY;

-- Create policies for read_status
CREATE POLICY "Users can view their own read status" ON read_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read status" ON read_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own read status" ON read_status
  FOR DELETE USING (auth.uid() = user_id); 