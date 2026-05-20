# Easy Kontrol — Documentación completa para análisis

## ¿Qué es Easy Kontrol?

Aplicación web para **control de ingreso de personal contratista**. Permite a empresas proveedoras registrar a su personal (con documentos adjuntos), y al administrador revisar, aprobar o rechazar esos registros. Incluye control de vehículos, evaluación de proveedores, alertas de vencimiento de documentos y notificaciones.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Autenticación | Supabase Auth + MFA TOTP |
| Almacenamiento archivos | Supabase Storage (bucket: `documentos`) |
| Email | Resend API |
| Estilos | Tailwind CSS |
| Despliegue | Vercel |

---

## Roles del sistema

| Rol | Acceso |
|---|---|
| `admin` | Ve TODO el personal de TODAS las empresas. Puede aprobar, rechazar, gestionar proveedores y usuarios. |
| `proveedor` | Ve SOLO el personal de su empresa (filtrado por `profiles.proveedor_id` vía RLS). |

El rol se guarda en `public.profiles.rol` y la empresa vinculada en `public.profiles.proveedor_id`.

---

## Estructura de la base de datos

### Tabla: `public.profiles`
Extiende `auth.users`. Creada automáticamente por trigger al registrar un usuario.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Igual al `auth.users.id` |
| `username` | TEXT | Email del usuario |
| `full_name` | TEXT | Nombre completo |
| `rol` | TEXT | `'admin'` o `'proveedor'` |
| `proveedor_id` | UUID (FK) | Empresa vinculada (solo para rol proveedor) |
| `mfa_enabled` | BOOLEAN | Si tiene MFA activado |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### Tabla: `public.proveedores`
Empresas contratistas registradas.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `nombre` | TEXT NOT NULL | Nombre de la empresa |
| `nit` | TEXT UNIQUE NOT NULL | NIT de la empresa |
| `email` | TEXT | Email de contacto |
| `telefono` | TEXT | |
| `direccion` | TEXT | |
| `representante` | TEXT | Representante legal |
| `estado` | TEXT | `'activo'`, `'inactivo'`, `'suspendido'` |
| `created_by` | UUID (FK auth.users) | Admin que la creó |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### Tabla: `public.personal`
Registro de cada persona contratista.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `proveedor_id` | UUID (FK) | Empresa del personal |
| `nombres` | TEXT NOT NULL | Nombre completo |
| `cedula` | TEXT NOT NULL | Número de cédula (único por proveedor) |
| `estado` | TEXT | `'pendiente'`, `'aprobado'`, `'rechazado'`, `'inactivo'` |
| `aprobado_por` | UUID (FK auth.users) | Admin que aprobó |
| `aprobado_at` | TIMESTAMPTZ | Fecha de aprobación |
| `motivo_rechazo` | TEXT | Razón del rechazo |
| `fecha_entrada` | TIMESTAMPTZ | Fecha programada de ingreso |
| `fecha_fin` | TIMESTAMPTZ | Fecha de fin del contrato/trabajo |
| `grupo_id` | UUID (FK grupos_ingreso) | Grupo al que pertenece (opcional) |
| `vehiculo_id` | UUID (FK vehiculos) | Vehículo asociado (opcional) |
| `en_correccion` | BOOLEAN | True cuando el proveedor corrigió docs de un rechazado |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraint:** `UNIQUE (proveedor_id, cedula)` — una cédula no se puede repetir en la misma empresa.

---

### Tabla: `public.documentos_personal`
Archivos PDF de cada persona (y de su vehículo).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `personal_id` | UUID (FK) | Persona a la que pertenece |
| `tipo` | TEXT | `'cedula'`, `'licencia'`, `'arl'`, `'soat'`, `'tecnicomecanica'` |
| `url` | TEXT | Ruta en Supabase Storage (bucket `documentos`) |
| `nombre_archivo` | TEXT | Nombre original del archivo |
| `fecha_inicio_vigencia` | DATE | Solo aplica para soat y tecnomecánica |
| `fecha_vencimiento` | DATE | Calculado automáticamente (+1 año) por trigger |
| `alerta_60_enviada` | BOOLEAN | Si ya se envió la alerta de vencimiento próximo |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraint:** `UNIQUE (personal_id, tipo)` — un solo documento por tipo por persona.

