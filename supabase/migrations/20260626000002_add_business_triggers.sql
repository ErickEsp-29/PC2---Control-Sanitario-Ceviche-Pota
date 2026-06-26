-- Migration to add business columns and trigger for sanitization status update

-- 1. Add 'activo' column to vendedores for soft delete (US8)
ALTER TABLE public.vendedores 
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add 'estado_sanitario' column to puestos (US9, US16)
ALTER TABLE public.puestos 
ADD COLUMN IF NOT EXISTS estado_sanitario VARCHAR(50) NOT NULL DEFAULT 'Sin Inspección'
CONSTRAINT chk_estado_sanitario CHECK (estado_sanitario IN ('Sin Inspección', 'Salubre', 'Insalubre', 'Aprobado', 'Observado', 'Clausurado'));

-- 3. Create or replace trigger function to update puestos.estado_sanitario upon inspection (US16)
CREATE OR REPLACE FUNCTION public.update_puesto_estado_sanitario()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.puestos
  SET estado_sanitario = 
    CASE 
      WHEN NEW.resultado = 'Aprobado' THEN 'Aprobado'
      WHEN NEW.resultado = 'Observado' THEN 'Observado'
      WHEN NEW.resultado = 'Rechazado' THEN 'Clausurado'
      ELSE 'Sin Inspección'
    END
  WHERE id = NEW.puesto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trg_update_puesto_estado_sanitario ON public.inspecciones;
CREATE TRIGGER trg_update_puesto_estado_sanitario
AFTER INSERT ON public.inspecciones
FOR EACH ROW
EXECUTE FUNCTION public.update_puesto_estado_sanitario();
