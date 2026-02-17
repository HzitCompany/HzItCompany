import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./auth/RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import("./pages/Home")).Home }),
      },
      {
        path: "about",
        lazy: async () => ({ Component: (await import("./pages/About")).About }),
      },
      {
        path: "services",
        lazy: async () => ({ Component: (await import("./pages/Services")).Services }),
      },
      {
        path: "portfolio",
        lazy: async () => ({ Component: (await import("./pages/Portfolio")).Portfolio }),
      },
      {
        path: "contact",
        lazy: async () => {
          const { Contact } = await import("./pages/Contact");
          return { Component: () => <RequireAuth><Contact /></RequireAuth> };
        },
      },
      {
        path: "hire-us",
        lazy: async () => {
          const { HireUs } = await import("./pages/HireUs");
          return { Component: () => <RequireAuth><HireUs /></RequireAuth> };
        },
      },
      {
        path: "careers",
        lazy: async () => {
          const { Careers } = await import("./pages/Careers");
          return { Component: () => <RequireAuth><Careers /></RequireAuth> };
        },
      },
      {
        path: "checkout",
        lazy: async () => ({ Component: (await import("./pages/Checkout")).Checkout }),
      },
      {
        path: "payment/success",
        lazy: async () => ({ Component: (await import("./pages/PaymentSuccess")).PaymentSuccess }),
      },
      {
        path: "portal/login",
        lazy: async () => ({ Component: (await import("./pages/PortalLogin")).PortalLogin }),
      },
      {
        path: "auth",
        lazy: async () => ({ Component: (await import("./pages/Auth")).Auth }),
      },
      {
        path: "portal",
        lazy: async () => ({ Component: (await import("./pages/PortalDashboard")).PortalDashboard }),
      },
      {
        path: "profile",
        lazy: async () => {
          const { Profile } = await import("./pages/Profile");
          return { Component: () => <RequireAuth><Profile /></RequireAuth> };
        },
      },
      {
        path: "submissions",
        lazy: async () => {
          const { Submissions } = await import("./pages/Submissions");
          return { Component: () => <RequireAuth><Submissions /></RequireAuth> };
        },
      },
      {
        path: "admin/login",
        lazy: async () => ({ Component: (await import("./pages/AdminLogin")).AdminLogin }),
      },
      {
        path: "admin",
        lazy: async () => {
          const { AdminDashboard } = await import("./pages/AdminDashboard");
          return { Component: () => <AdminDashboard initialTab="summary" /> };
        },
      },
      {
        path: "admin/dashboard",
        lazy: async () => {
          const { AdminDashboard } = await import("./pages/AdminDashboard");
          return { Component: () => <AdminDashboard initialTab="summary" /> };
        },
      },
      {
        path: "admin/contact",
        lazy: async () => {
          const { AdminDashboard } = await import("./pages/AdminDashboard");
          return { Component: () => <AdminDashboard initialTab="leads" /> };
        },
      },
      {
        path: "admin/hire",
        lazy: async () => {
          const { AdminDashboard } = await import("./pages/AdminDashboard");
          return { Component: () => <AdminDashboard initialTab="leads" /> };
        },
      },
      {
        path: "admin/orders",
        lazy: async () => {
          const { AdminDashboard } = await import("./pages/AdminDashboard");
          return { Component: () => <AdminDashboard initialTab="orders" /> };
        },
      },
      {
        path: "admin/pricing",
        lazy: async () => {
          const { AdminDashboard } = await import("./pages/AdminDashboard");
          return { Component: () => <AdminDashboard initialTab="pricing" /> };
        },
      },
      {
        path: "admin/leads",
        lazy: async () => {
          const { AdminDashboard } = await import("./pages/AdminDashboard");
          return { Component: () => <AdminDashboard initialTab="leads" /> };
        },
      },
      {
        path: "admin/submissions",
        lazy: async () => {
          const { AdminDashboard } = await import("./pages/AdminDashboard");
          return { Component: () => <AdminDashboard initialTab="submissions" /> };
        },
      },
      {
        path: "admin/careers",
        lazy: async () => ({ Component: (await import("./pages/AdminCareers")).AdminCareers }),
      },
      {
        path: "admin/content",
        lazy: async () => ({ Component: (await import("./pages/AdminContent")).AdminContent }),
      },
      {
        path: "admin/otp",
        lazy: async () => ({ Component: (await import("./pages/AdminOtp")).AdminOtp }),
      },
    ],
  },
]);