**Trigger `trg_calcular_vencimiento`:** Si el tipo es `soat` o `tecnicomecanica` y se ingresa `fecha_inicio_vigencia`, calcula automáticamente `fecha_vencimiento = fecha_inicio_vigencia + 1 año`.

---

### Tabla: `public.vehiculos`
Vehículos de los contratistas.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `proveedor_id` | UUID (FK) | Empresa propietaria |
| `placa` | TEXT NOT NULL | Placa del vehículo (mayúsculas) |
| `marca` | TEXT | |
| `modelo` | TEXT | |
| `tipo` | TEXT | `'Camioneta'`, `'Moto'`, `'Bus'`, `'Transporte amarillo'`, `'Tractor'` |
| `estado` | TEXT | `'activo'` o `'inactivo'` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraint:** `UNIQUE (proveedor_id, placa)` — placa única por empresa.

---

### Tabla: `public.grupos_ingreso`
Agrupa registros de personas enviados como lote.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `proveedor_id` | UUID (FK) | Empresa que envió el grupo |
| `nombre` | TEXT NOT NULL | Nombre del grupo (ej: "Turno A - julio 2025") |
| `descripcion` | TEXT | Descripción opcional |
| `estado` | TEXT | `'pendiente'`, `'revision'`, `'completado'` |
| `creado_por` | UUID (FK auth.users) | Usuario que lo creó |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### Tabla: `public.criterios_evaluacion`
Criterios predefinidos para evaluar proveedores.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `nombre` | TEXT NOT NULL | Nombre del criterio |
| `descripcion` | TEXT | |
| `peso` | NUMERIC(5,2) | Peso porcentual en la evaluación |
| `activo` | BOOLEAN | Si está disponible para evaluar |
| `created_at` | TIMESTAMPTZ | |

**Criterios por defecto:**
- Cumplimiento documental (25%)
- Seguridad y salud en el trabajo (25%)
- Calidad del servicio (20%)
- Cumplimiento contractual (20%)
- Comunicación y respuesta (10%)

---

### Tabla: `public.evaluaciones`
Evaluaciones periódicas de proveedores.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `proveedor_id` | UUID (FK) | |
| `evaluado_por` | UUID (FK auth.users) | Admin que la hizo |
| `periodo` | TEXT | Ej: "2025-Q2" |
| `puntaje_total` | NUMERIC(5,2) | Puntaje calculado |
| `estado` | TEXT | `'borrador'` o `'finalizado'` |
| `observaciones` | TEXT | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

### Tabla: `public.detalle_evaluacion`
Puntaje por criterio de cada evaluación.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `evaluacion_id` | UUID (FK) | |
| `criterio_id` | UUID (FK) | |
| `puntaje` | NUMERIC(5,2) | Entre 0 y 100 |
| `observacion` | TEXT | |

---

### Tabla: `public.email_logs`
Historial de emails enviados.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `personal_id` | UUID (FK) | |
| `tipo` | TEXT | `'aprobacion'`, `'rechazo'`, `'alerta_vencimiento'` |
| `destinatario` | TEXT | |
| `asunto` | TEXT | |
| `estado` | TEXT | `'enviado'` o `'error'` |
| `error_msg` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

---

### Tabla: `public.audit_logs`
Registro de acciones del sistema.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK auth.users) | |
| `action` | TEXT | Acción realizada (ej: `'personal_aprobado'`) |
| `entity_type` | TEXT | Tabla afectada (ej: `'personal'`) |
| `entity_id` | UUID | ID del registro afectado |
| `metadata` | JSONB | Datos adicionales |
| `created_at` | TIMESTAMPTZ | |

