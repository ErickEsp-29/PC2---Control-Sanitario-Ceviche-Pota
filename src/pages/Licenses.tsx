import React, { useEffect, useState } from 'react'
import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database'

type Licencia = Database['public']['Tables']['licencias']['Row']
type Puesto = Database['public']['Tables']['puestos']['Row']

interface PuestoConVendedor extends Puesto {
  vendedores?: {
    nombres: string
    apellidos: string
  } | null
}

interface LicenciaConDetalles extends Licencia {
  puestos?: PuestoConVendedor | null
}

export const Licenses: React.FC = () => {
  const [licenses, setLicenses] = useState<LicenciaConDetalles[]>([])
  const [stands, setStands] = useState<PuestoConVendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Search and Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState<LicenciaConDetalles | null>(null)

  // Form Fields
  const [numeroLicencia, setNumeroLicencia] = useState('')
  const [puestoId, setPuestoId] = useState('')
  const [fechaEmision, setFechaEmision] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [estado, setEstado] = useState('Vigente')

  // Form Validation Errors
  const [formErrors, setFormErrors] = useState<{
    numeroLicencia?: string
    puestoId?: string
    fechaEmision?: string
    fechaVencimiento?: string
  }>({})

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch licenses with stand and vendor details
      const { data: licensesData, error: licensesErr } = await supabase
        .from('licencias')
        .select(`
          *,
          puestos:puesto_id (
            *,
            vendedores:vendedor_id (
              nombres,
              apellidos
            )
          )
        `)
        .order('numero_licencia', { ascending: true })

      if (licensesErr) throw licensesErr

      // 2. Fetch stands with vendor details for dropdown selection
      const { data: standsData, error: standsErr } = await supabase
        .from('puestos')
        .select(`
          *,
          vendedores:vendedor_id (
            nombres,
            apellidos
          )
        `)
        .order('codigo_unico', { ascending: true })

      if (standsErr) throw standsErr

      setLicenses(licensesData as LicenciaConDetalles[] || [])
      setStands(standsData as PuestoConVendedor[] || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar las licencias.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetForm = () => {
    setNumeroLicencia('')
    setPuestoId('')
    setFechaEmision('')
    setFechaVencimiento('')
    setEstado('Vigente')
    setFormErrors({})
  }

  const validateForm = async (isEdit = false): Promise<boolean> => {
    const errors: typeof formErrors = {}

    // Numero Licencia Validation
    if (!isEdit) {
      if (!numeroLicencia.trim()) {
        errors.numeroLicencia = 'El número de licencia es obligatorio.'
      } else if (!/^LIC-\d{4}-\d{4}$/.test(numeroLicencia.trim().toUpperCase())) {
        errors.numeroLicencia = 'El formato de licencia debe ser LIC-YYYY-XXXX (ej: LIC-2026-0001).'
      } else {
        const licExists = licenses.some(
          (l) => l.numero_licencia.toUpperCase() === numeroLicencia.trim().toUpperCase()
        )
        if (licExists) {
          errors.numeroLicencia = 'Este número de licencia ya se encuentra registrado.'
        } else {
          // DB check
          const { data, error: checkErr } = await supabase
            .from('licencias')
            .select('id')
            .eq('numero_licencia', numeroLicencia.trim().toUpperCase())
            .maybeSingle()

          if (!checkErr && data) {
            errors.numeroLicencia = 'Este número de licencia ya existe en la base de datos.'
          }
        }
      }
    }

    if (!puestoId) {
      errors.puestoId = 'Debe seleccionar un puesto asociado.'
    }

    if (!fechaEmision) {
      errors.fechaEmision = 'La fecha de emisión es obligatoria.'
    } else {
      const year = new Date(fechaEmision).getFullYear()
      if (year < 2000 || year > 2100) {
        errors.fechaEmision = 'La fecha de emisión debe estar entre el año 2000 y 2100.'
      }
    }

    if (!fechaVencimiento) {
      errors.fechaVencimiento = 'La fecha de vencimiento es obligatoria.'
    } else {
      const year = new Date(fechaVencimiento).getFullYear()
      if (year < 2000 || year > 2100) {
        errors.fechaVencimiento = 'La fecha de vencimiento debe estar entre el año 2000 y 2100.'
      } else if (fechaEmision && new Date(fechaVencimiento) < new Date(fechaEmision)) {
        errors.fechaVencimiento = 'La fecha de vencimiento no puede ser menor a la de emisión.'
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
        .from('licencias')
        .insert({
          puesto_id: puestoId,
          numero_licencia: numeroLicencia.trim().toUpperCase(),
          fecha_emision: fechaEmision,
          fecha_vencimiento: fechaVencimiento,
          estado: estado
        })

      if (insertErr) throw insertErr

      setSuccess('Licencia registrada exitosamente.')
      setIsAddOpen(false)
      resetForm()
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar la licencia.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditOpen = (lic: LicenciaConDetalles) => {
    setSelectedLicense(lic)
    setNumeroLicencia(lic.numero_licencia)
    setPuestoId(lic.puesto_id)
    setFechaEmision(lic.fecha_emision)
    setFechaVencimiento(lic.fecha_vencimiento)
    setEstado(lic.estado)
    setFormErrors({})
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLicense) return

    setError(null)
    setSuccess(null)

    const isValid = await validateForm(true)
    if (!isValid) return

    setLoading(true)
    try {
      const { error: updateErr } = await supabase
        .from('licencias')
        .update({
          puesto_id: puestoId,
          fecha_emision: fechaEmision,
          fecha_vencimiento: fechaVencimiento,
          estado: estado
        })
        .eq('id', selectedLicense.id)

      if (updateErr) throw updateErr

      setSuccess('Licencia actualizada exitosamente.')
      setIsEditOpen(false)
      resetForm()
      setSelectedLicense(null)
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la licencia.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta licencia municipal?')) return

    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error: deleteErr } = await supabase
        .from('licencias')
        .delete()
        .eq('id', id)

      if (deleteErr) throw deleteErr

      setSuccess('Licencia eliminada exitosamente.')
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la licencia.'
      setError(message)
      setLoading(false)
    }
  }

  // Filtered licenses
  const filteredLicenses = licenses.filter((l) => {
    const searchLower = searchTerm.toLowerCase()
    const standCode = l.puestos?.codigo_unico?.toLowerCase() || ''
    const vendorName = l.puestos?.vendedores ? `${l.puestos.vendedores.nombres} ${l.puestos.vendedores.apellidos}`.toLowerCase() : ''
    return (
      l.numero_licencia.toLowerCase().includes(searchLower) ||
      standCode.includes(searchLower) ||
      vendorName.includes(searchLower) ||
      l.estado.toLowerCase().includes(searchLower)
    );
  })

  // Pagination
  const totalPages = Math.ceil(filteredLicenses.length / itemsPerPage)
  const paginatedLicenses = filteredLicenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Vigente':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      case 'Vencida':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'Suspendida':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Licencias</h1>
          <p className="text-muted-foreground text-sm">Administra las autorizaciones municipales vigentes, suspendidas y vencidas.</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsAddOpen(true)
          }}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow cursor-pointer"
        >
          Registrar Licencia
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
          {success}
        </div>
      )}

      {/* Barra de Búsqueda */}
      <div className="flex items-center bg-card border border-border rounded-md px-3 py-2 max-w-md">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-muted-foreground mr-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por licencia, código de puesto o vendedor..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          className="bg-transparent border-0 outline-none text-sm w-full p-0 focus:ring-0 focus:outline-none placeholder:text-muted-foreground text-foreground"
        />
      </div>

      {/* Tabla */}
      {loading && licenses.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <span className="text-muted-foreground text-sm">Cargando licencias municipales...</span>
        </div>
      ) : filteredLicenses.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground text-sm">
          No se encontraron licencias registradas.
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="p-4">Nº Licencia</th>
                  <th className="p-4">Puesto</th>
                  <th className="p-4">Vendedor</th>
                  <th className="p-4">Emisión</th>
                  <th className="p-4">Vencimiento</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedLicenses.map((lic) => (
                  <tr key={lic.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-foreground">{lic.numero_licencia}</td>
                    <td className="p-4">
                      {lic.puestos ? (
                        <span className="font-mono text-xs font-semibold text-primary">{lic.puestos.codigo_unico}</span>
                      ) : (
                        <span className="text-red-500 text-xs">Sin Puesto</span>
                      )}
                    </td>
                    <td className="p-4">
                      {lic.puestos?.vendedores ? (
                        <span className="text-muted-foreground">{lic.puestos.vendedores.nombres} {lic.puestos.vendedores.apellidos}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No especificado</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{lic.fecha_emision}</td>
                    <td className="p-4 text-muted-foreground">{lic.fecha_vencimiento}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(lic.estado)}`}>
                        {lic.estado}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleEditOpen(lic)}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(lic.id)}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-red-200 bg-red-500/5 text-red-600 hover:bg-red-500/10 h-8 px-3 cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Página {currentPage} de {totalPages} ({filteredLicenses.length} licencias)
              </span>
              <div className="flex space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  Anterior
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: REGISTRAR LICENCIA */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="text-xl font-bold tracking-tight">Registrar Nueva Licencia</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Número de Licencia (LIC-YYYY-XXXX)</label>
                <input
                  type="text"
                  placeholder="Ej: LIC-2026-0004"
                  value={numeroLicencia}
                  onChange={(e) => setNumeroLicencia(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {formErrors.numeroLicencia && <p className="text-red-500 text-xs mt-1">{formErrors.numeroLicencia}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Puesto Vinculado</label>
                <select
                  value={puestoId}
                  onChange={(e) => setPuestoId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seleccione un puesto de venta...</option>
                  {stands.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.codigo_unico} - {s.ubicacion} ({s.vendedores ? `${s.vendedores.nombres} ${s.vendedores.apellidos}` : 'Sin vendedor'})
                    </option>
                  ))}
                </select>
                {formErrors.puestoId && <p className="text-red-500 text-xs mt-1">{formErrors.puestoId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {formErrors.fechaEmision && <p className="text-red-500 text-xs mt-1">{formErrors.fechaEmision}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha Vencimiento</label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {formErrors.fechaVencimiento && <p className="text-red-500 text-xs mt-1">{formErrors.fechaVencimiento}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Vigente">Vigente</option>
                  <option value="Vencida">Vencida</option>
                  <option value="Suspendida">Suspendida</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Licencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR LICENCIA */}
      {isEditOpen && selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="text-xl font-bold tracking-tight">Editar Licencia: {selectedLicense.numero_licencia}</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Número de Licencia (No modificable)</label>
                <input
                  type="text"
                  value={numeroLicencia}
                  disabled
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Puesto Vinculado</label>
                <select
                  value={puestoId}
                  onChange={(e) => setPuestoId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seleccione un puesto de venta...</option>
                  {stands.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.codigo_unico} - {s.ubicacion} ({s.vendedores ? `${s.vendedores.nombres} ${s.vendedores.apellidos}` : 'Sin vendedor'})
                    </option>
                  ))}
                </select>
                {formErrors.puestoId && <p className="text-red-500 text-xs mt-1">{formErrors.puestoId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {formErrors.fechaEmision && <p className="text-red-500 text-xs mt-1">{formErrors.fechaEmision}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha Vencimiento</label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {formErrors.fechaVencimiento && <p className="text-red-500 text-xs mt-1">{formErrors.fechaVencimiento}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Vigente">Vigente</option>
                  <option value="Vencida">Vencida</option>
                  <option value="Suspendida">Suspendida</option>
                </select>
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Actualizar Licencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
