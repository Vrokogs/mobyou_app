"use client";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070E1B] relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1A2D] via-[#070E1B] to-[#050A14]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[#C96B1D]/[0.04] rounded-full blur-[130px]" />
      <div className="relative z-10 w-full max-w-[400px]">
        {children}
      </div>
    </div>
  );
}