---

### Tabla: `public.notifications`
Notificaciones in-app.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK auth.users) | Destinatario |
| `type` | TEXT | Tipo de notificación |
| `message` | TEXT | Mensaje |
| `read` | BOOLEAN | Si fue leída |
| `metadata` | JSONB | Datos extra |
| `created_at` | TIMESTAMPTZ | |

---

### Vista: `public.documentos_por_vencer`
Documentos que vencen en los próximos 60 días. Usada para alertas y KPIs.

```sql
SELECT dp.id, dp.personal_id, p.nombres, p.cedula,
       pv.id AS proveedor_id, pv.nombre AS proveedor, pv.email AS proveedor_email,
       dp.tipo, dp.fecha_vencimiento,
       (dp.fecha_vencimiento - CURRENT_DATE)::INTEGER AS dias_restantes,
       dp.alerta_60_enviada
FROM documentos_personal dp
JOIN personal p ON p.id = dp.personal_id
JOIN proveedores pv ON pv.id = p.proveedor_id
WHERE dp.fecha_vencimiento IS NOT NULL
  AND dp.fecha_vencimiento > CURRENT_DATE
  AND (dp.fecha_vencimiento - CURRENT_DATE) <= 60
```

---

### Función: `public.get_dashboard_kpis()`
Devuelve JSON con todos los KPIs del dashboard:
- `total_personal`: activos con fecha_fin futura o nula
- `personal_aprobado`, `personal_pendiente`, `personal_rechazado`
- `personal_en_correccion`
- `grupos_pendientes`
- `vehiculos_activos`
- `proveedores_activos`
- `documentos_por_vencer`
- `personal_historial`: inactivos o con fecha_fin pasada

---

## Rutas de la aplicación

### Páginas públicas (sin login)
| Ruta | Descripción |
|---|---|
| `/` | Landing page |
| `/login` | Login con email+contraseña, luego MFA TOTP |
| `/auth/reset-password` | Restablecer contraseña |
| `/registro-publico` | Formulario público para que un contratista se registre sin cuenta |

### Dashboard (requiere login)
| Ruta | Quién accede | Descripción |
|---|---|---|
| `/dashboard` | Admin + Proveedor | KPIs, gráficas, alertas |
| `/dashboard/personal/registro` | Admin + Proveedor | Formulario de registro de personal |
| `/dashboard/personal/consulta` | Admin + Proveedor | Listado con tabs Activos/Historial, filtros, aprobación |
| `/dashboard/personal/correcciones` | Admin | Personal en estado corrección agrupado por empresa |
| `/dashboard/personal/grupos` | Admin | Ingresos grupales pendientes de revisión |
| `/dashboard/proveedores` | Admin | CRUD de empresas proveedoras |
| `/dashboard/usuarios` | Admin | Gestión de usuarios del sistema |
| `/dashboard/evaluaciones` | Admin | Evaluación de proveedores por criterios |
| `/dashboard/calendario` | Admin + Proveedor | Calendario de vencimientos de documentos |
| `/dashboard/auditoria` | Admin | Log de auditoría de acciones |
| `/dashboard/seguridad` | Admin | MFA y reset de contraseñas |

---

## API Routes (endpoints)

### `/api/personal` — GET / POST
- **GET**: Lista personal con filtros opcionales (`proveedor_id`, `estado`, `en_correccion`). Incluye proveedor, documentos y vehículo en el select.
- **POST**: Crea un registro de personal. Acepta: `proveedor_id`, `nombres`, `cedula`, `fecha_entrada`, `fecha_fin`, `vehiculo` (objeto con placa/marca/modelo/tipo), `grupo_id`, `en_correccion`.

