-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    language_preference VARCHAR(10) DEFAULT 'en' CHECK (language_preference IN ('en', 'bn')),
    theme_preference VARCHAR(10) DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Health Entries Table
CREATE TABLE health_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
    height_cm DECIMAL(5,2) NOT NULL CHECK (height_cm > 50 AND height_cm < 300),
    weight_kg DECIMAL(5,2) NOT NULL CHECK (weight_kg > 10 AND weight_kg < 500),
    bmi DECIMAL(4,2) NOT NULL CHECK (bmi > 10 AND bmi < 60),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- 3. Chat Sessions Table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Chat Messages Table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Symptom Analyses Table
CREATE TABLE symptom_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    symptoms JSONB NOT NULL,
    causes JSONB NOT NULL,
    treatments JSONB NOT NULL,
    medications JSONB NOT NULL,
    mental_health_support JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Medical Records Table
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    issue_date DATE NOT NULL,
    file_data TEXT NOT NULL, -- base64 encoded or Supabase Storage URL
    file_type VARCHAR(100) NOT NULL,
    file_size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Prescriptions Table
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_name VARCHAR(200) NOT NULL,
    issue_date DATE NOT NULL,
    file_data TEXT, -- optional prescription image
    file_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Prescription Drugs Table
CREATE TABLE prescription_drugs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    drug_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    reminder_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Drug Reminder Times Table
CREATE TABLE drug_reminder_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drug_id UUID NOT NULL REFERENCES prescription_drugs(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 10. Insurance Information Table
CREATE TABLE insurance_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_name VARCHAR(200) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    contact_info TEXT,
    file_data TEXT, -- insurance card image
    file_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 11. Diet Plans Table
CREATE TABLE diet_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal VARCHAR(50) NOT NULL CHECK (goal IN ('weight-loss', 'maintain-weight', 'muscle-gain', 'weight-gain')),
    dietary_preference VARCHAR(50) NOT NULL CHECK (dietary_preference IN ('non-vegetarian', 'vegetarian', 'vegan')),
    summary TEXT NOT NULL,
    based_on_health_entry_id UUID REFERENCES health_entries(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Diet Plan Days Table
CREATE TABLE diet_plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diet_plan_id UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
    day_name VARCHAR(50) NOT NULL,
    daily_note TEXT,
    day_order INTEGER NOT NULL
);

-- 13. Diet Plan Meals Table
CREATE TABLE diet_plan_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diet_plan_day_id UUID NOT NULL REFERENCES diet_plan_days(id) ON DELETE CASCADE,
    meal_name VARCHAR(100) NOT NULL,
    meal_items JSONB NOT NULL, -- Array of food items
    meal_order INTEGER NOT NULL
);

-- 14. Exercise Plans Table
CREATE TABLE exercise_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal VARCHAR(50) NOT NULL CHECK (goal IN ('weight-loss', 'maintain-weight', 'muscle-gain', 'weight-gain')),
    fitness_level VARCHAR(50) NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
    location VARCHAR(50) NOT NULL CHECK (location IN ('home', 'gym')),
    time_per_day VARCHAR(50) NOT NULL,
    advice TEXT NOT NULL,
    based_on_health_entry_id UUID REFERENCES health_entries(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Exercise Plan Days Table
CREATE TABLE exercise_plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_plan_id UUID NOT NULL REFERENCES exercise_plans(id) ON DELETE CASCADE,
    day_name VARCHAR(50) NOT NULL,
    details TEXT,
    day_order INTEGER NOT NULL
);

-- 16. Exercise Plan Exercises Table
CREATE TABLE exercise_plan_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_plan_day_id UUID NOT NULL REFERENCES exercise_plan_days(id) ON DELETE CASCADE,
    exercise_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    duration VARCHAR(50) NOT NULL,
    exercise_type VARCHAR(50) NOT NULL CHECK (exercise_type IN ('Cardio', 'Strength', 'Flexibility')),
    exercise_order INTEGER NOT NULL
);

