"use client";

import React from "react";
import Image from "next/image";
import { Cloud, ShieldCheck, Smartphone, LogIn, AlertCircle, Loader2 } from "lucide-react";

interface LoginScreenProps {
  onSignIn: () => void;
  isSigningIn: boolean;
  errorMessage: string | null;
}

export default function LoginScreen({ onSignIn, isSigningIn, errorMessage }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm bg-slate-900">
            <Image
              src="/willbank-logo.jpg"
              alt="WillBank Logo"
              width={64}
              height={64}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-2">
              WillBank
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-semibold uppercase">
                FAM
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestão Financeira Familiar sincronizada na nuvem
            </p>
          </div>
        </div>

        <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-start gap-3">
            <Cloud className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Salvo automaticamente no Firebase</p>
              <p className="text-xs text-slate-500">
                Receitas, despesas, dívidas, cartões, metas e orçamentos sempre salvos.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Acesse de qualquer dispositivo</p>
              <p className="text-xs text-slate-500">
                Entre com a mesma conta Google no celular ou computador e veja tudo em tempo real.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Acesso protegido</p>
              <p className="text-xs text-slate-500">
                Seus dados financeiros ficam isolados e acessíveis apenas pela sua conta.
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onSignIn}
          disabled={isSigningIn}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors shadow-xs"
        >
          {isSigningIn ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Entrar com Google
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        WillBank &copy; 2026 &mdash; Sincronização segura via Firebase
      </p>
    </div>
  );
}
