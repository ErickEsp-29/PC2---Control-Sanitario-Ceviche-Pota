import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ─── Tipos ─────────────────────────────────────────────────────────────────
interface Puesto {
  id: string
  codigo_unico: string
  ubicacion: string
  tipo_carretilla: string
  estado_sanitario: string
  vendedor_id: string
  vendedores?: { nombres: string; apellidos: string }
}

interface Inspeccion {
  id: string
  puesto_id: string
  usuario_id: string
  fecha_inspeccion: string
  temperatura_pota: number
  verificacion_especie: boolean
  resultado: string
  estado_sanitario: string
  observaciones: string | null
  created_at: string
  puestos?: {
    codigo_unico: string
    ubicacion: string
    vendedores?: { nombres: string; apellidos: string }
  }
  usuarios?: { nombre: string }
}

type ResultadoInspeccion = 'Aprobado' | 'Desaprobado' | 'Observado'
type EstadoSanitario = 'Salubre' | 'No Salubre' | 'En Observacion'

interface FormState {
  puesto_id: string
  temperatura_pota: string
  verificacion_especie: boolean
  resultado: ResultadoInspeccion
  observaciones: string
}

const RESULTADO_OPTIONS: ResultadoInspeccion[] = ['Aprobado', 'Desaprobado', 'Observado']

// Validación de cadena de frío: temperatura entre -2°C y 4°C
const TEMP_MIN = -2
const TEMP_MAX = 4

function getEstadoFromResultado(resultado: ResultadoInspeccion): EstadoSanitario {
  if (resultado === 'Aprobado') return 'Salubre'
  if (resultado === 'Desaprobado') return 'No Salubre'
  return 'En Observacion'
}

function validateForm(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!form.puesto_id) {
    errors.puesto_id = 'Debes seleccionar un puesto.'
  }

  const temp = parseFloat(form.temperatura_pota)
  if (form.temperatura_pota === '' || isNaN(temp)) {
    errors.temperatura_pota = 'La temperatura es obligatoria y debe ser numérica.'
  } else if (temp < -10.0 || temp > 40.0) {
    errors.temperatura_pota = 'La temperatura debe estar en el rango de -10.0°C a 40.0°C.'
  } else if (form.resultado === 'Aprobado' && (temp < TEMP_MIN || temp > TEMP_MAX)) {
    errors.temperatura_pota = `No se puede aprobar la inspección si la temperatura está fuera del rango de cadena de frío (${TEMP_MIN}°C a ${TEMP_MAX}°C).`
  }

  if (form.resultado === 'Aprobado' && !form.verificacion_especie) {
    errors.verificacion_especie = 'No se puede aprobar la inspección si la verificación de la especie (pota) es negativa.'
  }

  if (form.resultado !== 'Aprobado') {
    if (!form.observaciones.trim()) {
      errors.observaciones = 'Las observaciones son obligatorias para resultados observados o desaprobados.'
    } else if (form.observaciones.trim().length < 15) {
      errors.observaciones = 'Las observaciones deben tener al menos 15 caracteres para detallar las fallas.'
    }
  }

  return errors
}

// ─── Componente de Badge ────────────────────────────────────────────────────
function ResultadoBadge({ resultado }: { resultado: string }) {
  const classes: Record<string, string> = {
    Aprobado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Desaprobado: 'bg-red-100 text-red-800 border-red-200',
    Observado: 'bg-amber-100 text-amber-800 border-amber-200',
  }
  const cls = classes[resultado] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {resultado}
    </span>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const classes: Record<string, string> = {
    Salubre: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'No Salubre': 'bg-red-100 text-red-800 border-red-200',
    'En Observacion': 'bg-amber-100 text-amber-800 border-amber-200',
  }
  const cls = classes[estado] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {estado}
    </span>
  )
}

