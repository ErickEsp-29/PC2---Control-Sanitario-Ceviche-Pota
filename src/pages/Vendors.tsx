import React, { useEffect, useState } from 'react'
import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database'

type Vendedor = Database['public']['Tables']['vendedores']['Row']

export const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Search and Pagination States
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendedor | null>(null)

  // Form Fields
  const [dni, setDni] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')

  // Form Validation Errors
  const [formErrors, setFormErrors] = useState<{
    dni?: string
    nombres?: string
    apellidos?: string
    telefono?: string
    email?: string
  }>({})

  const fetchVendors = async () => {
    await Promise.resolve()
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('vendedores')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setVendors(data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar los vendedores.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [])

  const validateForm = async (isEdit = false): Promise<boolean> => {
    const errors: typeof formErrors = {}

    // DNI Validation
    if (!isEdit) {
      if (!dni.trim()) {
        errors.dni = 'El DNI es obligatorio.'
      } else if (!/^\d{8}$/.test(dni.trim())) {
        errors.dni = 'El DNI debe tener exactamente 8 dígitos.'
      } else {
        // Check uniqueness in local state or database
        const exists = vendors.some((v) => v.dni === dni.trim())
        if (exists) {
          errors.dni = 'Este DNI ya se encuentra registrado.'
        } else {
          // Double check database
          const { data, error: checkErr } = await supabase
            .from('vendedores')
            .select('id')
            .eq('dni', dni.trim())
            .maybeSingle()

          if (!checkErr && data) {
            errors.dni = 'Este DNI ya se encuentra registrado en el sistema.'
          }
        }
      }
    }

    // Nombres & Apellidos Validation
    if (!nombres.trim()) {
      errors.nombres = 'El nombre es obligatorio.'
    }
    if (!apellidos.trim()) {
      errors.apellidos = 'El apellido es obligatorio.'
    }

    // Telefono Validation
    if (telefono.trim()) {
      if (!/^\d{9}$/.test(telefono.trim())) {
        errors.telefono = 'El celular debe tener exactamente 9 dígitos.'
      }
    }

    // Email Validation
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Formato de correo electrónico inválido.'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const isValid = await validateForm(false)
    if (!isValid) return

    setLoading(true)
    try {
      const { error: insertErr } = await supabase
        .from('vendedores')
        .insert({
          dni: dni.trim(),
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          activo: true
        })

      if (insertErr) throw insertErr

      setSuccess('Vendedor registrado exitosamente.')
      setIsAddOpen(false)
      resetForm()
      fetchVendors()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el vendedor.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditOpen = (vendor: Vendedor) => {
    setSelectedVendor(vendor)
    setNombres(vendor.nombres)
    setApellidos(vendor.apellidos)
    setTelefono(vendor.telefono || '')
    setEmail(vendor.email || '')
    setFormErrors({})
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendor) return
    setError(null)
    setSuccess(null)

    const isValid = await validateForm(true)
    if (!isValid) return

    setLoading(true)
    try {
      const { error: updateErr } = await supabase
        .from('vendedores')
        .update({
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          telefono: telefono.trim() || null,
          email: email.trim() || null
        })
        .eq('id', selectedVendor.id)

      if (updateErr) throw updateErr

      setSuccess('Vendedor actualizado exitosamente.')
      setIsEditOpen(false)
      resetForm()
      fetchVendors()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar el vendedor.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (vendor: Vendedor) => {
    if (!window.confirm(`¿Está seguro de que desea dar de baja al vendedor ${vendor.nombres} ${vendor.apellidos}?`)) {
      return
    }
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error: deleteErr } = await supabase
        .from('vendedores')
        .update({ activo: false })
        .eq('id', vendor.id)

      if (deleteErr) throw deleteErr

      setSuccess('Vendedor dado de baja de forma exitosa.')
      fetchVendors()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al dar de baja al vendedor.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleReactivate = async (vendor: Vendedor) => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error: reactivateErr } = await supabase
        .from('vendedores')
        .update({ activo: true })
        .eq('id', vendor.id)

      if (reactivateErr) throw reactivateErr

      setSuccess('Vendedor reactivado de forma exitosa.')
      fetchVendors()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al reactivar al vendedor.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setDni('')
    setNombres('')
    setApellidos('')
    setTelefono('')
    setEmail('')
    setFormErrors({})
    setSelectedVendor(null)
  }

  // Filtered and Paginated list
  const filteredVendors = vendors.filter((v) => {
    const search = searchTerm.toLowerCase().trim()
    const fullName = `${v.nombres} ${v.apellidos}`.toLowerCase()
    return v.dni.includes(search) || fullName.includes(search)
  })

  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage)
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Padrión de Vendedores</h1>
          <p className="text-muted-foreground text-sm">Administra la base de datos de vendedores ambulantes de ceviche de pota.</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsAddOpen(true)
          }}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Registrar Vendedor
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-md border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 text-sm font-medium animate-fade-in">
          {success}
        </div>
      )}

      {/* Filters & Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <input
            type="text"
            placeholder="Buscar por DNI o nombre completo..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="block w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="p-4">DNI</th>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Celular</th>
                <th className="p-4">Correo</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground animate-pulse">
                    Cargando padrón de vendedores...
                  </td>
                </tr>
              ) : paginatedVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No se encontraron vendedores registrados.
                  </td>
                </tr>
              ) : (
                paginatedVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-mono font-semibold">{vendor.dni}</td>
                    <td className="p-4 font-medium text-foreground">
                      {vendor.nombres} {vendor.apellidos}
                    </td>
                    <td className="p-4 text-muted-foreground">{vendor.telefono || '—'}</td>
                    <td className="p-4 text-muted-foreground">{vendor.email || '—'}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          vendor.activo
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {vendor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleEditOpen(vendor)}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-3 cursor-pointer"
                      >
                        Editar
                      </button>
                      {vendor.activo ? (
                        <button
                          onClick={() => handleDeactivate(vendor)}
                          className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-destructive/20 text-destructive hover:bg-destructive/10 h-7 px-3 cursor-pointer"
                        >
                          Dar de Baja
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(vendor)}
                          className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 h-7 px-3 cursor-pointer"
                        >
                          Activar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => c - 1)}
                className="inline-flex items-center justify-center rounded-md border border-input h-8 px-3 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => c + 1)}
                className="inline-flex items-center justify-center rounded-md border border-input h-8 px-3 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6 relative animate-zoom-in">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold mb-4">Registrar Vendedor</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">DNI (8 dígitos)</label>
                <input
                  type="text"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  className={`block w-full rounded-md border ${
                    formErrors.dni ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
                  } bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2`}
                  placeholder="Ej. 71029384"
                />
                {formErrors.dni && (
                  <p className="mt-1 text-xs text-destructive font-medium">{formErrors.dni}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombres</label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className={`block w-full rounded-md border ${
                      formErrors.nombres ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
                    } bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2`}
                    placeholder="Ej. Juan Alberto"
                  />
                  {formErrors.nombres && (
                    <p className="mt-1 text-xs text-destructive font-medium">{formErrors.nombres}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Apellidos</label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    className={`block w-full rounded-md border ${
                      formErrors.apellidos ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
                    } bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2`}
                    placeholder="Ej. Gómez Rivera"
                  />
                  {formErrors.apellidos && (
                    <p className="mt-1 text-xs text-destructive font-medium">{formErrors.apellidos}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Celular (9 dígitos, Opcional)</label>
                <input
                  type="text"
                  maxLength={9}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                  className={`block w-full rounded-md border ${
                    formErrors.telefono ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
                  } bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2`}
                  placeholder="Ej. 987654321"
                />
                {formErrors.telefono && (
                  <p className="mt-1 text-xs text-destructive font-medium">{formErrors.telefono}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full rounded-md border ${
                    formErrors.email ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
                  } bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2`}
                  placeholder="Ej. juan.gomez@gmail.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-destructive font-medium">{formErrors.email}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6 relative animate-zoom-in">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold mb-4">Editar Datos de Vendedor</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium mb-1">DNI (No editable)</label>
                <input
                  type="text"
                  disabled
                  value={selectedVendor.dni}
                  className="block w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombres</label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className={`block w-full rounded-md border ${
                      formErrors.nombres ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
                    } bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2`}
                  />
                  {formErrors.nombres && (
                    <p className="mt-1 text-xs text-destructive font-medium">{formErrors.nombres}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Apellidos</label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    className={`block w-full rounded-md border ${
                      formErrors.apellidos ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
                    } bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2`}
                  />
                  {formErrors.apellidos && (
                    <p className="mt-1 text-xs text-destructive font-medium">{formErrors.apellidos}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Celular (9 dígitos, Opcional)</label>
                <input
                  type="text"
                  maxLength={9}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                  className={`block w-full rounded-md border ${
                    formErrors.telefono ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
                  } bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2`}
                />
                {formErrors.telefono && (
                  <p className="mt-1 text-xs text-destructive font-medium">{formErrors.telefono}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full rounded-md border ${
                    formErrors.email ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'
                  } bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2`}
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-destructive font-medium">{formErrors.email}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
