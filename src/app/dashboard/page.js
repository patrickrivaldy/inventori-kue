"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../app/lib/supabase"; // Sesuaikan path jika perlu

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [kues, setKues] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [fileGambar, setFileGambar] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nama_kue: "",
    harga: "",
    stok: "",
    image_url: "",
  });

  const API_URL = "/api/kue";

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
        setLoadingAuth(false);
        fetchKues();
      }
    };
    checkUser();
  }, [router]);

  const fetchKues = async () => {
    try {
      const res = await fetch(API_URL);
      const result = await res.json();
      if (result.status === "success") setKues(result.data);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setFileGambar(null);
    setFormData({ nama_kue: "", harga: "", stok: "", image_url: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.image_url;

      if (fileGambar) {
        const fileExt = fileGambar.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('kue-images')
          .upload(fileName, fileGambar);

        if (uploadError) throw new Error("Gagal mengunggah gambar");

        const { data: { publicUrl } } = supabase.storage
          .from('kue-images')
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrl;
      }

      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${API_URL}/${editId}` : API_URL;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const payload = {
        nama_kue: formData.nama_kue,
        harga: parseInt(formData.harga) || 0,
        stok: parseInt(formData.stok) || 0,
        image_url: finalImageUrl,
      };

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.status === "error") throw new Error(result.message);

      cancelEdit();
      fetchKues();
    } catch (error) {
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
    }
  };

  if (loadingAuth) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-blue-200 rounded-full"></div>
        <p className="text-slate-500 font-bold text-sm">Memverifikasi keamanan akses...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* HEADER TEMA BARU (Sesuai dengan gaya Login/Profil) */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">DASHBOARD INVENTARIS</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard/profil")} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-bold text-sm transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              Keamanan
            </button>
            <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold text-sm transition-all">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* PANEL KIRI: FORM INPUT */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
            {/* Dekorasi Aksen Biru di atas form */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-800">
              {isEditing ? "Ubah Data Produk" : "Tambah Produk Baru"}
            </h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nama Kue</label>
                <input
                  type="text"
                  value={formData.nama_kue}
                  onChange={(e) => setFormData({ ...formData, nama_kue: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Harga (Rp)</label>
                  <input
                    type="number"
                    value={formData.harga}
                    onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Stok Fisik</label>
                  <input
                    type="number"
                    value={formData.stok}
                    onChange={(e) => setFormData({ ...formData, stok: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Unggah Gambar</label>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFileGambar(e.target.files[0])}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all"
                  required={!isEditing}
                />
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-sm ${isSubmitting ? "bg-slate-400" : isEditing ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {isSubmitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah ke Inventaris"}
                </button>
                {isEditing && (
                  <button type="button" onClick={cancelEdit} className="w-full py-3 rounded-lg font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                    Batal Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* PANEL KANAN: TABEL DATA ADMIN */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="font-bold text-slate-800 text-lg">Manajemen Data</h2>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold">
                Total: {kues.length} Produk
              </span>
            </div>
            
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b-2 border-slate-100">Produk</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b-2 border-slate-100">Harga</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b-2 border-slate-100">Stok</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b-2 border-slate-100 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kues.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-400 text-sm font-medium">Belum ada data produk di inventaris.</td>
                    </tr>
                  ) : (
                    kues.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-3 flex items-center gap-4">
                          {k.image_url ? (
                            <img src={k.image_url} alt={k.nama_kue} className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-lg border border-slate-200">
                               <span className="text-slate-400 text-[10px] font-bold">NO IMG</span>
                            </div>
                          )}
                          <div className="font-bold text-slate-800 text-sm">{k.nama_kue}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-700 text-sm">Rp {k.harga.toLocaleString("id-ID")}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold border ${k.stok > 10 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {k.stok} Pcs
                          </span>
                        </td>
                        <td className="p-3 text-right">
                           <button onClick={() => { setIsEditing(true); setEditId(k.id); setFormData({ nama_kue: k.nama_kue, harga: k.harga, stok: k.stok, image_url: k.image_url }); }} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-1 rounded-md mr-2 text-xs font-bold transition-all">
                             Edit
                           </button>
                           <button onClick={async () => { 
                             if (confirm(`Hapus ${k.nama_kue} dari sistem?`)) { 
                               try {
                                 const { data: { session } } = await supabase.auth.getSession();
                                 const deleteToken = session?.access_token;
                                 
                                 const res = await fetch(`${API_URL}/${k.id}`, { 
                                   method: "DELETE",
                                   headers: {
                                     "Authorization": `Bearer ${deleteToken}`
                                   }
                                 }); 
                                 const result = await res.json();
                                 if (result.status === "error") throw new Error(result.message);
                                 
                                 fetchKues(); 
                               } catch (err) {
                                 alert(`Gagal menghapus: ${err.message}`);
                               }
                             } 
                           }} className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-md text-xs font-bold transition-all">
                             Hapus
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}