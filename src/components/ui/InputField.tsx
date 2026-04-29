"use client";

// ══════════════════════════════════════════════════════
// src/components/ui/InputField.tsx
// Componente reutilizable de campo de formulario
// Soporta: label, error, helper text, elemento derecho (ej: eye icon)
// Compatible con react-hook-form mediante forwardRef
// ══════════════════════════════════════════════════════

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

// ── Props extendidas de un <input> HTML nativo ────────
interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Etiqueta visible sobre el campo */
  label: string;
  /** ID único del campo (también usado para el label htmlFor) */
  id: string;
  /** Mensaje de error de validación (aparece en rojo debajo del campo) */
  error?: string;
  /** Texto de ayuda secundario (aparece en gris debajo del campo) */
  helperText?: string;
  /** Elemento que se renderiza a la derecha dentro del input (ej: botón de ojo) */
  rightElement?: ReactNode;
}

// ── Componente con forwardRef para compatibilidad con react-hook-form ──
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, id, error, helperText, rightElement, className, ...rest }, ref) => {
    return (
      /*
       * Contenedor del campo con margen inferior.
       * Cada campo ocupa su propia fila vertical.
       */
      <div className="mb-5">
        {/* ── Label ── */}
        <label
          htmlFor={id}
          className="block text-[12.5px] font-semibold text-gray-700 mb-1.5 tracking-wide"
        >
          {label}
        </label>

        {/* ── Wrapper del input (para posicionar el ícono derecho) ── */}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={clsx(
              // Estilos base del input
              "w-full h-[46px] rounded-[10px] border",
              "px-3.5 text-[14px] font-normal text-gray-800",
              "bg-white/90 placeholder:text-gray-300",
              "outline-none transition-all duration-200",
              // Estado normal
              "border-gray-200",
              // Estado focus: borde verde + ring suave
              "focus:border-ek-500 focus:ring-[3px] focus:ring-ek-500/15 focus:bg-white",
              // Estado error: borde rojo
              error && "border-red-400 focus:border-red-400 focus:ring-red-400/15",
              // Padding extra si hay elemento a la derecha
              rightElement && "pr-11",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${id}-error` : helperText ? `${id}-helper` : undefined
            }
            {...rest}
          />

          {/* ── Elemento derecho (ej: botón ojo para contraseña) ── */}
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>

        {/* ── Mensaje de error ── */}
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1.5 text-[11.5px] text-red-500 font-medium"
          >
            {error}
          </p>
        )}

        {/* ── Texto de ayuda (solo si no hay error) ── */}
        {helperText && !error && (
          <p
            id={`${id}-helper`}
            className="mt-1.5 text-[11.5px] text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

// Nombre para el DevTools de React
InputField.displayName = "InputField";
