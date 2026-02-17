import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";

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
        lazy: async () => ({ Component: (await import("./pages/Contact")).Contact }),
      },
      {
        path: "hire-us",
        lazy: async () => ({ Component: (await import("./pages/HireUs")).HireUs }),
      },
      {
        path: "careers",
        lazy: async () => ({ Component: (await import("./pages/Careers")).Careers }),
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
        path: "admin/login",
        lazy: async () => ({ Component: (await import("./pages/AdminLogin")).AdminLogin }),
      },
      {
        path: "admin",
        lazy: async () => ({ Component: (await import("./pages/AdminDashboard")).AdminDashboard }),
      },
    ],
  },
]);
