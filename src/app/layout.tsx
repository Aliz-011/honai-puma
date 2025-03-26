import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/autoplay";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { QueryProvider } from "@/providers/query-client-provider";
import { Toaster } from "sonner";

const outfit = Outfit({
  variable: "--font-outfit-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ['latin']
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <QueryProvider>
              <Toaster position="top-right" richColors />
              {children}
            </QueryProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