### `/api/personal/[id]` — PATCH
- **Rol proveedor**: Solo puede cambiar personal rechazado → `estado='pendiente'`, `en_correccion=true`.
- **Rol admin**: Cambia a `aprobado`, `rechazado` o `inactivo`. Envía email y notificación automáticamente.

### `/api/personal/[id]/documentos` — POST
Registra un documento en `documentos_personal` después de subirlo a Storage.
Acepta: `tipo`, `url`, `nombre_archivo`, `fecha_inicio_vigencia`.

### `/api/personal/bulk` — PATCH
Aprobación/rechazo masivo de personal seleccionado.
Acepta: `ids[]`, `accion` (`'aprobar'`|`'rechazar'`), `motivo_rechazo`.

### `/api/grupos` — POST
Crea un grupo y sus personas en lote. Acepta: `proveedor_id`, `nombre`, `fecha_entrada`, `fecha_fin`, `personas[]` (cada una con `nombres`, `cedula`, `vehiculo`).

### `/api/grupos/[id]/revision` — POST
Admin aprueba/rechaza personas de un grupo. Envía email resumen al proveedor.

### `/api/proveedores` — GET / POST
CRUD de empresas proveedoras.

### `/api/proveedores/[id]` — PATCH / DELETE
Actualizar o eliminar un proveedor.

### `/api/usuarios` — GET / POST
Listar y crear usuarios del sistema.

### `/api/usuarios/[id]` — PATCH / DELETE
Actualizar rol/proveedor vinculado o eliminar usuario.

### `/api/evaluaciones` — GET / POST / PATCH
CRUD de evaluaciones de proveedores.

### `/api/dashboard/detalle` — GET
Detalle de alertas clickeables (correcciones pendientes, grupos pendientes).

### `/api/notifications` — GET / PATCH
Leer notificaciones del usuario actual. PATCH para marcar como leída.

### `/api/export/personal` — GET
Exporta personal a Excel (xlsx).

### `/api/cron/vencimientos` — GET
Tarea cron: revisa documentos próximos a vencer y envía alertas por email.

### `/api/cron/reporte-mensual` — GET
Genera y envía reporte mensual por email.

### `/api/registro-publico` — POST
Endpoint público (sin auth). Acepta `multipart/form-data` con: `proveedor_id`, `nombres`, `cedula`, `fecha_entrada`, `fecha_fin`, `cedula_doc` (archivo), `licencia_doc` (opcional), `arl_doc` (opcional).

### `/api/admin/reset-password` — POST
Admin resetea contraseña de un usuario.

---

## Formularios del sistema

### 1. Formulario de login (`/login`)
Campos:
- `username` (email)
- `password`
- `mfaCode` (código TOTP — aparece en paso 2)

### 2. Formulario de registro de personal autenticado (`/dashboard/personal/registro`)
Tiene dos modos seleccionables: **Individual** y **Grupal**.

#### Modo Individual:
- **Sección Empresa y período:**
  - Empresa/Proveedor (select — fijo si es rol proveedor)
  - Fecha de entrada (datetime-local, obligatorio)
  - Fecha de finalización (datetime-local, opcional)
- **Sección Datos del personal:**
  - Nombres completos (text, obligatorio)
  - Número de cédula (text solo números, obligatorio)
- **Sección Documentos del personal** (PDF obligatorio, max 10MB):
  - Cédula de ciudadanía
  - Licencia de conducción
  - ARL (Afiliación)
- **Sección Vehículo** (colapsable, opcional):
  - Placa (texto, se convierte a mayúsculas)
  - Marca
  - Modelo
  - Tipo (select: Camioneta / Moto / Bus / Transporte amarillo / Tractor)
  - Documentos del vehículo (PDF + fecha inicio vigencia obligatoria):
    - SOAT
    - Tecnomecánica

#### Modo Grupal:
- **Datos del grupo:**
  - Empresa (select)
  - Nombre del grupo / referencia (text)
  - Fecha de entrada (datetime-local, obligatorio)
  - Fecha de finalización (opcional)
