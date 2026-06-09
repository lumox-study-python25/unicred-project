import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";
import { Inter } from "next/font/google";

// Cấu hình phông chữ Inter chuẩn quốc tế & tiếng Việt
const inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  display: "swap", 
});

export const metadata: Metadata = {
  title: "UniCred | Chợ việc làm sinh viên Việt Nam",
  description: "Khám phá việc làm bán thời gian, nâng cao điểm uy tín và tín dụng số dành riêng cho sinh viên Việt Nam.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      {/* Đã bọc phông chữ Inter vào toàn bộ body và giữ nguyên lớp nền xám */}
      <body className={`${inter.className} min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 antialiased transition-colors duration-200`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}