import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase as publicSupabase } from "../../lib/supabase"; // Sesuaikan jumlah titik path dengan lokasi asli Anda

// Fungsi khusus untuk merakit ulang klien Supabase dengan identitas Token (Menembus RLS)
const createSecureClient = (req) => {
  const authHeader = req.headers.get("authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "") : "";
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } } 
  );
};

// READ: Ambil Semua Produk (Endpoint: GET /api/kue)
export async function GET() {
  try {
    // GET menggunakan klien publik karena RLS kita mengizinkan SELECT untuk semua orang
    const { data, error } = await publicSupabase
      .from("inventaris_kue")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ status: "success", data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

// CREATE: Tambah Produk (Endpoint: POST /api/kue)
export async function POST(req) {
  try {
    // 1. Bangkitkan klien aman yang membawa kunci token otorisasi dari frontend
    const supabaseSecure = createSecureClient(req);

    // 2. Membaca payload
    const body = await req.json();
    const { nama_kue, harga, stok, image_url } = body;

    // Validasi sederhana
    if (!nama_kue || !harga || !stok || !image_url) {
        return NextResponse.json({ status: "error", message: "Semua kolom wajib diisi" }, { status: 400 });
    }

    // 3. Gunakan supabaseSecure (Bukan publicSupabase) untuk melakukan INSERT
    const { data, error } = await supabaseSecure
      .from("inventaris_kue")
      .insert([
        {
          nama_kue,
          harga: Number(harga), // Memastikan tipe data masuk sebagai angka murni
          stok: Number(stok),
          image_url,
        },
      ])
      .select();

    if (error) throw error;
    
    return NextResponse.json({ status: "success", data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}