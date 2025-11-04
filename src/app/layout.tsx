// app/layout.tsx
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Import our new SidebarNav component ---
import AppShell from "../components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OneFaith POS",
  description: "POS System for OneFaith",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
