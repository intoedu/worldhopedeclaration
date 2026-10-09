// =============================================================================
// verify-payment — 온라인 후원 결제 검증 (Supabase Edge Function, Deno)
// 브라우저에서 결제 완료 후 paymentId 를 보내면, PortOne API 로 실제 결제 상태를
// 확인한 뒤 donations 테이블에 기록합니다. (브라우저 결과만 믿지 않기 위한 서버 검증)
//
// 배포:  supabase functions deploy verify-payment
// 비밀값: supabase secrets set PORTONE_API_SECRET=... PORTONE_STORE_ID=store-... ALLOWED_ORIGIN=https://도메인
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Supabase 가 자동 제공)
// =============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const API_SECRET = Deno.env.get("PORTONE_API_SECRET") ?? "";
const STORE_ID = Deno.env.get("PORTONE_STORE_ID") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!API_SECRET) return json({ ok: false, error: "not_configured" }, 500);

  let paymentId = "";
  try {
    paymentId = String((await req.json()).paymentId ?? "");
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  // 홈페이지에서 만드는 형식(wh-타임스탬프-난수)만 허용
  if (!/^wh-\d{10,16}-[a-z0-9]{4,12}$/.test(paymentId)) return json({ ok: false, error: "invalid_payment_id" }, 400);

  const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${API_SECRET}` },
  });
  if (!res.ok) return json({ ok: false, error: "payment_lookup_failed" }, 400);
  const payment = await res.json();

  if (STORE_ID && payment.storeId && payment.storeId !== STORE_ID) return json({ ok: false, error: "store_mismatch" }, 400);
  if (payment.status !== "PAID") return json({ ok: false, status: payment.status ?? "UNKNOWN" });

  const customer = payment.customer ?? {};
  const name = typeof customer.name === "string" ? customer.name : customer.name?.full ?? null;
  const amount = Number(payment.amount?.total ?? 0);
  if (!Number.isFinite(amount) || amount < 1000) return json({ ok: false, error: "invalid_amount" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.from("donations").upsert(
    {
      payment_id: paymentId,
      status: payment.status,
      amount,
      currency: payment.currency ?? "KRW",
      order_name: payment.orderName ?? null,
      name,
      phone: customer.phoneNumber ?? null,
      email: customer.email ?? null,
      method: payment.method?.type ?? null,
      paid_at: payment.paidAt ?? null,
      raw: payment,
    },
    { onConflict: "payment_id" },
  );
  if (error) return json({ ok: false, error: "db_error" }, 500);

  return json({ ok: true, amount });
});
