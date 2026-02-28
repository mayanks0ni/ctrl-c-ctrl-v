import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Sidebar from "@/components/navigation/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brightly",
  description: "Personalized short-form learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-black text-white antialiased`}
      >
        <AuthProvider>
          <div className="relative flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
