-- ====================================================================
-- TABLA DE PENDIENTES PARA PLANSYNC (SUPABASE)
-- Copia y pega este script en el "SQL Editor" de tu proyecto en Supabase
-- y presiona el botón "RUN".
-- ====================================================================

-- 1. Crear la tabla de tareas
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
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

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para permitir lectura, inserción, actualización y eliminación
-- usando la anon key (clave pública segura)
CREATE POLICY "Permitir acceso completo con anon key" 
ON public.tasks 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- 4. Habilitar replicación en tiempo real (Realtime) para sincronización instantánea
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
