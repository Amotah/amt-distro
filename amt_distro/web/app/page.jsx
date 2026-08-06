export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-teal-500 to-cyan-400 p-16 text-white">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Distribute your music. Reach the world.</h1>
              <p className="mt-4 text-lg opacity-95">Fast, transparent distribution built for artists and labels — payments, metadata, royalty tracking and more.</p>
              <div className="mt-6 flex gap-4">
                <a href="#get-started" className="inline-block bg-white text-indigo-700 font-semibold px-6 py-3 rounded-lg shadow">Get Started</a>
                <a href="#learn-more" className="inline-block text-white/90 px-6 py-3 rounded-lg border border-white/30">Learn more</a>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm shadow-lg">
                <img src="/illustration-hero.png" alt="Hero" className="w-full h-56 object-cover rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-800">Why artists choose AMT</h2>
          <p className="mt-2 text-slate-600">Tools that focus on speed, clarity, and fair payouts.</p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-xl shadow">
              <h3 className="font-semibold text-lg">Fast Distribution</h3>
              <p className="mt-2 text-slate-600">Release to all major platforms in minutes, with clear delivery status.</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow">
              <h3 className="font-semibold text-lg">Transparent Fees</h3>
              <p className="mt-2 text-slate-600">No hidden charges — see exactly what you pay and why.</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow">
              <h3 className="font-semibold text-lg">Royalty Reporting</h3>
              <p className="mt-2 text-slate-600">Accurate per-stream accounting and scheduled payouts.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="text-slate-700">© {new Date().getFullYear()} AMT Distro</div>
          <div className="flex gap-4 text-slate-600">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
