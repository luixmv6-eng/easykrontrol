// ══════════════════════════════════════════════════════
// src/lib/mfa.ts
// Utilidades para MFA (Multi-Factor Authentication) via TOTP
// Usa la librería `otplib` compatible con Google Authenticator
// ══════════════════════════════════════════════════════

import { authenticator } from "otplib";
import QRCode from "qrcode";
import type { MfaSetupData } from "@/types";

// ── Configuración del autenticador TOTP ──────────────
// Ventana de tolerancia: acepta el token del intervalo anterior
// (útil si el reloj del usuario está ligeramente desincronizado)
authenticator.options = {
  window: 1,
};

/**
 * Genera una clave secreta TOTP única para un usuario.
 * Esta clave debe guardarse de forma segura en la base de datos.
 * @returns string - clave base32 de 32 caracteres
 */
export function generateMfaSecret(): string {
  return authenticator.generateSecret(32);
}

/**
 * Genera la URI otpauth:// y el QR code en base64
 * para que el usuario lo escanee con su app autenticadora.
 *
 * @param email    - Correo o username del usuario (identificador en la app)
 * @param secret   - Clave secreta generada con generateMfaSecret()
 * @returns        - { otpauthUrl, secret, qrCodeDataUrl }
 */
export async function generateMfaSetup(
  email: string,
  secret: string
): Promise<MfaSetupData & { qrCodeDataUrl: string }> {
  // Nombre del emisor que aparece en la app autenticadora
  const issuer = process.env.MFA_ISSUER ?? "EasyKontrol";

  // URI estándar otpauth:// que entienden todas las apps autenticadoras
  const otpauthUrl = authenticator.keyuri(email, issuer, secret);

  // Convierte la URI a imagen QR en formato Data URL (base64)
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { otpauthUrl, secret, qrCodeDataUrl };
}

/**
 * Verifica si un token TOTP de 6 dígitos es válido
 * para la clave secreta del usuario.
 *
 * @param token   - Los 6 dígitos ingresados por el usuario
 * @param secret  - La clave secreta del usuario en la BD
 * @returns       - true si el token es válido
 */
export function verifyMfaToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    // Cualquier error (token malformado, etc.) retorna false
    return false;
  }
}
