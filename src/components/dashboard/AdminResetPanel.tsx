"use client";

import { useState } from "react";
import { Loader2, Link2, Copy, Check } from "lucide-react";
import { InputField } from "@/components/ui/InputField";
import { AlertMessage } from "@/components/ui/AlertMessage";

export function AdminResetPanel() {
  const [email, setEmail]     = useState("");
  const [link, setLink]       = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const generateLink = async () => {
    setError(null);
    setLink(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo generar el enlace.");
      } else {
        setLink(data.link);
      }
    } catch {
      setError("Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const reset = () => {
    setEmail("");
    setLink(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {error && <AlertMessage type="error" message={error} />}

      {!link ? (
        <>
          <InputField
            id="admin-reset-email"
            label="Correo del usuario"
            type="email"
            placeholder="usuario@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            onClick={generateLink}
            disabled={isLoading || !email.trim()}
            className="
              h-[40px] px-5
              bg-ek-500 hover:bg-ek-600
              text-white font-bold text-[12px] tracking-widest uppercase
              rounded-[8px] flex items-center gap-2
              shadow-[0_4px_12px_rgba(122,182,72,0.25)]
              transition-all disabled:opacity-50 disabled:pointer-events-none
            "
          >
            {isLoading
              ? <Loader2 size={14} className="animate-spin" />
              : <Link2 size={14} />
            }
            Generar enlace
          </button>
        </>
      ) : (
        <>
          <AlertMessage
            type="success"
            message="Enlace generado. Cópialo y envíaselo al usuario por WhatsApp, correo u otro medio. Solo funciona una vez y expira en 1 hora."
          />

          {/* Enlace copiable */}
          <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <code className="text-[11px] font-mono text-gray-500 break-all flex-1 leading-relaxed">
              {link}
            </code>
            <button
              onClick={copyLink}
              className="shrink-0 mt-0.5 text-gray-400 hover:text-ek-500 transition-colors"
              aria-label="Copiar enlace"
            >
              {copied
                ? <Check size={15} className="text-green-500" />
                : <Copy size={15} />
              }
            </button>
          </div>

          <button
            onClick={reset}
            className="text-[12px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
          >
            Generar enlace para otro usuario
          </button>
        </>
      )}
    </div>
  );
}
