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
}
