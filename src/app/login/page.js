"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  
  // State Input Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // State Mesin Keamanan (State Machine)
  const [viewState, setViewState] = useState("DEFAULT"); // DEFAULT | VERIFY_MFA
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  
  // State Status
  const [pesan, setPesan] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ---------------------------------------------------------
  // 1. LOGIKA DASAR (Email & Password)
  // ---------------------------------------------------------
  const validasiInput = () => {
    if (!email || !password) {
      setPesan("Gagal: Email dan Password WAJIB diisi!");
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validasiInput()) return;

    setIsLoading(true);
    setPesan("Memproses pendaftaran...");
    const { error } = await supabase.auth.signUp({ email, password });

    setIsLoading(false);
    if (error) setPesan(`Gagal Register: ${error.message}`);
    else setPesan("Register berhasil! Silakan Login untuk masuk ke sistem.");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validasiInput()) return;

    setIsLoading(true);
    setPesan("Memverifikasi identitas AAL1...");
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setPesan(`Gagal Login: ${error.message}`);
      setIsLoading(false);
      return;
    }

    // Periksa apakah akun ini menggunakan MFA
    checkMfaStatus();
  };

  // ---------------------------------------------------------
  // 2. LOGIKA OAUTH (Google Login)
  // ---------------------------------------------------------
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setPesan("Menghubungkan ke Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    
    if (error) {
      setPesan(`Gagal Google Auth: ${error.message}`);
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------
  // 3. LOGIKA CEK MFA & VERIFIKASI (Versi Opsional)
  // ---------------------------------------------------------
  const checkMfaStatus = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      setPesan(`Gagal memeriksa status MFA: ${error.message}`);
      setIsLoading(false);
      return;
    }

    const totpFactors = data?.totp || [];
    const verifiedFactor = totpFactors.find(f => f.status === 'verified');

    if (!verifiedFactor) {
      // LOGIKA BYPASS MUTLAK: Jika tidak ada MFA terverifikasi, langsung masuk Dasbor
      setPesan("Login berhasil! Mengalihkan ke Dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } else {
      // Jika ada MFA terverifikasi, tahan dan minta kode 6 digit
      setFactorId(verifiedFactor.id);
      
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
      if (challengeError) {
        setPesan(`Gagal membuat tantangan MFA: ${challengeError.message}`);
        setIsLoading(false);
        return;
      }
      
      setChallengeId(challengeData.id);
      setViewState("VERIFY_MFA");
      setPesan("Akun terlindungi. Masukkan 6 digit kode dari Authenticator.");
      setIsLoading(false);
    }
  };

  const verifyMfaCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setPesan("Memverifikasi kode kriptografis...");

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: mfaCode,
    });

    setIsLoading(false);
    if (error) {
      setPesan(`Kode Salah atau Kadaluarsa: ${error.message}`);
    } else {
      setPesan("Otorisasi AAL2 Berhasil! Membuka brankas Dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    }
  };

  // ---------------------------------------------------------
  // 4. RENDER ANTARMUKA 
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-blue-200">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col items-center text-center">
          <div className="bg-blue-600 text-white p-3 rounded-lg mb-3 shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            {viewState === "DEFAULT" ? "Autentikasi Sistem" : "Keamanan Berlapis (MFA)"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Sistem Manajemen Inventaris Tingkat Lanjut</p>
        </div>

        <div className="p-6">
          {pesan && (
            <div className={`mb-4 p-3 rounded-lg text-xs font-bold text-center border shadow-sm ${pesan.includes("Gagal") || pesan.includes("Salah") ? "bg-red-50 text-red-700 border-red-200" : pesan.includes("Berhasil") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
              {pesan}
            </div>
          )}

          {viewState === "DEFAULT" && (
            <form className="flex flex-col gap-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3 flex items-center justify-center gap-2 rounded-lg font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Lanjutkan dengan Google
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Atau dengan Email</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  disabled={isLoading}
                />
              </div>
              <div className="mt-2 flex flex-col gap-2">
                <button type="button" onClick={handleLogin} disabled={isLoading} className="w-full py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-all shadow-sm">
                  {isLoading ? "Memproses..." : "Masuk ke Sistem"}
                </button>
                <button type="button" onClick={handleRegister} disabled={isLoading} className="w-full py-3 rounded-lg font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:bg-slate-50 transition-all">
                  Daftar Akun Baru
                </button>
              </div>
            </form>
          )}

          {viewState === "VERIFY_MFA" && (
            <form className="flex flex-col gap-4 items-center" onSubmit={verifyMfaCode}>
              <div className="w-full">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block text-center">Kode 6 Digit</label>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full p-4 border-2 border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center text-2xl font-mono font-bold tracking-widest text-slate-700"
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Masukkan kode dari Google Authenticator, Authy, atau aplikasi MFA lainnya
                </p>
              </div>
              
              <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 transition-all shadow-sm">
                {isLoading ? "Memverifikasi..." : "Verifikasi Kode Keamanan"}
              </button>
              
              <button type="button" onClick={() => { setViewState("DEFAULT"); setPesan(""); setMfaCode(""); supabase.auth.signOut(); }} className="w-full mt-1 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors" disabled={isLoading}>
                Batal & Kembali ke Awal
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}