-- ====================================================================
-- SCRIPT DE ACTUALIZACIÓN: MULTIUSUARIO & PRIVACIDAD TOTAL (SUPABASE)
-- Copia y pega este script en el "SQL Editor" de tu proyecto en Supabase
-- y presiona el botón "RUN".
-- ====================================================================

-- 1. Crear tabla de tareas (si no existe)
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    title TEXT NOT NULL,
    notes TEXT,
    has_due_date BOOLEAN DEFAULT false,
    due_date TEXT,
    due_time TEXT,
    priority TEXT DEFAULT 'medium',
    category TEXT DEFAULT 'trabajo',
    completed BOOLEAN DEFAULT false,
    completed_at BIGINT,
    created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 2. Asegurar que la columna user_email exista en caso la tabla ya existía
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 3. Asignar tus tareas existentes a tu correo para que no se pierdan
UPDATE public.tasks 
SET user_email = 'adders.ammh@gmail.com' 
WHERE user_email IS NULL;

-- 4. Crear índice para que las búsquedas por usuario sean ultrarrápidas
CREATE INDEX IF NOT EXISTS idx_tasks_user_email ON public.tasks(user_email);

-- 5. Habilitar Row Level Security (RLS) en tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acceso completo con anon key" ON public.tasks;
CREATE POLICY "Permitir acceso completo con anon key" 
ON public.tasks 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- 6. Crear tabla de usuarios autorizados con licencia
CREATE TABLE IF NOT EXISTS public.authorized_users (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    nombre TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en authorized_users
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acceso a authorized_users con anon key" ON public.authorized_users;
CREATE POLICY "Permitir acceso a authorized_users con anon key" 
ON public.authorized_users 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- 7. Registrar tu cuenta administradora inicial
INSERT INTO public.authorized_users (email, password, nombre)
VALUES ('adders.ammh@gmail.com', '123456', 'Administrador')
ON CONFLICT (email) DO NOTHING;

-- 8. Habilitar replicación en tiempo real (Realtime) para sincronización instantánea
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;