- **Por cada persona añadida** (se repite):
  - Nombres completos
  - Cédula
  - Documentos persona (cédula, licencia, ARL — PDF)
  - Sección vehículo opcional (igual al modo individual)

### 3. Formulario de registro público (`/registro-publico`)
Sin autenticación. Campos:
- Empresa (select de proveedores activos)
- Nombre completo (text)
- Cédula (text)
- Fecha de entrada (datetime-local, opcional)
- Fecha fin (datetime-local, opcional)
- Cédula doc (archivo PDF o imagen, obligatorio)
- Licencia doc (archivo, opcional)
- ARL doc (archivo, opcional)

**Diferencias vs. formulario autenticado:**
- No requiere login
- Solo acepta PDFs o imágenes (no valida magic bytes PDF)
- No tiene sección de vehículo
- No tiene modo grupal

### 4. Formulario de aprobación/rechazo (modal en Consulta)
- Estado objetivo: `aprobado` o `rechazado`
- Motivo rechazo (texto, solo si rechaza)
- Email adicional de notificación (opcional)

### 5. Formulario de corrección de documentos (modal en Consulta)
El proveedor puede re-subir documentos de personal rechazado:
- Por cada tipo de documento: input file (PDF)
- Fecha inicio vigencia (para soat/tecnomecánica)

### 6. Formulario de evaluación de proveedor
- Proveedor (select)
- Período (text, ej: "2025-Q2")
- Por cada criterio activo: puntaje (0-100) + observación
- Observaciones generales
- Botones: "Guardar borrador" o "Finalizar evaluación"

### 7. Formulario de gestión de proveedores
- Nombre (obligatorio)
- NIT (obligatorio, único)
- Email
- Teléfono
- Dirección
- Representante legal
- Estado (activo/inactivo/suspendido)

### 8. Formulario de gestión de usuarios
- Email del nuevo usuario
- Contraseña inicial
- Rol (admin/proveedor)
- Empresa vinculada (select — solo si rol = proveedor)

---

## Flujos principales

### Flujo 1: Registro individual de personal
1. Proveedor va a `/dashboard/personal/registro`
2. Selecciona "Registro individual"
3. Completa empresa (o ya viene fija), fechas, nombre, cédula, documentos, vehículo opcional
4. Click "Registrar personal" → POST `/api/personal` → Sube docs a Storage → POST `/api/personal/[id]/documentos` por cada archivo
5. Estado queda en `pendiente`
6. Admin ve alerta en dashboard y en `/dashboard/personal/consulta`

### Flujo 2: Registro grupal
1. Proveedor va a `/dashboard/personal/registro` → modo "Registro grupal"
2. Define nombre del grupo, empresa, fechas
3. Añade personas una a una con sus documentos (localmente en memoria)
4. Click "Enviar grupo" → POST `/api/grupos` → crea `grupos_ingreso` + `personal` con `grupo_id` → sube documentos de cada persona
5. Admin ve el grupo en `/dashboard/personal/grupos`
6. Admin aprueba/rechaza persona por persona → POST `/api/grupos/[id]/revision`
7. Se envía email resumen al proveedor con lista de aprobados y rechazados

### Flujo 3: Aprobación individual
1. Admin va a `/dashboard/personal/consulta`
2. Expande una persona pendiente → click "Aprobar"
3. Confirma en modal → PATCH `/api/personal/[id]` con `{estado: 'aprobado'}`
4. API: actualiza BD, registra en audit_logs, crea notificación al proveedor, envía email

