// ══════════════════════════════════════════════════════
// src/types/index.ts
// ══════════════════════════════════════════════════════

// ── Auth ─────────────────────────────────────────────
export interface LoginFormValues {
  username: string;
  password: string;
  mfaCode?: string;
}

export interface RecoveryFormValues {
  email: string;
}

export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
}

export type AuthStep = "credentials" | "mfa" | "success";

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  created_at: string;
}

export interface MfaSetupData {
  otpauthUrl: string;
  secret: string;
}

// ── Dominio ───────────────────────────────────────────
export type Rol = "admin" | "proveedor";
export type EstadoPersonal = "pendiente" | "aprobado" | "rechazado" | "inactivo";
export type TipoDocumento = "cedula" | "licencia" | "arl" | "soat" | "tecnicomecanica";
export type EstadoProveedor = "activo" | "inactivo" | "suspendido";
export type EstadoEvaluacion = "borrador" | "finalizado";
export type EstadoGrupo = "pendiente" | "revision" | "completado";

// ── Catálogos F-P-ECC-001-05 ─────────────────────────
export const ACTIVIDADES_CONTRATISTA = [
  "Asesoría Administrativa",
  "Asesoría Legal",
  "Asesoría Operativa",
  "Bioestimulación Terrestre",
  "Comercial",
  "Control Químico",
  "Corte y Siembra",
  "Descarga de materiales (materia prima y/o insumos)",
  "Labores de Ganadería",
  "Labores de Mantenimiento",
  "Labores Manuales",
  "Labores Mecanizadas",
  "Labores Metalmecánico",
  "Labores Obra Civil",
  "Labores Propias del Cargo (Empleado)",
  "Muestreo de Suelos",
  "Reparación Mecánica",
  "Seguridad Física",
  "Servicio de Topografía",
  "Servicios Eléctricos",
  "Transporte de Combustible",
  "Transporte de Mercancías Peligrosas",
  "Transporte de Semilla",
  "Transporte material, sedimentos, tierra",
  "Visita al Poliducto",
  "Visita Empresarial",
] as const;

export type ActividadContratista = (typeof ACTIVIDADES_CONTRATISTA)[number];

// ── Catálogos F-P-ECC-001-01 ─────────────────────────
export const CARGOS_CONTRATISTA = [
  "Agrónomo", "Analista de Operaciones", "Aplicador/Fumigador",
  "Auxiliar Administrativa", "Auxiliar Contable", "Auxiliar de Campo",
  "Auxiliar de Mantenimiento", "Auxiliar de Maquinaria", "Auxiliar de Soldador",
  "Auxiliar de Topografía", "Auxiliar Eléctrico", "Auxiliar Gestión Humana",
  "Auxiliar Mecánico", "Auxiliar Metalmecánico", "Auxiliar Oficios Varios",
  "Auxiliar SST", "Conductor de Autobús", "Conductor de Camión",
  "Conductor de Camioneta", "Conductor de Tractomula", "Conductor de Volqueta",
  "Contador", "Cortero de Caña", "Cotero", "Eléctrico", "Gerente",
  "Gerente Operativo", "Jefe Administrativo", "Jefe de Campo",
  "Jefe de Maquinaria", "Jefe de SST", "Jefe de Taller", "Mecánico",
  "Mensajero", "Oficios Varios de Campo/Labores Manuales",
  "Oficios Varios/ Obras Civiles", "Operador de Bulldozer",
  "Operador de Excavadora", "Operador de Motoniveladora",
  "Operador de Retroexcavadora", "Operador de Tractor", "Operador del Volqueta",
  "Pastoreador", "Piloto de Drone", "Practicante", "Representante Legal",
  "Secretaria", "Soldador", "Supervisor", "Supervisor de Campo",
  "Supervisor de Cosecha", "Tapador", "Topógrafo", "Tornero", "Vigía",
] as const;

export const EPS_OPTIONS = [
  "Nueva EPS", "EPS Sura", "EPS Sanitas", "Salud Total", "Coosalud",
  "Famisanar", "Comfenalco Valle", "Cajacopi", "Mutual Ser", "SOS",
  "Comfaoriente", "Salud Mia", "Aliansalud EPS", "Mallamas EPSI", "Pijaos",
  "Medimas", "Asmet", "Capital Salud", "Compensar", "AIC",
] as const;

export const ARL_OPTIONS = [
  "Sura", "Positiva", "Axa Colpatria", "Colmena", "La Equidad", "Bolívar",
] as const;

export const AFP_OPTIONS = [
  "Protección", "Porvenir", "Colfondos", "Skandia", "Fidudavivienda",
  "Fidualianza", "Fidupopular", "Fondo Platino", "Fiduciaria BTG",
  "Protección smurfit", "Servitrust", "Credicorp", "Multiacción",
  "Fondo Voluntario Renta", "Colpensiones",
] as const;

// ── Catálogos F-P-ECC-001-02 ─────────────────────────
export const CATEGORIAS_LICENCIA = ["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3"] as const;
export type CategoriaLicencia = (typeof CATEGORIAS_LICENCIA)[number];

