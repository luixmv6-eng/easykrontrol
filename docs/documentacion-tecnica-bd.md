# Documentación Técnica — Base de Datos y Backend
## Easy Kontrol

---

## Arquitectura General

El proyecto usa **Supabase** (PostgreSQL) como base de datos con **Row Level Security (RLS)** activado en todas las tablas. Hay dos tipos de usuarios: `admin` y `proveedor`, con accesos radicalmente distintos.

---

## Tablas de la Base de Datos

### 1. `profiles`

Extiende `auth.users` de Supabase. Se crea automáticamente vía trigger cuando un usuario se registra.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** → `auth.users(id)` |
| `username` | TEXT | nullable |
| `full_name` | TEXT | nullable |
| `avatar_url` | TEXT | nullable |
| `mfa_enabled` | BOOLEAN | default `false` |
| `rol` | TEXT | CHECK: `'admin'` o `'proveedor'` |
| `proveedor_id` | UUID | **FK** → `proveedores(id)`, nullable |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

**Trigger:** `on_auth_user_created` — al crear un usuario en `auth.users`, automáticamente inserta un registro en `profiles` con `rol='proveedor'`.

---

### 2. `proveedores`

Las empresas contratistas registradas en el sistema.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK**, `gen_random_uuid()` |
| `nombre` | TEXT | NOT NULL |
| `nit` | TEXT | NOT NULL, **UNIQUE** |
| `email` | TEXT | nullable |
| `telefono` | TEXT | nullable |
| `direccion` | TEXT | nullable |
| `estado` | TEXT | CHECK: `'activo'`, `'inactivo'`, `'suspendido'`. Default `'activo'` |
| `created_by` | UUID | **FK** → `auth.users(id)` |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

**Trigger:** `trg_proveedores_updated_at` — actualiza `updated_at` automáticamente en cada UPDATE.

---

### 3. `personal`

Personas registradas por los proveedores para ingresar a las instalaciones.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** |
| `proveedor_id` | UUID | **FK** → `proveedores(id)` ON DELETE CASCADE, NOT NULL |
| `nombres` | TEXT | NOT NULL |
| `cedula` | TEXT | NOT NULL |
| `estado` | TEXT | CHECK: `'pendiente'`, `'aprobado'`, `'rechazado'`, `'inactivo'`. Default `'pendiente'` |
| `aprobado_por` | UUID | **FK** → `auth.users(id)`, nullable |
| `aprobado_at` | TIMESTAMPTZ | nullable |
| `motivo_rechazo` | TEXT | nullable |
| `fecha_entrada` | TIMESTAMPTZ | nullable |
| `fecha_fin` | TIMESTAMPTZ | nullable |
| `grupo_id` | UUID | **FK** → `grupos_ingreso(id)`, nullable |
| `vehiculo_id` | UUID | **FK** → `vehiculos(id)`, nullable |
| `en_correccion` | BOOLEAN | default `false` |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

**Constraint:** `UNIQUE(proveedor_id, cedula)` — no se puede registrar dos veces la misma cédula para el mismo proveedor.

---

### 4. `documentos_personal`

Documentos subidos por persona (cédula, ARL, licencia, SOAT, tecnomecánica).

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** |
| `personal_id` | UUID | **FK** → `personal(id)` ON DELETE CASCADE, NOT NULL |
| `tipo` | TEXT | CHECK: `'cedula'`, `'licencia'`, `'arl'`, `'soat'`, `'tecnicomecanica'` |
| `url` | TEXT | NOT NULL (ruta en Supabase Storage) |
| `nombre_archivo` | TEXT | nullable |
| `fecha_inicio_vigencia` | DATE | nullable |
| `fecha_vencimiento` | DATE | nullable |
| `alerta_60_enviada` | BOOLEAN | default `false` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraint:** `UNIQUE(personal_id, tipo)` — solo un documento por tipo por persona.

**Trigger:** `trg_calcular_vencimiento` — para `soat` y `tecnicomecanica`, calcula automáticamente `fecha_vencimiento = fecha_inicio_vigencia + 1 año`.

---

### 5. `vehiculos`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** |
| `proveedor_id` | UUID | **FK** → `proveedores(id)` ON DELETE CASCADE |
| `placa` | TEXT | NOT NULL |
| `marca` | TEXT | nullable |
| `modelo` | TEXT | nullable |
| `tipo` | TEXT | nullable |
| `estado` | TEXT | CHECK: `'activo'`, `'inactivo'`. Default `'activo'` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraint:** `UNIQUE(proveedor_id, placa)` — placa única por empresa.

---

### 6. `grupos_ingreso`

Agrupa varias personas de un mismo proveedor en una solicitud de ingreso masivo.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** |
| `proveedor_id` | UUID | **FK** → `proveedores(id)` ON DELETE CASCADE |
| `nombre` | TEXT | NOT NULL |
| `descripcion` | TEXT | nullable |
| `estado` | TEXT | CHECK: `'pendiente'`, `'revision'`, `'completado'`. Default `'pendiente'` |
| `creado_por` | UUID | **FK** → `auth.users(id)`, nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 7. `criterios_evaluacion`