-- 17. Health Advice Table
CREATE TABLE health_advice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL CHECK (language IN ('en', 'bn')),
    dietary_advice JSONB NOT NULL,
    exercise_recommendations JSONB NOT NULL,
    lifestyle_suggestions JSONB NOT NULL,
    based_on_entries_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for performance optimization

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Health entries indexes
CREATE INDEX idx_health_entries_user_id ON health_entries(user_id);
CREATE INDEX idx_health_entries_date ON health_entries(date DESC);
CREATE INDEX idx_health_entries_user_date ON health_entries(user_id, date DESC);

-- Chat sessions indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- Chat messages indexes
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_text_search ON chat_messages USING gin(to_tsvector('english', message_text));

-- Symptom analyses indexes
CREATE INDEX idx_symptom_analyses_message_id ON symptom_analyses(message_id);
CREATE INDEX idx_symptom_analyses_symptoms ON symptom_analyses USING gin(symptoms);
CREATE INDEX idx_symptom_analyses_causes ON symptom_analyses USING gin(causes);

-- Medical records indexes
CREATE INDEX idx_medical_records_user_id ON medical_records(user_id);
CREATE INDEX idx_medical_records_issue_date ON medical_records(issue_date DESC);

-- Prescriptions indexes
CREATE INDEX idx_prescriptions_user_id ON prescriptions(user_id);
CREATE INDEX idx_prescriptions_issue_date ON prescriptions(issue_date DESC);

-- Prescription drugs indexes
CREATE INDEX idx_prescription_drugs_prescription_id ON prescription_drugs(prescription_id);
CREATE INDEX idx_prescription_drugs_reminder_enabled ON prescription_drugs(reminder_enabled) WHERE reminder_enabled = true;

-- Drug reminder times indexes
CREATE INDEX idx_drug_reminder_times_drug_id ON drug_reminder_times(drug_id);
CREATE INDEX idx_drug_reminder_times_active ON drug_reminder_times(is_active, reminder_time) WHERE is_active = true;

-- Insurance info indexes
CREATE INDEX idx_insurance_info_user_id ON insurance_info(user_id);

-- Diet plans indexes
CREATE INDEX idx_diet_plans_user_id ON diet_plans(user_id);
CREATE INDEX idx_diet_plans_goal ON diet_plans(goal);
CREATE INDEX idx_diet_plans_created_at ON diet_plans(created_at DESC);

-- Diet plan days indexes
CREATE INDEX idx_diet_plan_days_plan_id ON diet_plan_days(diet_plan_id);
CREATE INDEX idx_diet_plan_days_order ON diet_plan_days(diet_plan_id, day_order);

-- Diet plan meals indexes
CREATE INDEX idx_diet_plan_meals_day_id ON diet_plan_meals(diet_plan_day_id);
CREATE INDEX idx_diet_plan_meals_order ON diet_plan_meals(diet_plan_day_id, meal_order);

-- Exercise plans indexes
CREATE INDEX idx_exercise_plans_user_id ON exercise_plans(user_id);
CREATE INDEX idx_exercise_plans_goal ON exercise_plans(goal);
CREATE INDEX idx_exercise_plans_fitness_level ON exercise_plans(fitness_level);
CREATE INDEX idx_exercise_plans_created_at ON exercise_plans(created_at DESC);

-- Exercise plan days indexes
CREATE INDEX idx_exercise_plan_days_plan_id ON exercise_plan_days(exercise_plan_id);
CREATE INDEX idx_exercise_plan_days_order ON exercise_plan_days(exercise_plan_id, day_order);

-- Exercise plan exercises indexes
CREATE INDEX idx_exercise_plan_exercises_day_id ON exercise_plan_exercises(exercise_plan_day_id);
CREATE INDEX idx_exercise_plan_exercises_order ON exercise_plan_exercises(exercise_plan_day_id, exercise_order);
CREATE INDEX idx_exercise_plan_exercises_type ON exercise_plan_exercises(exercise_type);

-- Health advice indexes
CREATE INDEX idx_health_advice_user_id ON health_advice(user_id);
CREATE INDEX idx_health_advice_language ON health_advice(language);
CREATE INDEX idx_health_advice_created_at ON health_advice(created_at DESC);