export interface VehiculoSoporte {
  soportes: string[];
  licencia: string;
  categoria: string;
}

export const VEHICULOS_SOPORTES: Record<string, VehiculoSoporte> = {
  "Bulldozer": {
    soportes: ["Certificado de Operador", "Tarjeta de Propiedad", "Licencia", "SOAT", "Manifiesto de Aduana"],
    licencia: "B2", categoria: "B3",
  },
  "Bus Servicio Particular": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "B2", categoria: "B2",
  },
  "Bus Servicio Público": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "C2", categoria: "",
  },
  "Camabaja Servicio Público": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "C3", categoria: "",
  },
  "Camión Servicio Particular": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "B2", categoria: "B3",
  },
  "Camión Servicio Público": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "C2", categoria: "",
  },
  "Camioneta Servicio Particular": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "B1", categoria: "B2",
  },
  "Camioneta Servicio Público": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "C1", categoria: "",
  },
  "Carro Servicio Particular": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "B1", categoria: "B1",
  },
  "Carro Servicio Público": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "C1", categoria: "",
  },
  "Montacarga Eléctrico": {
    soportes: ["Certificado de Operador", "Tarjeta de Propiedad", "SOAT", "Manifiesto de Aduana"],
    licencia: "B1", categoria: "B2",
  },
  "Montacarga de Combustión": {
    soportes: ["Certificado de Operador", "Tarjeta de Propiedad", "SOAT", "Manifiesto de Aduana"],
    licencia: "B1", categoria: "B2",
  },
  "Moto": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "A1 o A2", categoria: "A1 O A2",
  },
  "Motoniveladora": {
    soportes: ["Certificado de Operador", "Tarjeta de Propiedad", "Licencia", "SOAT", "Manifiesto de Aduana"],
    licencia: "B2", categoria: "B3",
  },
  "Retroexcavadora": {
    soportes: ["Certificado de Operador", "Tarjeta de Propiedad", "Licencia", "SOAT", "Manifiesto de Aduana"],
    licencia: "B2", categoria: "B3",
  },
  "Tractor": {
    soportes: ["Certificado Tractorista", "Tarjeta de Propiedad", "Licencia", "SOAT", "Manifiesto de Aduana"],
    licencia: "B3", categoria: "B3",
  },
  "Volqueta Servicio Particular": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "B2", categoria: "B2",
  },
  "Volqueta Servicio Público": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "C2", categoria: "",
  },
  "Grúa Servicio Particular": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "B3", categoria: "B3",
  },
  "Grúa Servicio Público": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "C3", categoria: "",
  },
  // Retrocompatibilidad con registros anteriores
  "Camioneta": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "B1", categoria: "B2",
  },
  "Bus": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "B2", categoria: "B2",
  },
  "Transporte amarillo": {
    soportes: ["Tarjeta de Propiedad", "Licencia", "SOAT", "Tecnomecánica"],
    licencia: "C1", categoria: "",
  },
};

export const TIPOS_VEHICULO = Object.keys(VEHICULOS_SOPORTES);

// ── Interfaces de dominio ─────────────────────────────
export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  mfa_enabled: boolean;
  rol: Rol;
  proveedor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  nit: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  representante: string | null;
  estado: EstadoProveedor;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentoPersonal {
  id: string;
  personal_id: string;
  tipo: TipoDocumento;
  url: string;
  nombre_archivo: string | null;
  fecha_inicio_vigencia: string | null;
  fecha_vencimiento: string | null;
  alerta_60_enviada: boolean;
  created_at: string;
  updated_at: string;
}

export interface Personal {
  id: string;
  proveedor_id: string;
  nombres: string;
  cedula: string;
  estado: EstadoPersonal;
  aprobado_por: string | null;
  aprobado_at: string | null;
  motivo_rechazo: string | null;
  fecha_entrada: string | null;
  fecha_fin: string | null;
  grupo_id: string | null;
  vehiculo_id: string | null;
  en_correccion: boolean;
  // Campos F-P-ECC-001-01 / 001-05
  actividad_a_realizar: string | null;
  cargo: string | null;
  municipio_residencia: string | null;
  arl: string | null;
  eps: string | null;
  afp: string | null;
  created_at: string;
  updated_at: string;
  proveedor?: Proveedor;
  documentos?: DocumentoPersonal[];
  vehiculo?: Vehiculo;
}

export interface Vehiculo {
  id: string;
  proveedor_id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  tipo: string | null;
  color: string | null;
  categoria_licencia: string | null;
  fecha_vencimiento_licencia: string | null;
  estado: "activo" | "inactivo";
  created_at: string;
  updated_at: string;
}

export interface GrupoIngreso {
  id: string;
  proveedor_id: string;
  nombre: string;
  descripcion: string | null;
  estado: EstadoGrupo;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
  proveedor?: Proveedor;
  personas?: Personal[];
}

export interface CriterioEvaluacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  peso: number;
  activo: boolean;
  created_at: string;
}

export interface DetalleEvaluacion {
  id: string;
  evaluacion_id: string;
  criterio_id: string;
  puntaje: number;
  observacion: string | null;
  created_at: string;
  criterio?: CriterioEvaluacion;
}

