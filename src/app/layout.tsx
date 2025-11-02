// app/layout.tsx
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Import our new SidebarNav component ---
import SidebarNav from "../components/SidebarNav";

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

        <div className="flex h-screen bg-gray-100">
          {/* ----- Dark Sidebar Navigation (UPDATED) ----- */}
          <div className="w-64 bg-gray-900 text-white flex flex-col">
            <div className="p-6 text-2xl font-bold">OneFaith</div>
            {/* --- RENDER THE NEW COMPONENT --- */}
            <SidebarNav />
          </div>

          {/* ----- Main Content Area ----- */}
          <main className="flex-1 h-screen overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
