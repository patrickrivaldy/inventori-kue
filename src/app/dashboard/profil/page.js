"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabase";

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mfaStatus, setMfaStatus] = useState("checking"); 
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [pesan, setPesan] = useState("");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    checkUserAndMfa();
  }, []);

  const checkUserAndMfa = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUser(session.user);

    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setPesan("Gagal mengambil status keamanan server.");
      return;
    }
    
    const totpFactors = data?.totp || [];
    const verifiedFactor = totpFactors.find(f => f.status === 'verified');
    
    setMfaStatus(verifiedFactor ? "enabled" : "disabled");
    if (verifiedFactor) {
      setFactorId(verifiedFactor.id);
    }
  };

  const mulaiPendaftaranMfa = async () => {
    setPesan("Memeriksa status keamanan peladen...");
    
    const { data: existingFactors } = await supabase.auth.mfa.listFactors();
    const allFactors = existingFactors?.all || [];
    const unverifiedFactors = allFactors.filter(f => f.factor_type === 'totp' && f.status === 'unverified');
    
    for (const factor of unverifiedFactors) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({ 
      factorType: 'totp',
      friendlyName: 'Inventori_MFA' 
    });
    
    if (error) {
      setPesan(`Sistem Menolak: ${error.message}`);
      return; 
    }
    
    const uri = data.totp?.uri;
    if (!uri) {
      setPesan("Gagal mendapatkan data QR dari server.");
      return;
    }
    
    try {
      const dataUrl = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: 'H',
        width: 256,
        margin: 4,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      
      setQrCodeDataUrl(dataUrl);
      setFactorId(data.id);
      setIsEnrolling(true);
      setPesan("Pindai QR ini dengan Authenticator, dan masukkan 6 digit kodenya.");
    } catch (err) {
      setPesan(`Gagal generate QR Code: ${err.message}`);
    }
  };

  const verifikasiMfaBaru = async (e) => {
    e.preventDefault();
    setPesan("Memverifikasi...");
    
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setPesan(`Gagal membuat tantangan: ${challengeError.message}`);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: mfaCode,
    });

    if (verifyError) {
      setPesan(`Kode Tidak Valid: ${verifyError.message}`);
    } else {
      setMfaStatus("enabled");
      setIsEnrolling(false);
      setQrCodeDataUrl("");
      setMfaCode("");
      setPesan("Sukses! Akun Anda kini dikunci dengan perlindungan MFA tingkat lanjut.");
    }
  };

  const nonaktifkanMfa = async () => {
    setIsDisabling(true);
    setPesan("Menonaktifkan MFA...");
    
    // Dapatkan semua faktor TOTP yang terverifikasi
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactors = factorsData?.totp || [];
    const verifiedFactors = totpFactors.filter(f => f.status === 'verified');
    
    // Unenroll semua faktor yang terverifikasi
    for (const factor of verifiedFactors) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) {
        setPesan(`Gagal menonaktifkan MFA: ${error.message}`);
        setIsDisabling(false);
        setShowDisableConfirm(false);
        return;
      }
    }
    
    setMfaStatus("disabled");
    setFactorId("");
    setIsDisabling(false);
    setShowDisableConfirm(false);
    setPesan("MFA berhasil dinonaktifkan. Akun Anda kini kurang aman.");
  };

  const toggleMfa = () => {
    if (mfaStatus === "enabled") {
      setShowDisableConfirm(true);
    } else {
      mulaiPendaftaranMfa();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8 selection:bg-blue-200">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Profil & Keamanan</h1>
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all">
            Kembali ke Dasbor
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          
          <div className="p-6 border-b border-slate-100 flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 border border-blue-100 rounded-full flex items-center justify-center font-bold text-xl shadow-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Identitas Akun</p>
              <h2 className="text-lg font-bold text-slate-800">{user?.email}</h2>
            </div>
          </div>

          <div className="p-6">
            {pesan && !isEnrolling && !showDisableConfirm && (
              <div className={`mb-4 p-3 rounded-lg text-xs font-bold text-center border shadow-sm ${pesan.includes("Gagal") || pesan.includes("Menolak") || pesan.includes("kurang aman") ? "bg-red-50 text-red-700 border-red-200" : pesan.includes("Sukses") || pesan.includes("berhasil") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                {pesan}
              </div>
            )}

            <div className="flex items-center justify-between p-5 border border-slate-200 rounded-xl bg-slate-50 mb-4">
              <div>
                <h3 className="font-bold text-slate-800">Autentikasi Dua Langkah (MFA)</h3>
                <p className="text-xs text-slate-500 mt-1">Lindungi akun Anda dengan verifikasi 2 langkah</p>
              </div>
              
              {/* Toggle Switch */}
              <button
                onClick={toggleMfa}
                disabled={isEnrolling || isDisabling}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  mfaStatus === "enabled" ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle MFA</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${
                    mfaStatus === "enabled" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              {mfaStatus === "enabled" ? (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">MFA Aktif</p>
                    <p className="text-xs text-emerald-600">Akun Anda terlindungi dengan autentikasi 2 faktor</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-amber-800">MFA Nonaktif</p>
                    <p className="text-xs text-amber-600">Aktifkan MFA untuk meningkatkan keamanan akun</p>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmation Dialog */}
            {showDisableConfirm && (
              <div className="mb-6 p-6 border-2 border-red-200 rounded-xl bg-red-50 shadow-inner">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-red-900">Konfirmasi Nonaktifkan MFA</h4>
                    <p className="text-xs text-red-700 mt-1">Apakah Anda yakin ingin menonaktifkan MFA? Akun Anda akan menjadi kurang aman.</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={nonaktifkanMfa}
                    disabled={isDisabling}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-3 rounded-lg font-bold text-sm shadow-sm transition-all"
                  >
                    {isDisabling ? "Memproses..." : "Ya, Nonaktifkan"}
                  </button>
                  <button
                    onClick={() => { setShowDisableConfirm(false); setPesan(""); }}
                    disabled={isDisabling}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 py-3 rounded-lg font-bold text-sm transition-all"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Enrollment Form */}
            {isEnrolling && (
              <div className="p-6 border border-blue-200 rounded-xl bg-blue-50/50 shadow-inner">
                <h4 className="font-bold text-blue-900 mb-4 text-center">Konfigurasi Authenticator</h4>
                {pesan && <p className="text-xs font-bold text-center text-blue-700 mb-4 bg-blue-100 p-2 rounded-lg border border-blue-200">{pesan}</p>}
                
                <form onSubmit={verifikasiMfaBaru} className="flex flex-col items-center gap-4">
                  {qrCodeDataUrl && (
                    <div className="bg-white p-6 rounded-xl border-2 border-slate-200 shadow-lg flex items-center justify-center overflow-hidden">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="MFA QR Code" 
                        className="w-64 h-64 object-contain"
                        style={{ 
                          display: 'block',
                          imageRendering: 'crisp-edges'
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="w-full max-w-xs">
                    <input
                      type="text"
                      maxLength="6"
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full p-4 border-2 border-slate-300 rounded-lg text-center text-2xl font-mono font-bold tracking-widest text-slate-700 transition-all shadow-sm bg-white"
                      required
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-2 w-full max-w-xs mt-2">
                    <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold text-sm shadow-sm transition-all">Verifikasi</button>
                    <button type="button" onClick={() => { setIsEnrolling(false); setQrCodeDataUrl(""); setMfaCode(""); setPesan(""); }} className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-bold text-sm transition-all shadow-sm">Batal</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}