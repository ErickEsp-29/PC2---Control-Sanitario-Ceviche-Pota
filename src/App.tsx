import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <header className="border-b border-border bg-card/50 backdrop-blur px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-primary">
              PC2 - Control Sanitario Ceviche Pota
            </span>
          </div>
          <nav className="flex space-x-4">
            <a href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Iniciar Sesión
            </a>
          </nav>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
              Proyecto Inicializado Correctamente (PC2CP-9)
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
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 py-2 shadow"
              >
                Acceso Personal Municipal
              </a>
              <a
                href="/consulta/ejemplo"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-8 py-2"
              >
                Consulta Ciudadana (Demo QR)
              </a>
            </div>
          </div>
        </main>

        <footer className="border-t border-border bg-card/30 py-4 text-center text-sm text-muted-foreground">
          &copy; 2026 PC2CP - Control Sanitario Ceviche Pota. Todos los derechos reservados.
        </footer>
      </div>

      <Routes>
        {/* Placeholder Routes */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={null} />
        <Route path="/login" element={null} />
        <Route path="/dashboard" element={null} />
        <Route path="/consulta/:id" element={null} />
      </Routes>
    </Router>
  )
}

export default App
