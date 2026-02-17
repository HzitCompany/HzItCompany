import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";

export function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="My Profile" description="Your profile details." path="/profile" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-poppins">My Profile</h1>
            <p className="mt-2 text-gray-600">Your verified contact details.</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-semibold text-gray-700">Name</div>
              <div className="mt-1 text-gray-900">{user?.name ?? "—"}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700">Phone</div>
              <div className="mt-1 text-gray-900">{user?.phone ?? "—"}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700">Email</div>
              <div className="mt-1 text-gray-900">{user?.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700">Verified</div>
              <div className="mt-1 text-gray-900">{user?.isVerified ? "Yes" : "No"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
