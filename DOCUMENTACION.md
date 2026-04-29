# EASY KONTROL — Documentación técnica y funcional

## 1. Descripción general

**Easy Kontrol** es una plataforma web para la gestión del ingreso de personal contratista de campo. Permite a los proveedores registrar y gestionar su personal y documentación, mientras que el área de control de contratistas (administradores) puede aprobar o rechazar ingresos, evaluar proveedores y monitorear el estado de los documentos.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Estilos | Tailwind CSS con paleta personalizada `ek-*` |
| Backend | Next.js Route Handlers (API Routes) |
| Base de datos | PostgreSQL a través de Supabase |
| Autenticación | Supabase Auth (JWT + MFA TOTP) |
| Almacenamiento | Supabase Storage (bucket `documentos`) |
| Correo | Resend (requiere configuración) |
| PDF | jsPDF + jspdf-autotable (generación en cliente) |
| Formularios | React Hook Form + Zod |

---

## 3. Roles de usuario

### Admin (`rol = 'admin'`)
- Ve todo el personal de todos los proveedores.
- Puede aprobar o rechazar el ingreso de personal.
- Al aprobar/rechazar se envía un correo automático al proveedor.
- Crea y visualiza evaluaciones de proveedores.
- Ve el dashboard con todos los KPIs.

### Proveedor (`rol = 'proveedor'`)
- Registra su propio personal con los documentos requeridos.
- Ve únicamente el personal de sus propios proveedores.
- Consulta el estado de aprobación de su personal.
- Ve sus propias evaluaciones (solo lectura).

---

## 4. Módulos del sistema

### 4.1 Autenticación (`/login`)
- Login con email y contraseña.
- Segundo factor de autenticación (MFA TOTP) — Google Authenticator / Authy.
- Recuperación de contraseña por email (`/auth/reset-password`).
- **Cierre de sesión automático por inactividad** de 5 minutos (cualquier interacción — ratón, teclado, scroll — reinicia el contador).

### 4.2 Dashboard (`/dashboard`)
Muestra 6 KPIs en tiempo real obtenidos de la función `get_dashboard_kpis()` de Supabase:
| KPI | Descripción |
|-----|-------------|
| Total personal | Suma de todos los registros en la tabla `personal` |
| Personal aprobado | Personas con `estado = 'aprobado'` |
| Pendientes de aprobación | Personas con `estado = 'pendiente'` |
| Docs por vencer (60 días) | Documentos (SOAT/tecnicomecanica) con vencimiento en menos de 60 días |
| Vehículos activos | Registros en `vehiculos` con `estado = 'activo'` |
| Proveedores activos | Proveedores con `estado = 'activo'` |

También muestra alertas visuales cuando hay documentos por vencer o personal pendiente de aprobación.

### 4.3 Registro de personal (`/dashboard/personal/registro`)
Formulario para registrar un nuevo contratista. Requiere:
- **Empresa / Proveedor**: selección desde lista de proveedores activos.
- **Nombres completos** y **número de cédula** (sin duplicados por proveedor).
- **5 documentos en PDF** (todos obligatorios):
  | Documento | Fecha de vigencia requerida |
  |-----------|--------------------------|
  | Cédula de ciudadanía | No |
  | Licencia de conducción | No |
  | ARL (Afiliación) | No |
  | SOAT | Sí — se calcula vencimiento automáticamente (+1 año) |
  | Tecnicomecanica | Sí — se calcula vencimiento automáticamente (+1 año) |

**Flujo técnico:**
1. Se crea el registro en `personal` (estado inicial: `pendiente`).
2. Cada PDF se sube a Supabase Storage: `documentos/{personalId}/{tipo}.pdf`.
3. Se crea el registro en `documentos_personal` con la ruta del archivo y la fecha de vigencia.
4. El trigger `trg_calcular_vencimiento` calcula automáticamente la fecha de vencimiento para SOAT y tecnicomecanica.

### 4.4 Consulta de personal (`/dashboard/personal/consulta`)
Vista de gestión del personal con:
- **Filtros**: por empresa, por estado (pendiente/aprobado/rechazado/inactivo) y búsqueda por nombre o cédula.
- **Lista expandible**: cada persona muestra sus documentos con íconos de estado (cargado / faltante / por vencer).
- **Alerta visual** cuando un documento vence en menos de 60 días.
- **Ver PDF**: genera una URL firmada temporal (1 hora) para visualizar el documento privado.
- **Aprobar / Rechazar** (solo admin): abre un modal de confirmación. El rechazo requiere ingresar el motivo.
- **Exportar PDF**: genera un PDF del contratista con su información personal, estado y tabla de documentos con fechas de vencimiento.

### 4.5 Evaluación de proveedores (`/dashboard/evaluaciones`)
Módulo para evaluar el desempeño de los proveedores. Solo los admins pueden crear evaluaciones.

**Criterios precargados** (editables desde la BD):
| Criterio | Peso |
|---------|------|
| Cumplimiento documental | 25% |
| Seguridad y salud en el trabajo | 25% |
| Calidad del servicio | 20% |
| Cumplimiento contractual | 20% |
| Comunicación y respuesta | 10% |

**Puntaje total** = Σ (puntaje_criterio × peso_criterio / 100)
- 80–100: Verde (excelente)
- 60–79: Amarillo (aceptable)
- 0–59: Rojo (deficiente)

---

## 5. Esquema de base de datos

### Tablas existentes (v1)
| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfil de usuario vinculado a `auth.users`. Contiene el rol (`admin` o `proveedor`). |
| `proveedores` | Empresas contratistas. |
| `auth_logs` | Registro de eventos de autenticación. |

