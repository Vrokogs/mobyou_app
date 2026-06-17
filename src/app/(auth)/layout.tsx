"use client";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020609] relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050d17] via-[#020609] to-[#030810]" />

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4731A]/[0.03] rounded-full blur-[150px]" />

      <div className="relative z-10 w-full max-w-[400px]">
        {children}
      </div>
    </div>
  );
}