Criterios predefinidos para evaluar a los proveedores.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID | **PK** |
| `nombre` | TEXT | NOT NULL |
| `descripcion` | TEXT | nullable |
| `peso` | NUMERIC(5,2) | default `1.0` |
| `activo` | BOOLEAN | default `true` |
| `created_at` | TIMESTAMPTZ | |

**Datos iniciales (seeded):**

| Criterio | Peso |
|---|---|
| Cumplimiento documental | 25 |
| Seguridad | 25 |
| Calidad | 20 |
| Cumplimiento contractual | 20 |
| Comunicación | 10 |

---

### 8. `evaluaciones`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** |
| `proveedor_id` | UUID | **FK** → `proveedores(id)` ON DELETE CASCADE |
| `evaluado_por` | UUID | **FK** → `auth.users(id)`, nullable |
| `periodo` | TEXT | NOT NULL (ej: `"2025-Q1"`) |
| `puntaje_total` | NUMERIC(5,2) | nullable |
| `estado` | TEXT | CHECK: `'borrador'`, `'finalizado'` |
| `observaciones` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 9. `detalle_evaluacion`

Puntaje por criterio dentro de una evaluación.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** |
| `evaluacion_id` | UUID | **FK** → `evaluaciones(id)` ON DELETE CASCADE |
| `criterio_id` | UUID | **FK** → `criterios_evaluacion(id)` |
| `puntaje` | NUMERIC(5,2) | CHECK: entre 0 y 100 |
| `observacion` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | |

---

### 10. `email_logs`

Registro de todos los correos enviados por el sistema.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** |
| `personal_id` | UUID | **FK** → `personal(id)`, nullable |
| `tipo` | TEXT | CHECK: `'aprobacion'`, `'rechazo'`, `'alerta_vencimiento'` |
| `destinatario` | TEXT | NOT NULL |
| `asunto` | TEXT | nullable |
| `estado` | TEXT | default `'enviado'` |
| `error_msg` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | |

---

### 11. `audit_logs`

Trazabilidad de todas las acciones importantes del sistema.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** |
| `user_id` | UUID | **FK** → `auth.users(id)` ON DELETE SET NULL |
| `action` | TEXT | ej: `'personal_aprobado'`, `'export_excel'` |
| `entity_type` | TEXT | ej: `'personal'`, `'profiles'` |
| `entity_id` | UUID | nullable |
| `metadata` | JSONB | nullable (contexto adicional) |
| `created_at` | TIMESTAMPTZ | |

**Índices:** `user_id`, `created_at DESC`, `action`

---

### 12. `notifications`

Notificaciones in-app por usuario.

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | UUID | **PK** |
| `user_id` | UUID | **FK** → `auth.users(id)` ON DELETE CASCADE |
| `type` | TEXT | ej: `'personal_aprobado'`, `'personal_pendiente'` |
| `message` | TEXT | NOT NULL |
| `read` | BOOLEAN | default `false` |
| `metadata` | JSONB | nullable |
| `created_at` | TIMESTAMPTZ | |

**Índices:** `user_id`, `(user_id, read)`, `created_at DESC`

---

## Diagrama de Relaciones (ERD)

```
auth.users
    │
    └── profiles (1:1)
              └── proveedores (FK: proveedor_id)

proveedores (1:N)
    ├── personal
    │       ├── documentos_personal (1:N)
    │       ├── grupos_ingreso (FK: grupo_id)
    │       └── vehiculos (FK: vehiculo_id)
    ├── vehiculos
    ├── grupos_ingreso
    │       └── personal (1:N)
    └── evaluaciones
            └── detalle_evaluacion
                    └── criterios_evaluacion
```

---

## Storage

**Bucket:** `documentos` (privado)

**Ruta de archivos:** `{proveedor_id}/{personal_id}/{tipo}_{timestamp}.{ext}`

**Acceso:** Solo usuarios autenticados.

---

## Views y Funciones SQL

### View: `documentos_por_vencer`
Join de `documentos_personal → personal → proveedores`. Filtra documentos que vencen en los próximos 60 días. Devuelve el campo `dias_restantes` calculado como `(fecha_vencimiento - CURRENT_DATE)::INTEGER`.

### Función: `get_dashboard_kpis()`
Devuelve un JSON con todos los conteos del dashboard:

| Campo | Descripción |
|---|---|
| `total_personal` | Personal activo (no inactivo y sin fecha_fin vencida) |
| `personal_aprobado` | Estado `'aprobado'` y activo |
| `personal_pendiente` | Estado `'pendiente'`, sin corrección y sin grupo |
| `personal_rechazado` | Estado `'rechazado'` |
| `personal_en_correccion` | `en_correccion = true` |
| `grupos_pendientes` | Grupos en estado `'pendiente'` |
| `vehiculos_activos` | Estado `'activo'` |
| `proveedores_activos` | Estado `'activo'` |
| `documentos_por_vencer` | Resultado de la view |
| `personal_historial` | Inactivos o con fecha_fin pasada |

