import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";

import { Seo } from "../components/Seo";
import { CTAButton } from "../components/CTAButton";
import { createOrder, fetchPricing, verifyPayment, type PricingItem } from "../services/platformService";
import { CmsSlot } from "../components/cms/CmsBlocks";

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const pricingIdFromUrl = Number(params.get("pricingId") ?? "");

  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [pricingId, setPricingId] = useState<number | null>(Number.isFinite(pricingIdFromUrl) && pricingIdFromUrl > 0 ? pricingIdFromUrl : null);

  const selected = useMemo(() => pricing.find((p) => p.id === pricingId) ?? null, [pricing, pricingId]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoadingPricing(true);
    fetchPricing()
      .then((r: any) => {
        if (!mounted) return;
        setPricing(r.items);
        if (!pricingId && r.items[0]) setPricingId(r.items[0].id);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load pricing");
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingPricing(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPay() {
    setError(null);
    if (!pricingId) return setError("Please select a plan.");
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!email.includes("@")) return setError("Please enter a valid email.");

    setSubmitting(true);
    try {
      const created = await createOrder({ pricingId, name: name.trim(), email: email.trim() });
      await loadRazorpayScript();

      const options = {
        key: created.razorpay.keyId,
        amount: created.razorpay.amount,
        currency: created.razorpay.currency,
        name: "HZ IT Company",
        description: selected ? `${selected.service_name} • ${selected.plan_name}` : "Service Order",
        order_id: created.razorpay.orderId,
        prefill: { name: name.trim(), email: email.trim() },
        handler: async (resp: any) => {
          try {
            await verifyPayment({
              orderId: created.orderId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            navigate(`/payment/success?orderId=${created.orderId}`);
          } catch (e: any) {
            setError(e?.message ?? "Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      setError(e?.message ?? "Failed to start checkout");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Checkout" description="Secure checkout for HZ IT Company services." path="/checkout" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">
            Checkout
          </h1>
          <p className="mt-2 text-gray-600">
            Select a service plan and complete payment via Razorpay.
          </p>

          <div className="mt-8 grid gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Plan</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                disabled={loadingPricing}
                value={pricingId ?? ""}
                onChange={(e) => setPricingId(Number(e.target.value))}
              >
                {pricing.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.service_name} — {p.plan_name} (₹{p.price_inr.toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Full Name</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </label>

            {selected ? (
              <div className="mt-2 rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="text-sm text-gray-700">You’re ordering</div>
                <div className="mt-1 font-semibold text-gray-900">
                  {selected.service_name} — {selected.plan_name}
                </div>
                <div className="mt-1 text-gray-700">
                  Total: <span className="font-semibold">₹{selected.price_inr.toLocaleString("en-IN")}</span>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <CTAButton onClick={onPay} disabled={submitting || loadingPricing}>
                {submitting ? "Starting payment…" : "Pay with Razorpay"}
              </CTAButton>
              <Link
                to="/services"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Back to Services
              </Link>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              After payment, you can log in to the client portal to download your invoice.
            </p>
          </div>
        </div>
      </div>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.checkout" />
    </div>
  );
}
