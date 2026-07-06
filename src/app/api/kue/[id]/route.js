import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// UPDATE: Ubah Produk (Endpoint: PUT /api/kue/[id])
export async function PUT(req, { params }) {
  try {
    // 1. Bangkitkan klien aman yang membawa kunci token otorisasi
    const supabaseSecure = createSecureClient(req);
    
    // 2. Buka bungkus Promise params (Wajib di Next.js 15)
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    const body = await req.json();
    const { nama_kue, harga, stok, image_url } = body;

    // 3. Gunakan supabaseSecure untuk melakukan UPDATE
    const { data, error } = await supabaseSecure
      .from("inventaris_kue")
      .update({
        nama_kue,
        harga: Number(harga),
        stok: Number(stok),
        image_url,
      })
      .eq("id", id)
      .select();

    if (error) throw error;
    return NextResponse.json({ status: "success", data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

// DELETE: Hapus Produk (Endpoint: DELETE /api/kue/[id])
export async function DELETE(req, { params }) {
  try {
    // 1. Bangkitkan klien aman yang membawa kunci token otorisasi
    const supabaseSecure = createSecureClient(req);
    
    // 2. Buka bungkus Promise params (Wajib di Next.js 15)
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // 3. Gunakan supabaseSecure untuk melakukan DELETE
    const { data, error } = await supabaseSecure
      .from("inventaris_kue")
      .delete()
      .eq("id", id)
      .select();

    if (error) throw error;
    return NextResponse.json({ status: "success", data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}