import { Link, useSearchParams } from "react-router";

import { Seo } from "../components/Seo";
import { CmsSlot } from "../components/cms/CmsBlocks";

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Payment Successful" description="Payment confirmation for your HZ IT Company order." path="/payment/success" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10">
            <h1 className="text-3xl font-bold text-gray-900 font-poppins">
            Payment Successful
          </h1>
          <p className="mt-2 text-gray-600">Your order has been received and payment is confirmed.</p>

          {orderId ? (
            <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
              <div className="text-sm text-gray-700">Order ID</div>
              <div className="mt-1 font-semibold text-gray-900">#{orderId}</div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/portal/login"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Go to Client Portal
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Browse Services
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            In the portal, you can view your order status and download your invoice.
          </p>
        </div>
      </div>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.payment-success" />
    </div>
  );
}
