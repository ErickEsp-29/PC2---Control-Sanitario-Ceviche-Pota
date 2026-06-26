import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { Login } from "@/pages/Login"
import { Vendors } from "@/pages/Vendors"
import { QRCodeSVG } from 'qrcode.react'

// Mock/Placeholder Views with premium styling
const Home = () => (
  <div className="min-h-screen bg-background flex flex-col justify-between">
    <header className="border-b border-border bg-card/50 backdrop-blur px-6 py-4 flex justify-between items-center">
      <span className="text-xl font-bold tracking-tight text-primary">
        PC2 - Control Sanitario Ceviche Pota
      </span>
      <nav className="flex space-x-4">
        <a href="/login" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
          Iniciar Sesión
        </a>
      </nav>
    </header>

    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto space-y-6">
      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-primary/10 text-primary">
        Plataforma Municipal de Control
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
        Sistema de Control Sanitario de Vendedores
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Plataforma digital para el registro de vendedores ambulantes de ceviche de pota, administración de licencias municipales, inspecciones sanitarias y consulta pública vía QR.
      </p>
      <div className="flex justify-center space-x-4">
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 py-2 shadow cursor-pointer"
        >
          Acceso Personal Municipal
        </a>
        <a
          href="/consulta/ejemplo"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-8 py-2 cursor-pointer"
        >
          Consulta Ciudadana (Demo QR)
        </a>
      </div>
    </main>

    <footer className="border-t border-border bg-card/30 py-4 text-center text-sm text-muted-foreground">
      &copy; 2026 PC2CP - Control Sanitario Ceviche Pota. Todos los derechos reservados.
    </footer>
  </div>
)

const PublicConsulta = () => {
  const { id } = useParams<{ id: string }>()
  const codigoPuesto = id || 'PST-001'
  const currentUrl = `${window.location.origin}/consulta/${codigoPuesto}`

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-card border border-border p-8 rounded-lg shadow-sm space-y-6">
        <div className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 p-3 text-emerald-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Consulta Ciudadana</h1>
        <p className="text-muted-foreground text-sm">
          Escanea el código QR del puesto para verificar en tiempo real si cuenta con licencia municipal vigente e inspecciones sanitarias aprobadas.
        </p>

        {/* Generación dinámica de código QR */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-border shadow-inner max-w-[200px] mx-auto">
          <QRCodeSVG value={currentUrl} size={160} />
          <span className="mt-2 text-[10px] text-muted-foreground font-mono truncate max-w-full">{codigoPuesto}</span>
        </div>

        <div className="border border-border p-4 rounded-md bg-muted/30 text-left text-xs font-mono space-y-1">
          <div>Puesto: {codigoPuesto}</div>
          <div>Vendedor: Juan Alberto Gómez Rivera</div>
          <div>Estado: <span className="text-emerald-600 font-bold">VIGENTE / SALUBRE</span></div>
          <div>Última inspección: 2026-06-20 (Aprobado)</div>
        </div>
        <a
          href="/"
          className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-8 py-2"
        >
          Ir al Inicio
        </a>
      </div>
    </div>
  )
}

const Dashboard = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Consola de Control</h1>
      <p className="text-muted-foreground">Bienvenido al panel municipal de control sanitario de ceviche de pota.</p>
    </div>
    
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[
        { name: 'Vendedores Registrados', value: '3', change: 'Total activos', color: 'text-primary bg-primary/10' },
        { name: 'Puestos Autorizados', value: '3', change: 'En la vía pública', color: 'text-blue-600 bg-blue-500/10' },
        { name: 'Licencias Vigentes', value: '2', change: '1 vencida', color: 'text-emerald-600 bg-emerald-500/10' },
        { name: 'Inspecciones Realizadas', value: '3', change: 'Este mes', color: 'text-amber-600 bg-amber-500/10' },
      ].map((card) => (
        <div key={card.name} className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{card.name}</span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${card.color}`}>Info</span>
          </div>
          <div className="text-2xl font-bold">{card.value}</div>
          <p className="text-xs text-muted-foreground mt-1">{card.change}</p>
        </div>
      ))}
    </div>
  </div>
)

const PlaceholderView = ({ title }: { title: string }) => (
  <div className="space-y-4">
    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    <div className="rounded-lg border-2 border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
      Módulo en desarrollo. Próximamente se integrará con las tablas de Supabase en el Prompt correspondiente.
    </div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/consulta/:id" element={<PublicConsulta />} />

          {/* Rutas Privadas / Protegidas */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vendedores" element={<Vendors />} />
            <Route path="/puestos" element={<PlaceholderView title="Gestión de Puestos" />} />
            <Route path="/licencias" element={<PlaceholderView title="Gestión de Licencias" />} />
            <Route path="/inspecciones" element={<PlaceholderView title="Gestión de Inspecciones" />} />
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
