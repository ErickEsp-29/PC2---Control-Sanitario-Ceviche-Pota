import React, { useEffect, useState } from 'react'
import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database'
import { QRCodeSVG } from 'qrcode.react'

type Puesto = Database['public']['Tables']['puestos']['Row']
type Vendedor = Database['public']['Tables']['vendedores']['Row']

interface PuestoConDetalles extends Puesto {
  vendedores?: {
    nombres: string
    apellidos: string
    dni: string
  } | null
}

export const Stands: React.FC = () => {
  const [stands, setStands] = useState<PuestoConDetalles[]>([])
  const [vendors, setVendors] = useState<Vendedor[]>([])
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
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [selectedStand, setSelectedStand] = useState<PuestoConDetalles | null>(null)

  // Form Fields
  const [codigoUnico, setCodigoUnico] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [tipoCarretilla, setTipoCarretilla] = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const [estadoSanitario, setEstadoSanitario] = useState('Sin Inspección')

  // Form Validation Errors
  const [formErrors, setFormErrors] = useState<{
    codigoUnico?: string
    ubicacion?: string
    tipoCarretilla?: string
    vendedorId?: string
  }>({})

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch stands with vendor details
      const { data: standsData, error: standsErr } = await supabase
        .from('puestos')
        .select(`
          *,
          vendedores:vendedor_id (
            nombres,
            apellidos,
            dni
          )
        `)
        .order('codigo_unico', { ascending: true })

      if (standsErr) throw standsErr

      // 2. Fetch active vendors for dropdown selection
      const { data: vendorsData, error: vendorsErr } = await supabase
        .from('vendedores')
        .select('*')
        .eq('activo', true)
        .order('apellidos', { ascending: true })

      if (vendorsErr) throw vendorsErr

      setStands(standsData as PuestoConDetalles[] || [])
      setVendors(vendorsData || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar los puestos.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetForm = () => {
    setCodigoUnico('')
    setUbicacion('')
    setTipoCarretilla('')
    setVendedorId('')
    setEstadoSanitario('Sin Inspección')
    setFormErrors({})
  }

  const validateForm = async (isEdit = false): Promise<boolean> => {
    const errors: typeof formErrors = {}

    // Codigo Unico Validation
    if (!isEdit) {
      if (!codigoUnico.trim()) {
        errors.codigoUnico = 'El código del puesto es obligatorio.'
      } else if (!/^PST-\d{3,4}$/.test(codigoUnico.trim().toUpperCase())) {
        errors.codigoUnico = 'El código debe tener el formato PST-001.'
      } else {
        const codeExists = stands.some(
          (s) => s.codigo_unico.toUpperCase() === codigoUnico.trim().toUpperCase()
        )
        if (codeExists) {
          errors.codigoUnico = 'Este código de puesto ya se encuentra registrado.'
        } else {
          // Double check DB
          const { data, error: checkErr } = await supabase
            .from('puestos')
            .select('id')
            .eq('codigo_unico', codigoUnico.trim().toUpperCase())
            .maybeSingle()

          if (!checkErr && data) {
            errors.codigoUnico = 'Este código ya existe en la base de datos.'
          }
        }
      }
    }

    if (!ubicacion.trim()) {
      errors.ubicacion = 'La ubicación es obligatoria.'
    }

    if (!tipoCarretilla.trim()) {
      errors.tipoCarretilla = 'El tipo de carretilla es obligatorio.'
    }

    if (!vendedorId) {
      errors.vendedorId = 'Debe asignar un vendedor al puesto.'
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
        .from('puestos')
        .insert({
          codigo_unico: codigoUnico.trim().toUpperCase(),
          ubicacion: ubicacion.trim(),
          tipo_carretilla: tipoCarretilla.trim(),
          vendedor_id: vendedorId,
          estado_sanitario: estadoSanitario
        })

      if (insertErr) throw insertErr

      setSuccess('Puesto registrado exitosamente.')
      setIsAddOpen(false)
      resetForm()
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el puesto.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditOpen = (stand: PuestoConDetalles) => {
    setSelectedStand(stand)
    setCodigoUnico(stand.codigo_unico)
    setUbicacion(stand.ubicacion)
    setTipoCarretilla(stand.tipo_carretilla)
    setVendedorId(stand.vendedor_id)
    setEstadoSanitario(stand.estado_sanitario)
    setFormErrors({})
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStand) return

    setError(null)
    setSuccess(null)

    const isValid = await validateForm(true)
    if (!isValid) return

    setLoading(true)
    try {
      const { error: updateErr } = await supabase
        .from('puestos')
        .update({
          ubicacion: ubicacion.trim(),
          tipo_carretilla: tipoCarretilla.trim(),
          vendedor_id: vendedorId,
          estado_sanitario: estadoSanitario
        })
        .eq('id', selectedStand.id)

      if (updateErr) throw updateErr

      setSuccess('Puesto actualizado exitosamente.')
      setIsEditOpen(false)
      resetForm()
      setSelectedStand(null)
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar el puesto.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este puesto? Se eliminarán también las licencias asociadas.')) return

    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error: deleteErr } = await supabase
        .from('puestos')
        .delete()
        .eq('id', id)

      if (deleteErr) throw deleteErr

      setSuccess('Puesto eliminado exitosamente.')
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar el puesto.'
      setError(message)
      setLoading(false)
    }
  }

  const handleQrOpen = (stand: PuestoConDetalles) => {
    setSelectedStand(stand)
    setIsQrOpen(true)
  }

  // Filtered stands
  const filteredStands = stands.filter((s) => {
    const searchLower = searchTerm.toLowerCase()
    const vendorName = s.vendedores ? `${s.vendedores.nombres} ${s.vendedores.apellidos}`.toLowerCase() : ''
    return (
      s.codigo_unico.toLowerCase().includes(searchLower) ||
      s.ubicacion.toLowerCase().includes(searchLower) ||
      s.tipo_carretilla.toLowerCase().includes(searchLower) ||
      vendorName.includes(searchLower)
    );
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredStands.length / itemsPerPage)
  const paginatedStands = filteredStands.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getSanitaryBadgeClass = (status: string) => {
    switch (status) {
      case 'Salubre':
      case 'Aprobado':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      case 'Observado':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      case 'Insalubre':
      case 'Clausurado':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Puestos</h1>
          <p className="text-muted-foreground text-sm">Administra las carretillas, módulos sanitarios y su vendedor asignado.</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsAddOpen(true)
          }}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow cursor-pointer"
        >
          Agregar Puesto
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
          placeholder="Buscar por código, ubicación o vendedor..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          className="bg-transparent border-0 outline-none text-sm w-full p-0 focus:ring-0 focus:outline-none placeholder:text-muted-foreground text-foreground"
        />
      </div>

      {/* Tabla */}
      {loading && stands.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <span className="text-muted-foreground text-sm">Cargando puestos de venta...</span>
        </div>
      ) : filteredStands.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground text-sm">
          No se encontraron puestos de venta registrados.
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="p-4">Código</th>
                  <th className="p-4">Vendedor Asignado</th>
                  <th className="p-4">Ubicación</th>
                  <th className="p-4">Tipo de Carretilla</th>
                  <th className="p-4">Estado Sanitario</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedStands.map((stand) => (
                  <tr key={stand.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-foreground">{stand.codigo_unico}</td>
                    <td className="p-4">
                      {stand.vendedores ? (
                        <div>
                          <p className="font-medium text-foreground">{stand.vendedores.nombres} {stand.vendedores.apellidos}</p>
                          <p className="text-xs text-muted-foreground font-mono">DNI: {stand.vendedores.dni}</p>
                        </div>
                      ) : (
                        <span className="text-red-500 text-xs">Sin Vendedor</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate">{stand.ubicacion}</td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate">{stand.tipo_carretilla}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getSanitaryBadgeClass(stand.estado_sanitario)}`}>
                        {stand.estado_sanitario}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleQrOpen(stand)}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer"
                        title="Ver Código QR"
                      >
                        Código QR
                      </button>
                      <button
                        onClick={() => handleEditOpen(stand)}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(stand.id)}
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
                Página {currentPage} de {totalPages} ({filteredStands.length} puestos)
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

      {/* MODAL: REGISTRAR PUESTO */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="text-xl font-bold tracking-tight">Agregar Nuevo Puesto</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Código Único (PST-XXX)</label>
                <input
                  type="text"
                  placeholder="Ej: PST-004"
                  value={codigoUnico}
                  onChange={(e) => setCodigoUnico(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {formErrors.codigoUnico && <p className="text-red-500 text-xs mt-1">{formErrors.codigoUnico}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Ubicación Geográfica</label>
                <input
                  type="text"
                  placeholder="Ej: Calle Lima 123, Miraflores"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {formErrors.ubicacion && <p className="text-red-500 text-xs mt-1">{formErrors.ubicacion}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tipo de Carretilla</label>
                <input
                  type="text"
                  placeholder="Ej: Carretilla Metálica con Termo"
                  value={tipoCarretilla}
                  onChange={(e) => setTipoCarretilla(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {formErrors.tipoCarretilla && <p className="text-red-500 text-xs mt-1">{formErrors.tipoCarretilla}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Vendedor Asignado</label>
                <select
                  value={vendedorId}
                  onChange={(e) => setVendedorId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seleccione un vendedor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.apellidos}, {v.nombres} (DNI: {v.dni})
                    </option>
                  ))}
                </select>
                {formErrors.vendedorId && <p className="text-red-500 text-xs mt-1">{formErrors.vendedorId}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado Sanitario Inicial</label>
                <select
                  value={estadoSanitario}
                  onChange={(e) => setEstadoSanitario(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Sin Inspección">Sin Inspección</option>
                  <option value="Aprobado">Aprobado / Salubre</option>
                  <option value="Observado">Observado</option>
                  <option value="Clausurado">Clausurado / Insalubre</option>
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
                  {loading ? 'Guardando...' : 'Guardar Puesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PUESTO */}
      {isEditOpen && selectedStand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="text-xl font-bold tracking-tight">Editar Puesto: {selectedStand.codigo_unico}</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Código Único (No modificable)</label>
                <input
                  type="text"
                  value={codigoUnico}
                  disabled
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Ubicación Geográfica</label>
                <input
                  type="text"
                  placeholder="Ej: Calle Lima 123, Miraflores"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {formErrors.ubicacion && <p className="text-red-500 text-xs mt-1">{formErrors.ubicacion}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tipo de Carretilla</label>
                <input
                  type="text"
                  placeholder="Ej: Carretilla Metálica con Termo"
                  value={tipoCarretilla}
                  onChange={(e) => setTipoCarretilla(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {formErrors.tipoCarretilla && <p className="text-red-500 text-xs mt-1">{formErrors.tipoCarretilla}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Vendedor Asignado</label>
                <select
                  value={vendedorId}
                  onChange={(e) => setVendedorId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seleccione un vendedor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.apellidos}, {v.nombres} (DNI: {v.dni})
                    </option>
                  ))}
                </select>
                {formErrors.vendedorId && <p className="text-red-500 text-xs mt-1">{formErrors.vendedorId}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado Sanitario</label>
                <select
                  value={estadoSanitario}
                  onChange={(e) => setEstadoSanitario(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Sin Inspección">Sin Inspección</option>
                  <option value="Aprobado">Aprobado / Salubre</option>
                  <option value="Observado">Observado</option>
                  <option value="Clausurado">Clausurado / Insalubre</option>
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
                  {loading ? 'Guardando...' : 'Actualizar Puesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE VISTA */}
      {isQrOpen && selectedStand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-sm w-full overflow-hidden text-center">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="text-lg font-bold tracking-tight">Código QR Sanitario</h2>
              <button onClick={() => setIsQrOpen(false)} className="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                Identificación de Puesto
              </div>
              <h3 className="text-2xl font-bold font-mono">{selectedStand.codigo_unico}</h3>
              
              <div className="flex justify-center p-4 bg-white rounded-lg border border-border shadow-inner max-w-[200px] mx-auto">
                <QRCodeSVG
                  value={`${window.location.origin}/consulta/${selectedStand.codigo_unico}`}
                  size={160}
                />
              </div>

              <div className="text-left text-xs space-y-2 border border-border p-4 rounded-md bg-muted/30 font-mono">
                <p><span className="text-muted-foreground">Ubicación:</span> {selectedStand.ubicacion}</p>
                <p><span className="text-muted-foreground">Vendedor:</span> {selectedStand.vendedores ? `${selectedStand.vendedores.nombres} ${selectedStand.vendedores.apellidos}` : 'No asignado'}</p>
                <p>
                  <span className="text-muted-foreground">Estado:</span>{' '}
                  <span className={`font-bold ${
                    selectedStand.estado_sanitario === 'Aprobado' || selectedStand.estado_sanitario === 'Salubre' ? 'text-emerald-600' :
                    selectedStand.estado_sanitario === 'Observado' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {selectedStand.estado_sanitario.toUpperCase()}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setIsQrOpen(false)}
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