// ─── Componente Principal ──────────────────────────────────────────────────
export function Inspections() {
  const { user } = useAuth()

  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([])
  const [puestos, setPuestos] = useState<Puesto[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedInspeccion, setSelectedInspeccion] = useState<Inspeccion | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterResultado, setFilterResultado] = useState<string>('Todos')

  const [form, setForm] = useState<FormState>({
    puesto_id: '',
    temperatura_pota: '',
    verificacion_especie: false,
    resultado: 'Aprobado',
    observaciones: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // ── Fetch de datos ─────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setGlobalError(null)
    try {
      await Promise.resolve()

      const [{ data: inspeccionesData, error: errI }, { data: puestosData, error: errP }] =
        await Promise.all([
          supabase
            .from('inspecciones')
            .select(`
              *,
              puestos (
                codigo_unico,
                ubicacion,
                vendedores (nombres, apellidos)
              ),
              usuarios (nombre)
            `)
            .order('fecha_inspeccion', { ascending: false }),
          supabase
            .from('puestos')
            .select(`
              *,
              vendedores (nombres, apellidos)
            `)
            .order('codigo_unico'),
        ])

      if (errI) throw new Error(errI.message)
      if (errP) throw new Error(errP.message)

      setInspecciones((inspeccionesData as Inspeccion[]) ?? [])
      setPuestos((puestosData as Puesto[]) ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar datos.'
      setGlobalError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Modal handlers ─────────────────────────────────────────────────────
  const openNewModal = () => {
    setForm({
      puesto_id: '',
      temperatura_pota: '',
      verificacion_especie: false,
      resultado: 'Aprobado',
      observaciones: '',
    })
    setFormErrors({})
    setSelectedInspeccion(null)
    setShowModal(true)
  }

  const openViewModal = (inspeccion: Inspeccion) => {
    setSelectedInspeccion(inspeccion)
    setShowModal(false)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedInspeccion(null)
    setFormErrors({})
  }

  // ── Manejo del formulario ──────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setForm((prev) => ({ ...prev, [target.name]: target.checked }))
    } else {
      setForm((prev) => ({ ...prev, [target.name]: target.value }))
    }
    setFormErrors((prev) => ({ ...prev, [target.name]: '' }))
  }

  // ── Submit: crear inspección ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    if (!user?.id) {
      setGlobalError('No se pudo identificar al inspector. Por favor, recarga la página.')
      return
    }

    setSubmitting(true)
    try {
      const estado_sanitario = getEstadoFromResultado(form.resultado as ResultadoInspeccion)

      const { error } = await supabase.from('inspecciones').insert({
        puesto_id: form.puesto_id,
        usuario_id: user.id,
        temperatura_pota: parseFloat(form.temperatura_pota),
        verificacion_especie: form.verificacion_especie,
        resultado: form.resultado,
        estado_sanitario,
        observaciones: form.observaciones.trim() || null,
      })

      if (error) throw new Error(error.message)

      setSuccessMsg('Inspección registrada correctamente.')
      setTimeout(() => setSuccessMsg(null), 4000)
      closeModal()
      await fetchData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al registrar la inspección.'
      setGlobalError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Filtrado ───────────────────────────────────────────────────────────
  const filtered = inspecciones.filter((ins) => {
    const vendedor = ins.puestos?.vendedores
      ? `${ins.puestos.vendedores.nombres} ${ins.puestos.vendedores.apellidos}`.toLowerCase()
      : ''
    const codigo = ins.puestos?.codigo_unico?.toLowerCase() ?? ''
    const matchSearch =
      vendedor.includes(searchTerm.toLowerCase()) ||
      codigo.includes(searchTerm.toLowerCase())
    const matchFilter = filterResultado === 'Todos' || ins.resultado === filterResultado
    return matchSearch && matchFilter
  })

  // ── Temperatura display helper ─────────────────────────────────────────
  const tempColor = (temp: number) => {
    if (temp >= TEMP_MIN && temp <= TEMP_MAX) return 'text-emerald-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Inspecciones</h1>
          <p className="text-muted-foreground mt-1">
            Registro y seguimiento de inspecciones sanitarias de puestos de ceviche de pota.
          </p>
        </div>
        <button
          id="btn-nueva-inspeccion"
          onClick={openNewModal}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva Inspección
        </button>
      </div>

      {/* Alertas globales */}
      {globalError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Error:</strong> {globalError}
        </div>
      )}
      {successMsg && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ {successMsg}
        </div>
      )}

      {/* Stats rápidas */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total Inspecciones',
            value: inspecciones.length,
            color: 'text-primary bg-primary/10',
          },
          {
            label: 'Aprobadas',
            value: inspecciones.filter((i) => i.resultado === 'Aprobado').length,
            color: 'text-emerald-600 bg-emerald-500/10',
          },
          {
            label: 'Desaprobadas / Observadas',
            value: inspecciones.filter((i) => i.resultado !== 'Aprobado').length,
            color: 'text-red-600 bg-red-500/10',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                #
              </span>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            id="search-inspeccion"
            type="text"
            placeholder="Buscar por vendedor o código de puesto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          id="filter-resultado"
          value={filterResultado}
          onChange={(e) => setFilterResultado(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="Todos">Todos los resultados</option>
          {RESULTADO_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <svg
              className="mr-2 h-5 w-5 animate-spin text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Cargando inspecciones...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            {inspecciones.length === 0
              ? 'No hay inspecciones registradas. ¡Registra la primera!'
              : 'No se encontraron inspecciones con los filtros aplicados.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Puesto / Vendedor
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Temp. Pota
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Verif. Especie
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Resultado
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Estado Sanitario
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Inspector
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ins) => (
                  <tr
                    key={ins.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">
                        {ins.puestos?.codigo_unico ?? '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ins.puestos?.vendedores
                          ? `${ins.puestos.vendedores.nombres} ${ins.puestos.vendedores.apellidos}`
                          : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(ins.fecha_inspeccion).toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={tempColor(ins.temperatura_pota)}>
                        {ins.temperatura_pota}°C
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ins.verificacion_especie ? (
                        <span className="text-emerald-600 font-semibold">✓ Sí</span>
                      ) : (
                        <span className="text-red-500 font-semibold">✗ No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ResultadoBadge resultado={ins.resultado} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <EstadoBadge estado={ins.estado_sanitario} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {ins.usuarios?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openViewModal(ins)}
                        className="rounded px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Nueva Inspección */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Nueva Inspección Sanitaria</h2>
              <button
                onClick={closeModal}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {/* Puesto */}
              <div>
                <label htmlFor="puesto_id" className="block text-sm font-medium mb-1.5">
                  Puesto a Inspeccionar <span className="text-red-500">*</span>
                </label>
                <select
                  id="puesto_id"
                  name="puesto_id"
                  value={form.puesto_id}
                  onChange={handleChange}
                  className={`w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring ${
                    formErrors.puesto_id ? 'border-red-400' : 'border-input'
                  }`}
                >
                  <option value="">— Selecciona un puesto —</option>
                  {puestos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo_unico} — {p.ubicacion}
                      {p.vendedores
                        ? ` (${p.vendedores.nombres} ${p.vendedores.apellidos})`
                        : ''}
                    </option>
                  ))}
                </select>
                {formErrors.puesto_id && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.puesto_id}</p>
                )}
              </div>

              {/* Temperatura */}
              <div>
                <label htmlFor="temperatura_pota" className="block text-sm font-medium mb-1.5">
                  Temperatura de la Pota (°C){' '}
                  <span className="text-muted-foreground text-xs font-normal">
                    — Rango válido: {TEMP_MIN}°C a {TEMP_MAX}°C (cadena de frío)
                  </span>
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  id="temperatura_pota"
                  name="temperatura_pota"
                  type="number"
                  step="0.1"
                  value={form.temperatura_pota}
                  onChange={handleChange}
                  placeholder={`Ej. 2.5 (entre ${TEMP_MIN} y ${TEMP_MAX})`}
                  className={`w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring ${
                    formErrors.temperatura_pota ? 'border-red-400' : 'border-input'
                  }`}
                />
                {formErrors.temperatura_pota && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.temperatura_pota}</p>
                )}
                {form.temperatura_pota !== '' && !formErrors.temperatura_pota && (
                  <p className={`mt-1 text-xs ${
                    parseFloat(form.temperatura_pota) >= TEMP_MIN &&
                    parseFloat(form.temperatura_pota) <= TEMP_MAX
                      ? 'text-emerald-600'
                      : 'text-red-500'
                  }`}>
                    {parseFloat(form.temperatura_pota) >= TEMP_MIN &&
                    parseFloat(form.temperatura_pota) <= TEMP_MAX
                      ? '✓ Temperatura dentro del rango de cadena de frío'
                      : '⚠ Temperatura fuera del rango permitido'}
                  </p>
                )}
              </div>

              {/* Verificación Especie */}
              <div>
                <div className={`flex items-start gap-3 rounded-md border bg-muted/20 p-3 ${
                  formErrors.verificacion_especie ? 'border-red-400' : 'border-border'
                }`}>
                  <input
                    id="verificacion_especie"
                    name="verificacion_especie"
                    type="checkbox"
                    checked={form.verificacion_especie}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <label htmlFor="verificacion_especie" className="text-sm font-medium cursor-pointer">
                      Verificación de Especie Confirmada
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Marcar si se confirmó que el producto es pota auténtica (Dosidicus gigas).
                    </p>
                  </div>
                </div>
                {formErrors.verificacion_especie && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.verificacion_especie}</p>
                )}
              </div>

              {/* Resultado */}
              <div>
                <label htmlFor="resultado" className="block text-sm font-medium mb-1.5">
                  Resultado de la Inspección <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RESULTADO_OPTIONS.map((opt) => {
                    const colorMap: Record<string, string> = {
                      Aprobado: 'border-emerald-400 bg-emerald-50 text-emerald-800',
                      Desaprobado: 'border-red-400 bg-red-50 text-red-800',
                      Observado: 'border-amber-400 bg-amber-50 text-amber-800',
                    }
                    const selected = form.resultado === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, resultado: opt }))}
                        className={`rounded-md border-2 py-2 text-sm font-semibold transition-all ${
                          selected
                            ? colorMap[opt]
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Estado sanitario resultante:{' '}
                  <strong>{getEstadoFromResultado(form.resultado as ResultadoInspeccion)}</strong>
                </p>
              </div>

              {/* Observaciones */}
              <div>
                <label htmlFor="observaciones" className="block text-sm font-medium mb-1.5">
                  Observaciones{' '}
                  <span className="text-muted-foreground text-xs font-normal">
                    {form.resultado !== 'Aprobado' ? '(requerido - mín 15 caracteres)' : '(opcional)'}
                  </span>
                </label>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Detalles adicionales sobre la inspección..."
                  className={`w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring ${
                    formErrors.observaciones ? 'border-red-400' : 'border-input'
                  }`}
                />
                {formErrors.observaciones && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.observaciones}</p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    'Registrar Inspección'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Detalle */}
      {selectedInspeccion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedInspeccion(null) }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold">Detalle de Inspección</h2>
              <button
                onClick={() => setSelectedInspeccion(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoField
                  label="Puesto"
                  value={selectedInspeccion.puestos?.codigo_unico ?? '—'}
                />
                <InfoField
                  label="Vendedor"
                  value={
                    selectedInspeccion.puestos?.vendedores
                      ? `${selectedInspeccion.puestos.vendedores.nombres} ${selectedInspeccion.puestos.vendedores.apellidos}`
                      : '—'
                  }
                />
                <InfoField
                  label="Fecha"
                  value={new Date(selectedInspeccion.fecha_inspeccion).toLocaleDateString(
                    'es-PE',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}
                />
                <InfoField
                  label="Inspector"
                  value={selectedInspeccion.usuarios?.nombre ?? '—'}
                />
                <InfoField
                  label="Temperatura Pota"
                  value={`${selectedInspeccion.temperatura_pota}°C`}
                  valueClass={tempColor(selectedInspeccion.temperatura_pota)}
                />
                <InfoField
                  label="Verif. Especie"
                  value={selectedInspeccion.verificacion_especie ? '✓ Confirmada' : '✗ No confirmada'}
                  valueClass={selectedInspeccion.verificacion_especie ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}
                />
              </div>

              <div className="flex gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Resultado</p>
                  <ResultadoBadge resultado={selectedInspeccion.resultado} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estado Sanitario</p>
                  <EstadoBadge estado={selectedInspeccion.estado_sanitario} />
                </div>
              </div>

              {selectedInspeccion.observaciones && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-sm rounded-md border border-border bg-muted/20 p-3">
                    {selectedInspeccion.observaciones}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  onClick={() => setSelectedInspeccion(null)}
                  className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper Component ─────────────────────────────────────────────────────────
function InfoField({
  label,
  value,
  valueClass = 'text-foreground',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${valueClass}`}>{value}</p>
    </div>
  )
}
