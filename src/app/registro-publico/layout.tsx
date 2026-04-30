export default function RegistroPublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ek-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-ek-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
            EK
          </div>
          <span className="font-bold text-ek-500 text-lg tracking-wide">EASY KONTROL</span>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
