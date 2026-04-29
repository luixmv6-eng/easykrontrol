# Easy Kontrol — Sistema de Autenticación

Plataforma de gestión de proveedores con autenticación segura (Login + MFA + Recuperación de contraseña).

---

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Estilos**: Tailwind CSS
- **Auth**: Supabase Auth (Email/Password + MFA TOTP)
- **Formularios**: React Hook Form + Zod
- **Lenguaje**: TypeScript

---

## Estructura de archivos

```
src/
├── app/
│   ├── layout.tsx                  # Layout raíz (fuentes, metadatos)
│   ├── page.tsx                    # Redirige según sesión
│   ├── globals.css                 # Estilos globales + Tailwind
│   ├── login/
│   │   └── page.tsx                # Página de login (layout 2 paneles)
│   ├── dashboard/
│   │   └── page.tsx                # Dashboard protegido
│   └── auth/
│       ├── callback/route.ts       # Handler de callbacks de Supabase
│       └── reset-password/page.tsx # Formulario nueva contraseña
├── components/
│   ├── auth/
│   │   ├── LoginPanel.tsx          # Panel orquestador del login
│   │   ├── CredentialsForm.tsx     # Formulario usuario + contraseña
│   │   ├── MfaForm.tsx             # Formulario código TOTP
│   │   ├── RecoveryForm.tsx        # Formulario recuperación
│   │   ├── EkLogo.tsx              # Logo y marca
│   │   ├── EkFooterIcons.tsx       # Iconos de pie de página
│   │   └── LogoutButton.tsx        # Botón cerrar sesión
│   └── ui/
│       ├── InputField.tsx          # Campo de formulario reutilizable
│       └── AlertMessage.tsx        # Mensajes de error/éxito
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Cliente Supabase (navegador)
│   │   └── server.ts               # Cliente Supabase (servidor)
│   ├── mfa.ts                      # Utilidades TOTP (otplib)
│   └── validations.ts              # Esquemas Zod
├── middleware.ts                   # Protección de rutas
└── types/index.ts                  # Tipos TypeScript globales
```

---

## Instalación y configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.local.example` a `.env.local` y rellena los valores:

```bash
cp .env.local.example .env.local
```

---

## Configuración en Supabase (paso a paso)

### PASO 1 — Crear el proyecto

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Clic en **"New Project"**
3. Elige nombre, contraseña de base de datos y región
4. Espera ~2 minutos a que el proyecto se inicialice

### PASO 2 — Obtener las credenciales

1. Ve a **Settings → API**
2. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### PASO 3 — Habilitar el proveedor de Email/Password

1. Ve a **Authentication → Providers**
2. Asegúrate de que **Email** está habilitado
3. Configura:
   - ✅ "Confirm email" (recomendado para producción)
   - Para desarrollo puedes desactivarlo temporalmente

### PASO 4 — Configurar URLs de redirección

1. Ve a **Authentication → URL Configuration**
2. **Site URL**: `http://localhost:3000` (en desarrollo)
3. **Redirect URLs** — agrega:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/callback?type=recovery
   ```
4. En producción reemplaza `localhost:3000` con tu dominio real

### PASO 5 — Habilitar MFA en Supabase

1. Ve a **Authentication → MFA**
2. Activa **"Enable TOTP MFA"**
3. Configura si el MFA es obligatorio u opcional para los usuarios

---

## Pruebas del sistema de autenticación

### TEST 1 — Crear un usuario de prueba

**Opción A: Desde el panel de Supabase**
1. Ve a **Authentication → Users**
2. Clic en **"Invite User"** o **"Add User"**
3. Ingresa email y contraseña
4. El usuario queda creado directamente

**Opción B: Desde SQL Editor de Supabase**
```sql
-- Ejecutar en Supabase → SQL Editor
-- Esto inserta un usuario directamente (para desarrollo)
SELECT auth.uid();  -- Verificar que estás autenticado como admin
```

**Opción C: Usando la API de Supabase (curl)**
```bash
curl -X POST 'https://TU_URL.supabase.co/auth/v1/signup' \
  -H "apikey: TU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "proveedor@test.com",
    "password": "Test1234!"
  }'
```

### TEST 2 — Probar Login básico (sin MFA)

1. Ejecuta el servidor: `npm run dev`
2. Abre `http://localhost:3000/login`
3. Ingresa el email y contraseña del usuario creado
4. **Resultado esperado**: Redirección a `/dashboard`

### TEST 3 — Probar MFA (TOTP)

**Primero, habilitar MFA para el usuario:**

El flujo estándar de Supabase para enrollar MFA es:

```typescript
// Ejecutar desde la consola del navegador (con sesión activa):
const supabase = createClient()

// Paso 1: Enrollar el factor TOTP
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Mi autenticador'
})

// data.totp.qr_code → imagen QR para escanear con Google Authenticator
// data.totp.secret  → clave manual por si no puedes escanear el QR
console.log(data)
```

1. Abre Google Authenticator o Authy
2. Escanea el QR code generado
3. Verifica el código con:

```typescript
// Paso 2: Verificar el primer código para activar el factor
const { data: challenge } = await supabase.auth.mfa.challenge({
  factorId: data.id
})

const { error } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challenge.id,
  code: '123456'  // Código de tu app autenticadora
})
```

**Una vez configurado, probar el login con MFA:**
1. Abre `http://localhost:3000/login`
2. Ingresa credenciales → aparece el paso MFA
3. Abre Google Authenticator → copia el código de 6 dígitos
4. Ingrésalo en el campo MFA
5. **Resultado esperado**: Redirección a `/dashboard`

### TEST 4 — Probar Recuperación de contraseña

1. Abre `http://localhost:3000/login`
2. Clic en "¿Olvidaste tu contraseña?"
3. Ingresa el email del usuario de prueba
4. Revisa la bandeja de entrada del email
5. Clic en el enlace del email → redirige a `/auth/reset-password`
6. Ingresa la nueva contraseña (mínimo 8 caracteres, 1 mayúscula, 1 número)
7. **Resultado esperado**: Contraseña actualizada, redirección al login

> **Nota**: Para recibir los emails en desarrollo, Supabase usa su propio SMTP.
> Ve a **Authentication → Email Templates** para personalizar los mensajes.
> Para producción, configura un SMTP personalizado en **Settings → Auth → SMTP Settings**.

### TEST 5 — Verificar protección de rutas

```bash
# Intentar acceder al dashboard sin sesión
# Abre en el navegador (sin estar logueado):
http://localhost:3000/dashboard

# Resultado esperado: Redirección automática a /login
```

---

## Comandos útiles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar en modo producción
npm start

# Verificar tipos TypeScript
npx tsc --noEmit

# Linting
npm run lint
```

---

## Notas de seguridad

- ✅ El middleware verifica la sesión en cada petición protegida
- ✅ Se usa `getUser()` en lugar de `getSession()` (más seguro contra manipulación de cookies)
- ✅ La `service_role` key NUNCA se expone al cliente
- ✅ Los errores de auth se mapean a mensajes en español sin revelar información sensible
- ✅ El formulario de recuperación no indica si el email existe o no (previene enumeración de usuarios)