### Tablas nuevas (v2 — `migration_v2.sql`)
| Tabla | Descripción |
|-------|-------------|
| `personal` | Personal contratista de cada proveedor. |
| `documentos_personal` | Documentos PDF de cada persona (cédula, licencia, ARL, SOAT, tecnicomecanica). |
| `vehiculos` | Vehículos registrados por proveedor. |
| `criterios_evaluacion` | Criterios con pesos para evaluar proveedores. |
| `evaluaciones` | Evaluaciones realizadas a proveedores. |
| `detalle_evaluacion` | Puntaje por criterio dentro de cada evaluación. |
| `email_logs` | Registro de correos enviados (aprobación/rechazo). |

### Vistas
| Vista | Descripción |
|-------|-------------|
| `documentos_por_vencer` | Documentos con vencimiento en los próximos 60 días. |

### Funciones
| Función | Descripción |
|---------|-------------|
| `get_dashboard_kpis()` | Retorna JSON con los 7 KPIs del dashboard. |
| `calcular_vencimiento()` | Trigger que calcula `fecha_vencimiento` = `fecha_inicio_vigencia` + 1 año para SOAT y tecnicomecanica. |

---

## 6. Seguridad (Row Level Security)

Todas las tablas tienen RLS habilitado:
- **Admins**: acceso completo a todos los registros.
- **Proveedores**: solo ven y modifican sus propios registros (basados en `created_by` en la tabla `proveedores`).
- **Storage**: solo usuarios autenticados pueden subir/ver/eliminar documentos. Las URLs de visualización son firmadas y expiran en 1 hora.

---

## 7. Automatización de correos

Al aprobar o rechazar un personal, el sistema:
1. Actualiza el estado en la BD.
2. Envía un correo HTML al email del proveedor (si está configurado).
3. Registra el envío en `email_logs`.

**Configuración requerida:**
Agregar la siguiente variable en `.env.local`:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
```
Obtener la clave en: https://resend.com (plan gratuito disponible).

Si `RESEND_API_KEY` no está configurada, el sistema registra una advertencia en consola pero no falla.

---

## 8. Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── personal/
│   │   │   ├── route.ts                    # GET/POST personal
│   │   │   └── [id]/
│   │   │       ├── route.ts                # PATCH (aprobar/rechazar)
│   │   │       └── documentos/
│   │   │           └── route.ts            # POST documento
│   │   └── evaluaciones/
│   │       └── route.ts                    # POST evaluación
│   ├── auth/
│   │   ├── callback/route.ts               # Callback OAuth
│   │   └── reset-password/page.tsx         # Reset de contraseña
│   ├── dashboard/
│   │   ├── layout.tsx                      # Layout con navbar, sidebar y SessionTimeout
│   │   ├── page.tsx                        # KPIs del dashboard
│   │   ├── personal/
│   │   │   ├── registro/page.tsx           # Formulario de registro
│   │   │   └── consulta/page.tsx           # Consulta y gestión
│   │   └── evaluaciones/page.tsx           # Módulo de evaluaciones
│   ├── login/page.tsx                      # Login
│   ├── layout.tsx                          # Layout raíz
│   └── page.tsx                            # Redirige a /dashboard o /login
├── components/
│   ├── auth/
│   │   ├── SessionTimeout.tsx              # Cierre automático por inactividad (5 min)
│   │   ├── CredentialsForm.tsx             # Formulario de credenciales
│   │   ├── MfaForm.tsx                     # Formulario MFA
│   │   ├── MfaSetup.tsx                    # Configuración MFA
│   │   ├── RecoveryForm.tsx                # Recuperación de contraseña
│   │   └── LogoutButton.tsx                # Botón de cierre de sesión
│   ├── dashboard/
│   │   ├── DashboardNavbar.tsx             # Barra de navegación superior
│   │   └── DashboardSidebar.tsx            # Menú lateral
│   ├── personal/
│   │   └── ConsultaPersonalClient.tsx      # Tabla + filtros + aprobar/rechazar + PDF
│   ├── evaluaciones/
│   │   └── EvaluacionesClient.tsx          # Formulario y lista de evaluaciones
│   └── ui/
│       ├── AlertMessage.tsx
│       └── InputField.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       # Cliente Supabase (browser)
│   │   └── server.ts                       # Cliente Supabase (server)
│   ├── mfa.ts                              # Utilidades MFA
│   └── validations.ts                      # Esquemas Zod
├── middleware.ts                            # Protección de rutas
└── types/
    └── index.ts                            # Tipos TypeScript del dominio
```

---

## 9. Configuración inicial

### Paso 1: Variables de entorno
Verificar que `.env.local` tenga:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
RESEND_API_KEY=re_xxxxxxxxxx   ← Opcional, para correos automáticos
```

### Paso 2: Migración de base de datos
1. Ir a Supabase → SQL Editor → New Query.
2. Copiar y ejecutar el contenido de `migration_v2.sql`.
3. Verificar que todas las tablas se hayan creado correctamente.

### Paso 3: Asignar rol de administrador
```sql
UPDATE public.profiles
SET rol = 'admin'
WHERE username = 'tu@email.com';
```

### Paso 4: Ejecutar el proyecto
```bash
npm run dev
```
Acceder en: http://localhost:3000

---

## 10. Funcionalidades pendientes / posibles mejoras futuras

- **Módulo de vehículos**: la tabla `vehiculos` está creada en la BD pero no tiene UI implementada todavía.
- **Alertas automáticas programadas**: envío periódico de correos a proveedores con documentos próximos a vencer (requiere un cron job o Supabase Edge Functions).
- **Panel de vehículos**: registro y consulta de vehículos asociados a proveedores.
- **Exportación masiva**: exportar toda la lista de personal a Excel o PDF.
- **Historial de cambios**: auditoría de quién y cuándo cambió el estado de un personal.
