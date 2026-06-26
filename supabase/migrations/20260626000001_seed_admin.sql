-- Seed Admin User for Authentication and Testing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert into auth.users (Supabase Auth)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    phone,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'c2dfb8f2-897b-4ef1-be56-074fcfb219b1',
    'authenticated',
    'authenticated',
    'erick@gmail.com',
    crypt('erick123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Erick Admin","rol":"administrador"}',
    false,
    null,
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Link to public.usuarios profiles
INSERT INTO public.usuarios (id, email, nombre, rol)
VALUES (
    'c2dfb8f2-897b-4ef1-be56-074fcfb219b1',
    'erick@gmail.com',
    'Erick Admin',
    'administrador'
) ON CONFLICT (id) DO NOTHING;