### Flujo 4: Rechazo y corrección
1. Admin rechaza personal con motivo → PATCH `/api/personal/[id]` `{estado: 'rechazado', motivo_rechazo: '...'}`
2. Proveedor ve el rechazo en consulta con motivo visible
3. Proveedor hace click "Corregir documentos" → abre modal → re-sube los PDFs
4. Al confirmar: PATCH `/api/personal/[id]` (como proveedor) → `estado='pendiente'`, `en_correccion=true`
5. Admin ve alerta "Correcciones pendientes" en dashboard → link a `/dashboard/personal/correcciones`
6. Admin revisa y vuelve a aprobar o rechazar

### Flujo 5: Registro público
1. Persona entra a `/registro-publico` sin login
2. Completa el formulario con empresa, nombre, cédula y documentos
3. POST `/api/registro-publico` → crea personal en estado `pendiente` → sube docs
4. Notifica a todos los admins del sistema

---

## Row Level Security (RLS)

### Tabla `personal`:
- `personal_admin`: Admin puede todo (`rol = 'admin'`)
- `personal_prov_select`: Proveedor ve solo su personal (`proveedor_id = profiles.proveedor_id`)
- `personal_prov_insert`: Proveedor inserta solo en su empresa
- `personal_prov_update`: Proveedor solo puede editar personal rechazado (para corrección)

### Tabla `documentos_personal`:
- `docs_admin`: Admin puede todo
- `docs_prov_all`: Proveedor opera sobre documentos de su personal

### Tabla `vehiculos`:
- `vehiculos_admin`: Admin puede todo
- `vehiculos_prov`: Proveedor opera sobre sus vehículos

### Tabla `grupos_ingreso`:
- `grupos_admin`: Admin puede todo
- `grupos_prov_select`: Proveedor ve sus grupos
- `grupos_prov_insert`: Proveedor crea en su empresa

### Tabla `proveedores`:
- `proveedores_admin`: Admin puede todo
- `proveedores_prov_select`: Proveedor ve su empresa (por `created_by` o `proveedor_id`)

### Tabla `notifications`:
- Usuario solo ve/edita sus propias notificaciones

### Tabla `audit_logs`:
- Solo admins pueden SELECT

---

## Tipos TypeScript principales

```typescript
type Rol = "admin" | "proveedor";
type EstadoPersonal = "pendiente" | "aprobado" | "rechazado" | "inactivo";
type TipoDocumento = "cedula" | "licencia" | "arl" | "soat" | "tecnicomecanica";
type EstadoProveedor = "activo" | "inactivo" | "suspendido";
type EstadoEvaluacion = "borrador" | "finalizado";
type EstadoGrupo = "pendiente" | "revision" | "completado";
```

---

## Estructura de archivos relevante

