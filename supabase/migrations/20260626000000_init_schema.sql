-- ============================================================================
-- JUSTIFICACIÓN TÉCNICA: POSTGRESQL VS NOSQL PARA CONTROL SANITARIO MUNICIPAL
-- ============================================================================
-- 1. INTEGRIDAD REFERENCIAL Y CONTROL DE HUÉRFANOS: 
--    En este sistema, una licencia o una inspección no puede existir flotando sin un puesto
--    asociado. PostgreSQL garantiza esto de forma nativa mediante claves foráneas (FOREIGN KEY) 
--    y restricciones de tipo ON DELETE RESTRICT/CASCADE. En NoSQL (ej. MongoDB), mantener
--    esta consistencia requiere lógica en la aplicación que es vulnerable a condiciones de carrera.
-- 
-- 2. TRANSACCIONES ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad):
--    El registro de inspecciones y la actualización de licencias involucran múltiples tablas.
--    PostgreSQL asegura que estas operaciones críticas se completen en su totalidad o se 
--    reviertan por completo, evitando estados de datos intermedios e inconsistentes.
-- 
-- 3. AUDITORÍA SANITARIA INMUTABLE:
--    Las inspecciones sanitarias representan documentos de fiscalización municipal con validez legal.
--    PostgreSQL permite definir restricciones rígidas a nivel de base de datos (CHECK constraints, 
--    NOT NULL, campos UNIQUE) y triggers automáticos para logs de auditoría no alterables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLA: usuarios (Inspectores y Admins)
-- ==========================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('administrador', 'inspector')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 2. TABLA: vendedores (Ceviche de Pota)
-- ==========================================
CREATE TABLE vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni VARCHAR(20) UNIQUE NOT NULL CHECK (length(dni) >= 8),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 3. TABLA: puestos (Carretillas/Módulos)
-- ==========================================
CREATE TABLE puestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_unico VARCHAR(50) UNIQUE NOT NULL,
    ubicacion TEXT NOT NULL,
    tipo_carretilla VARCHAR(100) NOT NULL,
    vendedor_id UUID NOT NULL REFERENCES vendedores(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 4. TABLA: licencias (Habilitación Municipal)
-- ==========================================
CREATE TABLE licencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puesto_id UUID NOT NULL REFERENCES puestos(id) ON DELETE CASCADE,
    numero_licencia VARCHAR(50) UNIQUE NOT NULL,
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('Vigente', 'Vencida', 'Suspendida')),
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT chk_fechas CHECK (fecha_vencimiento >= fecha_emision)
);

-- ==========================================
-- 5. TABLA: inspecciones (Fiscalizaciones)
-- ==========================================
CREATE TABLE inspecciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puesto_id UUID NOT NULL REFERENCES puestos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_inspeccion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    resultado VARCHAR(50) NOT NULL CHECK (resultado IN ('Aprobado', 'Rechazado', 'Observado')),
    observaciones TEXT,
    estado_sanitario VARCHAR(50) NOT NULL CHECK (estado_sanitario IN ('Salubre', 'Insalubre')),
    temperatura_pota NUMERIC(4,2) NOT NULL CHECK (temperatura_pota >= -10.0 AND temperatura_pota <= 40.0), -- Cadena de frío
    verificacion_especie BOOLEAN NOT NULL DEFAULT TRUE, -- Evita fraude alimentario (pota por otro pescado)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- ÍNDICES OPTIMIZADOS PARA CONSULTAS FRECUENTES
-- ==========================================
CREATE INDEX idx_vendedores_dni ON vendedores(dni);
CREATE INDEX idx_puestos_codigo ON puestos(codigo_unico);
CREATE INDEX idx_licencias_puesto ON licencias(puesto_id);
CREATE INDEX idx_inspecciones_puesto ON inspecciones(puesto_id);
CREATE INDEX idx_inspecciones_usuario ON inspecciones(usuario_id);

-- ==========================================
-- INSERTAR DATOS DE PRUEBA
-- ==========================================

-- Usuarios (Inspectores / Administradores)
INSERT INTO usuarios (id, email, nombre, rol) VALUES
('b19dfb40-62e9-4e78-bc4a-9db0c5a35a61', 'admin.sanitario@municipalidad.gob.pe', 'Carlos Mendoza', 'administrador'),
('f88b5ef2-7db5-48b0-8c29-3738cfc29672', 'inspector1.sanidad@municipalidad.gob.pe', 'Ana Portal', 'inspector'),
('4e112d7c-3f95-46eb-8a48-d4fa2bc0e5ab', 'inspector2.sanidad@municipalidad.gob.pe', 'José Quispe', 'inspector');

