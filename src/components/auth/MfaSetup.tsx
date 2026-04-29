"use client";

import { useState, useEffect } from "react";
import { Loader2, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InputField } from "@/components/ui/InputField";
import { AlertMessage } from "@/components/ui/AlertMessage";

type MfaStep = "loading" | "inactive" | "enrolling" | "active";

export function MfaSetup() {
  const [step, setStep]         = useState<MfaStep>("loading");
  const [factorId, setFactorId] = useState("");
  const [qrSvg, setQrSvg]       = useState("");
  const [secret, setSecret]     = useState("");
  const [code, setCode]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const active = data?.totp?.find((f) => f.status === "verified");
      setFactorId(active?.id ?? "");
      setStep(active ? "active" : "inactive");
    })();
  }, []);

  const startEnrollment = async () => {
    setError(null);
    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });

    if (error || !data) {
      setError("No se pudo iniciar la configuración de MFA. Intenta de nuevo.");
      setIsLoading(false);
      return;
    }

    setFactorId(data.id);
    setQrSvg(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep("enrolling");
    setIsLoading(false);
  };

  const verifyEnrollment = async () => {
    setError(null);
    setIsLoading(true);
    const supabase = createClient();

    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr || !ch) {
      setError("Error al crear el desafío MFA. Intenta de nuevo.");
      setIsLoading(false);
      return;
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code,
    });

    if (vErr) {
      setError("Código incorrecto. Verifica tu app autenticadora e intenta de nuevo.");
      setCode("");
      setIsLoading(false);
      return;
    }

    setStep("active");
    setIsLoading(false);
  };

  const disableMfa = async () => {
    setError(null);
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      setError("No se pudo desactivar MFA. Es posible que necesites verificar tu identidad primero.");
      setIsLoading(false);
      return;
    }

    setFactorId("");
    setQrSvg("");
    setSecret("");
    setCode("");
    setStep("inactive");
    setIsLoading(false);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  // ── Loading ───────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-[13px] py-2">
        <Loader2 size={14} className="animate-spin" />
        <span>Verificando estado...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <AlertMessage type="error" message={error} />}

      {/* ── MFA activo ── */}
      {step === "active" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-green-500" />
            <span className="text-[13px] font-semibold text-green-600">MFA activado</span>
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed">
            Tu cuenta está protegida. Cada inicio de sesión pedirá el código de 6 dígitos
            de Google Authenticator o Authy.
          </p>
          <button
            onClick={disableMfa}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-600 font-medium transition-colors disabled:opacity-50"
          >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            Desactivar MFA
          </button>
        </div>
      )}

      {/* ── MFA inactivo ── */}
      {step === "inactive" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldOff size={16} className="text-gray-400" />
            <span className="text-[13px] font-medium text-gray-500">MFA desactivado</span>
          </div>
          <p className="text-[12px] text-gray-400 leading-relaxed">
            Activa la verificación en dos pasos para añadir una capa extra de seguridad.
            Necesitarás Google Authenticator, Authy o cualquier app TOTP.
          </p>
          <button
            onClick={startEnrollment}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-[12px] text-ek-500 hover:text-ek-600 font-semibold transition-colors disabled:opacity-50"
          >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            Activar MFA
          </button>
        </div>
      )}

      {/* ── Registro: escanear QR y verificar ── */}
      {step === "enrolling" && (
        <div className="space-y-4">

          {/* Paso 1 — QR */}
          <div className="border border-gray-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-[22px] h-[22px] rounded-full bg-ek-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 leading-none">
                1
              </span>
              <p className="text-[12.5px] font-semibold text-gray-700">
                Escanea el código QR con tu app
              </p>
            </div>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              Abre Google Authenticator o Authy, toca &quot;+&quot; y escanea este código.
            </p>

            {qrSvg && (
              <div className="flex justify-center py-1">
                <div
                  className="w-[200px] h-[200px] p-3 border border-gray-200 rounded-xl bg-white shadow-sm"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>
            )}

            {secret && (
              <div>
                <p className="text-[11px] text-gray-400 mb-1.5">
                  ¿No puedes escanear? Ingresa esta clave manualmente en tu app:
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <code className="text-[11px] font-mono text-gray-600 break-all flex-1 leading-relaxed">
                    {secret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="shrink-0 text-gray-400 hover:text-ek-500 transition-colors"
                    aria-label="Copiar clave"
                  >
                    {secretCopied
                      ? <Check size={14} className="text-green-500" />
                      : <Copy size={14} />
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Paso 2 — Código */}
          <div className="border border-gray-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-[22px] h-[22px] rounded-full bg-ek-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 leading-none">
                2
              </span>
              <p className="text-[12.5px] font-semibold text-gray-700">
                Verifica con el código generado
              </p>
            </div>
            <p className="text-[12px] text-gray-400 leading-relaxed">
              La app genera un código de 6 dígitos que cambia cada 30 segundos.
              Ingrésalo aquí para confirmar el vínculo.
            </p>

            <InputField
              id="mfa-enroll-code"
              label="Código de verificación"
              placeholder="123456"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />

            <div className="flex items-center gap-3">
              <button
                onClick={verifyEnrollment}
                disabled={isLoading || code.length !== 6}
                className="
                  h-[40px] px-5
                  bg-ek-500 hover:bg-ek-600
                  text-white font-bold text-[12px] tracking-widest uppercase
                  rounded-[8px] flex items-center gap-2
                  shadow-[0_4px_12px_rgba(122,182,72,0.25)]
                  transition-all disabled:opacity-50 disabled:pointer-events-none
                "
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                Verificar y activar
              </button>
              <button
                type="button"
                onClick={() => { setStep("inactive"); setCode(""); setError(null); }}
                className="h-[40px] px-4 text-[12px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