---

## Row Level Security (RLS)

| Tabla | Admin | Proveedor |
|---|---|---|
| `proveedores` | ALL | Solo su empresa |
| `personal` | ALL | Solo su empresa; UPDATE solo en rechazados |
| `documentos_personal` | ALL | Solo docs de su personal |
| `vehiculos` | ALL | Solo sus vehículos |
| `grupos_ingreso` | ALL | Solo sus grupos (SELECT + INSERT) |
| `evaluaciones` | ALL | Solo SELECT de las suyas |
| `detalle_evaluacion` | ALL | Solo SELECT de las suyas |
| `criterios_evaluacion` | ALL | Solo SELECT |
| `audit_logs` | SELECT | Sin acceso |
| `notifications` | Sin restricción | Solo las suyas (SELECT + UPDATE) |
| `email_logs` | ALL | Sin acceso |

---

## Endpoints API

### Personal

| Endpoint | Método | Rol | Descripción |
|---|---|---|---|
| `/api/personal` | GET | Ambos | Lista personal con filtros (estado, proveedor_id) |
| `/api/personal` | POST | Ambos | Crea persona nueva (con vehículo opcional) |
| `/api/personal/[id]` | PATCH | Ambos | Admin: aprueba/rechaza. Proveedor: envía a corrección |
| `/api/personal/[id]/documentos` | POST | Ambos | Sube o reemplaza un documento |
| `/api/personal/bulk` | PATCH | Admin | Aprueba o rechaza múltiples personas a la vez |

### Grupos

| Endpoint | Método | Rol | Descripción |
|---|---|---|---|
| `/api/grupos` | GET | Ambos | Lista grupos con personas y documentos anidados |
| `/api/grupos` | POST | Ambos | Crea grupo con múltiples personas |
| `/api/grupos/[id]/revision` | POST | Admin | Revisa y decide sobre todo el grupo |

### Proveedores

| Endpoint | Método | Rol | Descripción |
|---|---|---|---|
| `/api/proveedores` | GET | Ambos | Lista proveedores (RLS aplica) |
| `/api/proveedores` | POST | Admin | Crea proveedor; valida NIT único |
| `/api/proveedores/[id]` | PATCH | Admin | Edita datos del proveedor |

### Usuarios

| Endpoint | Método | Rol | Descripción |
|---|---|---|---|
| `/api/usuarios` | GET | Admin | Lista usuarios con proveedor asociado |
| `/api/usuarios` | POST | Admin | Crea usuario en auth + profile; registra en audit_logs |
| `/api/usuarios/[id]` | PATCH | Admin | Cambia contraseña, rol o proveedor asociado |
| `/api/usuarios/[id]` | DELETE | Admin | Elimina usuario; no se puede auto-eliminar |

### Evaluaciones

| Endpoint | Método | Rol | Descripción |
|---|---|---|---|
| `/api/evaluaciones` | POST | Admin | Crea evaluación con detalles por criterio |

### Notificaciones

| Endpoint | Método | Rol | Descripción |
|---|---|---|---|
| `/api/notifications` | GET | Ambos | Últimas 30 notificaciones del usuario |
| `/api/notifications` | PATCH | Ambos | Marca notificaciones como leídas |

### Exportación

| Endpoint | Método | Rol | Descripción |
|---|---|---|---|
| `/api/export/personal` | GET | Ambos | Descarga archivo Excel del personal filtrado |

### Acceso Público

| Endpoint | Método | Rol | Descripción |
|---|---|---|---|
| `/api/registro-publico` | POST | Público | Registro sin cuenta; notifica a admins |
| `/api/admin/reset-password` | POST | Público | Genera enlace de recuperación de contraseña |

### Cron Jobs (protegidos por token)

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/cron/vencimientos` | GET | Envía alertas de documentos que vencen en 30 o 60 días |
| `/api/cron/reporte-mensual` | GET | Envía reporte mensual de actividad a todos los admins |

---

## Configuración de Clientes Supabase

El proyecto usa tres clientes distintos según el contexto:

| Cliente | Archivo | Uso |
|---|---|---|
| **Browser** | `src/lib/supabase/client.ts` | Componentes con `"use client"`. Usa `ANON_KEY`. |
| **Server** | `src/lib/supabase/server.ts` | API Routes y Server Components. Maneja cookies de sesión. |
| **Admin** | `src/lib/supabase/admin.ts` | Solo backend. Usa `SERVICE_ROLE_KEY`. Bypassa RLS. |

---

## Resumen General

| Concepto | Cantidad |
|---|---|
| Tablas | 12 |
| Buckets de Storage | 1 |
| Views SQL | 1 |
| Funciones SQL | 1 |
| Triggers | 3 |
| Endpoints API | 17 |
| Roles de usuario | 2 (admin, proveedor) |