-- Vendedores
INSERT INTO vendedores (id, dni, nombres, apellidos, telefono, email) VALUES
('a2c3a50d-dfbe-4781-a982-f67e0e7a4b81', '45893201', 'Juan Alberto', 'Gómez Rivera', '987654321', 'juan.gomez@gmail.com'),
('6d8eb941-bb03-4c91-a532-6a7cfbde09ef', '71029384', 'María Elena', 'Flores Choque', '998877665', 'maria.flores@gmail.com'),
('fd9c21f7-e435-4cb3-be5d-1f6305a4bc9f', '09283746', 'Pedro Carlos', 'Sánchez Díaz', '941234567', 'pedro.sanchez@gmail.com');

-- Puestos
INSERT INTO puestos (id, codigo_unico, ubicacion, tipo_carretilla, vendedor_id) VALUES
('c88f1708-cf1c-43f1-bfa6-80927cb70af2', 'PST-001', 'Av. Larco 450, Miraflores', 'Carretilla de Acero Inoxidable con Nevera Integrada', 'a2c3a50d-dfbe-4781-a982-f67e0e7a4b81'),
('1bf81190-2e4b-4b1f-aa33-722a46db5f21', 'PST-002', 'Jr. de la Unión 820, Cercado de Lima', 'Carretilla Móvil con Techo de Lona y Compartimiento Térmico', '6d8eb941-bb03-4c91-a532-6a7cfbde09ef'),
('5a3c8fb2-eb0a-4a2c-b570-5b12ef368ab2', 'PST-003', 'Av. Angamos Oeste 1200, Surquillo', 'Módulo Fijo Municipal de Estructura Metálica', 'fd9c21f7-e435-4cb3-be5d-1f6305a4bc9f');

-- Licencias
INSERT INTO licencias (id, puesto_id, numero_licencia, estado, fecha_emision, fecha_vencimiento) VALUES
('92e8c2ff-28bf-4c74-a690-3b47cb823901', 'c88f1708-cf1c-43f1-bfa6-80927cb70af2', 'LIC-2026-0001', 'Vigente', '2026-01-15', '2027-01-15'),
('7b02c89f-2da9-4934-bc2c-569d67baef1a', '1bf81190-2e4b-4b1f-aa33-722a46db5f21', 'LIC-2026-0002', 'Vigente', '2026-02-10', '2027-02-10'),
('e39c8112-9ab2-4b2a-bc91-231cbde89c3b', '5a3c8fb2-eb0a-4a2c-b570-5b12ef368ab2', 'LIC-2025-0999', 'Vencida', '2025-05-20', '2026-05-20');

-- Inspecciones
INSERT INTO inspecciones (id, puesto_id, usuario_id, fecha_inspeccion, resultado, observaciones, estado_sanitario, temperatura_pota, verificacion_especie) VALUES
('a88fb03b-cde2-4c28-98e1-0c58eab48701', 'c88f1708-cf1c-43f1-bfa6-80927cb70af2', 'f88b5ef2-7db5-48b0-8c29-3738cfc29672', '2026-06-20 10:30:00-05', 'Aprobado', 'Puesto limpio, utensilios desinfectados correctamente.', 'Salubre', 3.5, TRUE),
('d2c88f40-3ab2-468e-9092-be20cb98cd3d', '1bf81190-2e4b-4b1f-aa33-722a46db5f21', 'f88b5ef2-7db5-48b0-8c29-3738cfc29672', '2026-06-22 11:15:00-05', 'Observado', 'La temperatura de la pota está ligeramente elevada (7.2°C). Se recomienda agregar más hielo.', 'Salubre', 7.2, TRUE),
('fb29d38c-e2ab-472a-9cb2-fe29c8e90aef', '5a3c8fb2-eb0a-4a2c-b570-5b12ef368ab2', '4e112d7c-3f95-46eb-8a48-d4fa2bc0e5ab', '2026-06-24 09:00:00-05', 'Rechazado', 'Infracción grave: Cadena de frío rota (14.5°C) y venta de especie sospechosa no declarada como pota.', 'Insalubre', 14.5, FALSE);
