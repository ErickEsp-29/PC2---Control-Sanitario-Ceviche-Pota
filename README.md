# PC2 - Control Sanitario Ceviche Pota

Sistema web municipal para el registro de vendedores ambulantes de ceviche de pota, administración de licencias, fiscalización sanitaria (inspecciones) y consulta pública ciudadana.

## 🚀 Despliegue en Producción

La aplicación se encuentra desplegada y disponible públicamente en Vercel:
- **URL de Producción**: [https://pc-2-control-sanitario-ceviche-pota.vercel.app/](https://pc-2-control-sanitario-ceviche-pota.vercel.app/)

### 🔑 Credenciales de Acceso (Admin Seed)
Para evaluar las secciones restringidas del sistema administrativo/inspección, inicie sesión con el siguiente usuario administrador precargado en Supabase Auth:
- **Correo**: `erick@gmail.com`
- **Contraseña**: `erick123`

---

## 🛠️ Tecnologías Utilizadas
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, React Router v7.
- **Backend & Database**: Supabase (PostgreSQL), con integridad referencial en Tercera Forma Normal (3FN) y cifrado seguro de contraseñas.
- **Generación de QR**: `qrcode.react` para consulta ciudadana móvil en vivo.

## 📁 Estructura del Proyecto
- `src/components`: Componentes reutilizables (como `ProtectedRoute`).
- `src/contexts`: Contextos globales (ej. `AuthContext` para inicio y cierre de sesión).
- `src/layouts`: Plantillas de diseño base (ej. `DashboardLayout` con Navbar y Sidebar).
- `src/pages`: Vistas de la aplicación (Login, Consulta Ciudadana con QR, Dashboard).
- `src/services`: Conectores externos (cliente de Supabase con manejador de errores centralizado).
- `supabase/migrations`: Scripts DDL de base de datos e inyección de datos de prueba.

