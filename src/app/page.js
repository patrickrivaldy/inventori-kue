"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [kues, setKues] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = "/api/kue";

  useEffect(() => {
    const fetchKues = async () => {
      try {
        const res = await fetch(API_URL);
        const result = await res.json();
        if (result.status === "success") {
          setKues(result.data);
        }
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchKues();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="max-w-7xl mx-auto flex items-center gap-3 w-full">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">Manajemen Gudang UMKM</h1>
            <p className="text-xs text-slate-500">Katalog Publik Toko Kue</p>
          </div>
          <div className="ml-auto">
             <Link href="/login" className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors">
                Masuk Dashboard
             </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h2 className="font-bold text-slate-800">Katalog Produk Tersedia ({kues.length})</h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <p className="p-10 text-center text-slate-500">Memuat data dari server...</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Produk</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Harga</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kues.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 flex items-center gap-4">
                        {k.image_url ? (
                          <img src={k.image_url} alt={k.nama_kue} className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-lg border">
                            <span className="text-slate-400 text-[10px] font-medium">No IMG</span>
                          </div>
                        )}
                        <div className="font-bold text-slate-800 text-sm">{k.nama_kue}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-700 text-sm">Rp {k.harga.toLocaleString("id-ID")}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          {k.stok} Pcs
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}