```
src/
├── app/
│   ├── api/
│   │   ├── personal/
│   │   │   ├── route.ts              # GET + POST personal
│   │   │   ├── [id]/route.ts         # PATCH (admin aprueba/rechaza, proveedor corrige)
│   │   │   ├── [id]/documentos/route.ts  # POST documento
│   │   │   └── bulk/route.ts         # PATCH masivo
│   │   ├── grupos/
│   │   │   ├── route.ts              # POST crear grupo
│   │   │   └── [id]/revision/route.ts # POST revisar grupo
│   │   ├── proveedores/
│   │   │   ├── route.ts              # GET + POST
│   │   │   └── [id]/route.ts         # PATCH + DELETE
│   │   ├── usuarios/
│   │   │   ├── route.ts              # GET + POST
│   │   │   └── [id]/route.ts         # PATCH + DELETE
│   │   ├── evaluaciones/route.ts
│   │   ├── registro-publico/route.ts  # POST público sin auth
│   │   ├── notifications/route.ts
│   │   ├── export/personal/route.ts   # Excel
│   │   └── cron/
│   │       ├── vencimientos/route.ts
│   │       └── reporte-mensual/route.ts
│   ├── dashboard/
│   │   ├── page.tsx                  # Dashboard KPIs
│   │   ├── personal/
│   │   │   ├── registro/page.tsx     # Formulario registro
│   │   │   ├── consulta/page.tsx     # Listado + aprobación
│   │   │   ├── correcciones/page.tsx # Correcciones pendientes
│   │   │   └── grupos/page.tsx       # Grupos pendientes
│   │   ├── proveedores/page.tsx
│   │   ├── usuarios/page.tsx
│   │   ├── evaluaciones/page.tsx
│   │   ├── calendario/page.tsx
│   │   └── auditoria/page.tsx
│   ├── registro-publico/page.tsx     # Portal público
│   └── login/page.tsx
├── components/
│   ├── personal/
│   │   ├── RegistroPersonalForm.tsx  # Formulario auth (individual+grupal)
│   │   ├── RegistroPublicoForm.tsx   # Formulario público
│   │   ├── ConsultaPersonalClient.tsx # Listado + modales aprobación
│   │   ├── CorreccionesClient.tsx    # Panel correcciones
│   │   └── GruposIngresoClient.tsx   # Panel grupos
│   ├── proveedores/ProveedoresClient.tsx
│   ├── usuarios/UsuariosClient.tsx
│   ├── evaluaciones/EvaluacionesClient.tsx
│   └── dashboard/
│       ├── KPICardsGrid.tsx
│       ├── ChartAreaMes.tsx
│       ├── ChartBarEstados.tsx
│       └── CalendarioVencimientos.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # Cliente navegador (anon key)
│   │   ├── server.ts    # Cliente servidor (cookies)
│   │   └── admin.ts     # Cliente service role (bypass RLS)
│   ├── email.ts         # sendEmail() con Resend
│   ├── notifications.ts # crearNotificacion(), crearNotificacionAdmins()
│   ├── audit.ts         # logAudit()
│   ├── excel.ts         # exportación Excel
│   └── validations.ts   # Validaciones comunes
├── types/index.ts        # Todos los tipos TypeScript
└── middleware.ts         # Protección de rutas (auth check)
```

---

## Migraciones SQL (orden de ejecución)

1. `migration_trigger_profiles.sql` — Trigger para crear `profiles` al registrar usuario en auth
2. `migration_proveedores.sql` — Tabla `proveedores` + RLS
3. `migration_v2.sql` — Tablas `personal`, `documentos_personal`, `vehiculos`, `evaluaciones`, Storage, RLS
4. `migration_v3.sql` — Tabla `grupos_ingreso`, nuevas columnas en `personal`, fix RLS con `profiles.proveedor_id`
5. `migration_v4.sql` — Tablas `audit_logs` y `notifications`
6. `migration_fix_rls.sql` — Correcciones adicionales de RLS

---

## Variables de entorno necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
```

---

## Notas importantes para cambios

1. **RLS siempre activo**: Cualquier nueva tabla debe tener RLS habilitado y políticas para `admin` y `proveedor`.
2. **Admin client vs server client**: Las operaciones que deben bypassear RLS (como crear personal desde registro público) usan `createAdminClient()` (service role). Las operaciones normales usan `createClient()` (aplica RLS).
3. **Documentos**: Se suben primero a Supabase Storage en la ruta `{personal_id}/{tipo}.pdf`, luego se registra la URL en `documentos_personal` vía API.
4. **Constraint UNIQUE en documentos**: `(personal_id, tipo)` — si se re-sube un documento del mismo tipo, se hace `upsert: true` en Storage pero el INSERT en la tabla falla si ya existe. Considerar usar `upsert` también en la tabla.
5. **Emails**: Solo se envían si `RESEND_API_KEY` está configurada. El email del proveedor se obtiene de `auth.users` (no de `proveedores.email`).
6. **Historial**: La pestaña "Historial" en consulta filtra client-side por `estado='inactivo'` o `fecha_fin <= ahora`. No hay movimiento automático a inactivo todavía.
7. **Personal en grupos**: Los campos `fecha_entrada` y `fecha_fin` del grupo se aplican a TODAS las personas del grupo. No hay fechas individuales en modo grupal.
