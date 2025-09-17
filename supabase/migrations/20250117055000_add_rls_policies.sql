-- Add RLS policies for all existing tables

-- Enable RLS for all tables that don't have it yet
DO $$ 
BEGIN
    -- Health entries
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'health_entries' AND relrowsecurity = true) THEN
        ALTER TABLE health_entries ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Medical records  
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'medical_records' AND relrowsecurity = true) THEN
        ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Prescriptions
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prescriptions' AND relrowsecurity = true) THEN
        ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Prescription drugs
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prescription_drugs' AND relrowsecurity = true) THEN
        ALTER TABLE prescription_drugs ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Drug reminder times
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'drug_reminder_times' AND relrowsecurity = true) THEN
        ALTER TABLE drug_reminder_times ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Insurance info
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'insurance_info' AND relrowsecurity = true) THEN
        ALTER TABLE insurance_info ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Chat sessions
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'chat_sessions' AND relrowsecurity = true) THEN
        ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Chat messages
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'chat_messages' AND relrowsecurity = true) THEN
        ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Symptom analyses
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'symptom_analyses' AND relrowsecurity = true) THEN
        ALTER TABLE symptom_analyses ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Diet plans
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'diet_plans' AND relrowsecurity = true) THEN
        ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Diet plan days
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'diet_plan_days' AND relrowsecurity = true) THEN
        ALTER TABLE diet_plan_days ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Diet plan meals
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'diet_plan_meals' AND relrowsecurity = true) THEN
        ALTER TABLE diet_plan_meals ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Exercise plans
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'exercise_plans' AND relrowsecurity = true) THEN
        ALTER TABLE exercise_plans ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Exercise plan days
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'exercise_plan_days' AND relrowsecurity = true) THEN
        ALTER TABLE exercise_plan_days ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Exercise plan exercises
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'exercise_plan_exercises' AND relrowsecurity = true) THEN
        ALTER TABLE exercise_plan_exercises ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Health advice
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'health_advice' AND relrowsecurity = true) THEN
        ALTER TABLE health_advice ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create policies for health_entries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_entries' AND policyname = 'Users can view their own health entries') THEN
        CREATE POLICY "Users can view their own health entries" ON health_entries
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_entries' AND policyname = 'Users can insert their own health entries') THEN
        CREATE POLICY "Users can insert their own health entries" ON health_entries
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_entries' AND policyname = 'Users can update their own health entries') THEN
        CREATE POLICY "Users can update their own health entries" ON health_entries
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_entries' AND policyname = 'Users can delete their own health entries') THEN
        CREATE POLICY "Users can delete their own health entries" ON health_entries
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policies for medical_records
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medical_records' AND policyname = 'Users can view their own medical records') THEN
        CREATE POLICY "Users can view their own medical records" ON medical_records
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medical_records' AND policyname = 'Users can insert their own medical records') THEN
        CREATE POLICY "Users can insert their own medical records" ON medical_records
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medical_records' AND policyname = 'Users can update their own medical records') THEN
        CREATE POLICY "Users can update their own medical records" ON medical_records
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medical_records' AND policyname = 'Users can delete their own medical records') THEN
        CREATE POLICY "Users can delete their own medical records" ON medical_records
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policies for prescriptions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'Users can view their own prescriptions') THEN
        CREATE POLICY "Users can view their own prescriptions" ON prescriptions
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'Users can insert their own prescriptions') THEN
        CREATE POLICY "Users can insert their own prescriptions" ON prescriptions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'Users can update their own prescriptions') THEN
        CREATE POLICY "Users can update their own prescriptions" ON prescriptions
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'Users can delete their own prescriptions') THEN
        CREATE POLICY "Users can delete their own prescriptions" ON prescriptions
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policies for chat_sessions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can view their own chat sessions') THEN
        CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can insert their own chat sessions') THEN
        CREATE POLICY "Users can insert their own chat sessions" ON chat_sessions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can update their own chat sessions') THEN
        CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can delete their own chat sessions') THEN
        CREATE POLICY "Users can delete their own chat sessions" ON chat_sessions
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policies for diet_plans
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_plans' AND policyname = 'Users can view their own diet plans') THEN
        CREATE POLICY "Users can view their own diet plans" ON diet_plans
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_plans' AND policyname = 'Users can insert their own diet plans') THEN
        CREATE POLICY "Users can insert their own diet plans" ON diet_plans
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_plans' AND policyname = 'Users can update their own diet plans') THEN
        CREATE POLICY "Users can update their own diet plans" ON diet_plans
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_plans' AND policyname = 'Users can delete their own diet plans') THEN
        CREATE POLICY "Users can delete their own diet plans" ON diet_plans
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policies for exercise_plans
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_plans' AND policyname = 'Users can view their own exercise plans') THEN
        CREATE POLICY "Users can view their own exercise plans" ON exercise_plans
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_plans' AND policyname = 'Users can insert their own exercise plans') THEN
        CREATE POLICY "Users can insert their own exercise plans" ON exercise_plans
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_plans' AND policyname = 'Users can update their own exercise plans') THEN
        CREATE POLICY "Users can update their own exercise plans" ON exercise_plans
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_plans' AND policyname = 'Users can delete their own exercise plans') THEN
        CREATE POLICY "Users can delete their own exercise plans" ON exercise_plans
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;