export interface Evaluacion {
  id: string;
  proveedor_id: string;
  evaluado_por: string | null;
  periodo: string;
  puntaje_total: number | null;
  estado: EstadoEvaluacion;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  proveedor?: Proveedor;
  detalles?: DetalleEvaluacion[];
}

// ─── Checklist F-P-ECC-001-05 ────────────────────────────────────────────────

export type EstadoRequisito = 'ok' | 'na' | 'pendiente';

export type ConceptoChecklist = 'cumple' | 'cumple_parcial' | 'no_cumple' | 'pendiente';

export interface RevisionChecklist {
  id: string;
  personal_id: string;
  revisado_por: string;
  fecha_revision: string;

  req_eps_arl_afp: EstadoRequisito;
  req_planilla_aportes: EstadoRequisito;
  req_examenes_medicos: EstadoRequisito;
  req_cedula: EstadoRequisito;
  req_relacion_personal: EstadoRequisito;
  req_relacion_vehiculos: EstadoRequisito;
  req_soportes_vehiculos: EstadoRequisito;
  req_licencia_conductor: EstadoRequisito;
  req_certificados_especialidad: EstadoRequisito;
  req_arl_sgsst: EstadoRequisito;
  req_responsable_sgsst: EstadoRequisito;

  obs_eps_arl_afp?: string;
  obs_planilla_aportes?: string;
  obs_examenes_medicos?: string;
  obs_cedula?: string;
  obs_relacion_personal?: string;
  obs_relacion_vehiculos?: string;
  obs_soportes_vehiculos?: string;
  obs_licencia_conductor?: string;
  obs_certificados_especialidad?: string;
  obs_arl_sgsst?: string;
  obs_responsable_sgsst?: string;

  concepto: ConceptoChecklist;
  firmante1_nombre?: string;
  firmante1_cargo?: string;
  firmante2_nombre?: string;
  firmante2_cargo?: string;
  observaciones_generales?: string;

  created_at: string;
  updated_at: string;
}

export const REQUISITOS_CHECKLIST = [
  {
    key: 'req_eps_arl_afp' as const,
    obsKey: 'obs_eps_arl_afp' as const,
    label: 'Afiliaciones o certificados vigentes de EPS, ARL, AFP, Caja de Compensación',
    aplicaConVehiculo: false,
  },
  {
    key: 'req_planilla_aportes' as const,
    obsKey: 'obs_planilla_aportes' as const,
    label: 'Planilla de aportes a la seguridad social integral y sus novedades',
    aplicaConVehiculo: false,
  },
  {
    key: 'req_examenes_medicos' as const,
    obsKey: 'obs_examenes_medicos' as const,
    label: 'Certificado de exámenes médicos pre-ocupacionales',
    aplicaConVehiculo: false,
  },
  {
    key: 'req_cedula' as const,
    obsKey: 'obs_cedula' as const,
    label: 'Fotocopia Cédula de Ciudadanía trabajador(es)',
    aplicaConVehiculo: false,
  },
  {
    key: 'req_relacion_personal' as const,
    obsKey: 'obs_relacion_personal' as const,
    label: 'Relación del Personal (Formato F-P-ECC-001-01 diligenciado)',
    aplicaConVehiculo: false,
  },
  {
    key: 'req_relacion_vehiculos' as const,
    obsKey: 'obs_relacion_vehiculos' as const,
    label: 'Relación de Vehículos y/o Maquinaria (Formato F-P-ECC-001-02)',
    aplicaConVehiculo: true,
  },
  {
    key: 'req_soportes_vehiculos' as const,
    obsKey: 'obs_soportes_vehiculos' as const,
    label: 'Soportes vehículos (SOAT, Tecnomecánica, Tarjeta de Propiedad, Manifiesto de Aduana)',
    aplicaConVehiculo: true,
  },
  {
    key: 'req_licencia_conductor' as const,
    obsKey: 'obs_licencia_conductor' as const,
    label: 'Soportes del Operador — Licencia de Conducción Vigente',
    aplicaConVehiculo: true,
  },
  {
    key: 'req_certificados_especialidad' as const,
    obsKey: 'obs_certificados_especialidad' as const,
    label: 'Certificados de especialidades según tipo de actividad (Anexo A-P-ECC-001-01)',
    aplicaConVehiculo: false,
  },
  {
    key: 'req_arl_sgsst' as const,
    obsKey: 'obs_arl_sgsst' as const,
    label: 'Calificación de ARL Sistema de Gestión-SST',
    aplicaConVehiculo: false,
  },
  {
    key: 'req_responsable_sgsst' as const,
    obsKey: 'obs_responsable_sgsst' as const,
    label: 'Certificado Responsable del SG-SST de la Empresa Contratista',
    aplicaConVehiculo: false,
  },
] as const;

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────

export interface DashboardKPIs {
  total_personal: number;
  personal_aprobado: number;
  personal_pendiente: number;
  personal_rechazado: number;
  personal_en_correccion: number;
  grupos_pendientes: number;
  vehiculos_activos: number;
  proveedores_activos: number;
  documentos_por_vencer: number;
  personal_historial: number;
  actividades_distintas: number;
}
