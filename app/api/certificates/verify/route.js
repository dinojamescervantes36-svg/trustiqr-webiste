export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get("hash");

  if (!hash) {
    return new Response(JSON.stringify({ error: "Hash required" }), { status: 400 });
  }

  const { supabase } = require("@supabase/supabase-js");
  const client = supabase.createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await client
    .from("certificates")
    .select("*")
    .or(`unique_hash.eq.${hash},cert_id.eq.${hash}`)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ found: false, error: "Certificate not found" }), {
      status: 404,
    });
  }

  return new Response(JSON.stringify({ found: true, certificate: data }), {
    headers: { "Content-Type": "application/json" },
  });
}