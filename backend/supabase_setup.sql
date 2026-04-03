-- Supabase SQL setup for DermAI
-- Run these commands in your Supabase SQL Editor

-- 1. Create the dermatology_knowledge table
CREATE TABLE IF NOT EXISTS public.dermatology_knowledge (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[],
    embedding VECTOR(1536), -- For OpenAI embeddings, adjust size as needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the match_documents function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.78,
    match_count INT DEFAULT 10
)
RETURNS TABLE(
    id BIGINT,
    title TEXT,
    content TEXT,
    category TEXT,
    tags TEXT[],
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dk.id,
        dk.title,
        dk.content,
        dk.category,
        dk.tags,
        1 - (dk.embedding <=> query_embedding) AS similarity
    FROM dermatology_knowledge dk
    WHERE 1 - (dk.embedding <=> query_embedding) > match_threshold
    ORDER BY dk.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS dermatology_knowledge_embedding_idx ON public.dermatology_knowledge 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS dermatology_knowledge_category_idx ON public.dermatology_knowledge(category);
CREATE INDEX IF NOT EXISTS dermatology_knowledge_title_idx ON public.dermatology_knowledge USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS dermatology_knowledge_content_idx ON public.dermatology_knowledge USING gin(to_tsvector('english', content));

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.dermatology_knowledge ENABLE ROW LEVEL SECURITY;

-- 5. Create policy to allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON public.dermatology_knowledge
    FOR SELECT USING (auth.role() = 'authenticated');

-- 6. Create policy to allow insert/update for authenticated users (optional)
CREATE POLICY "Allow insert for authenticated users" ON public.dermatology_knowledge
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON public.dermatology_knowledge
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 7. Insert some sample dermatology knowledge
INSERT INTO public.dermatology_knowledge (title, content, category, tags) VALUES
('Acne Treatment Basics', 'Acne is a common skin condition that affects millions of people. Basic treatment includes cleansing with gentle products, using topical retinoids, and avoiding harsh scrubbing.', 'Acne', ARRAY['acne', 'treatment', 'skincare']),
('Eczema Management', 'Eczema (atopic dermatitis) requires gentle skincare, moisturizing, and avoiding triggers. Topical corticosteroids may be prescribed for flare-ups.', 'Eczema', ARRAY['eczema', 'atopic dermatitis', 'moisturizer']),
('Skin Cancer Warning Signs', 'Look for the ABCDE signs: Asymmetry, Border irregularity, Color variation, Diameter larger than 6mm, and Evolution or changes over time.', 'Skin Cancer', ARRAY['skin cancer', 'melanoma', 'warning signs']),
('Sun Protection Guidelines', 'Use broad-spectrum sunscreen with SPF 30 or higher, reapply every 2 hours, seek shade during peak hours (10 AM - 4 PM), and wear protective clothing.', 'Sun Protection', ARRAY['sunscreen', 'UV protection', 'prevention']);

-- Note: The embedding vectors will need to be generated and updated using your embedding service