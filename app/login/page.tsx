"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [mode, setMode] = useState<"sso" | "local">("sso");

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-10">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Login
        </h1>
        <p className="mb-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Masuk ke dashboard sistem survey kabel
        </p>

        {/* Toggle Tab SSO / Local */}
        <div className="mb-6 flex rounded-xl bg-neutral-100 p-1.5 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setMode("sso")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              mode === "sso"
                ? "bg-white text-blue-600 shadow-sm dark:bg-neutral-900 dark:text-blue-400"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            SSO Telkom / NIK
          </button>
          <button
            type="button"
            onClick={() => setMode("local")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              mode === "local"
                ? "bg-white text-blue-600 shadow-sm dark:bg-neutral-900 dark:text-blue-400"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            Akun Lokal
          </button>
        </div>

        {state?.error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="loginType" value={mode} />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              {mode === "sso" ? "NIK / Username SSO" : "Email / Username"}
            </label>
            <input
              name="username"
              type="text"
              placeholder={mode === "sso" ? "Masukkan NIK" : "email@domain.com"}
              required
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3.5 py-2.5 text-base text-neutral-900 transition focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="Masukkan password"
              required
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3.5 py-2.5 text-base text-neutral-900 transition focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
          >
            {isPending
              ? "Memproses..."
              : mode === "sso"
              ? "Login via SSO"
              : "Login"}
          </button>
        </form>

        {mode === "local" && (
          <p className="mt-5 text-center text-sm text-neutral-600 dark:text-neutral-400">
            Belum punya akun lokal?{" "}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Daftar
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
