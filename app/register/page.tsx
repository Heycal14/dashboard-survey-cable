"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(json.message || "Gagal melakukan pendaftaran");
        return;
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Gagal terhubung ke server",
      );
    }
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-10">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Daftar Akun
        </h1>
        <p className="mb-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Buat akun lokal baru untuk akses sistem
        </p>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              Nama Lengkap
            </label>
            <input
              name="name"
              type="text"
              placeholder="Masukkan nama lengkap"
              required
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3.5 py-2.5 text-base text-neutral-900 transition focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="email@domain.com"
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
              placeholder="Minimal 8 karakter"
              required
              minLength={8}
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-3.5 py-2.5 text-base text-neutral-900 transition focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-600 dark:text-neutral-400">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
