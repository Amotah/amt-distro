import './styles/globals.css'

export const metadata = {
  title: 'AMT Distro',
  description: 'Music distribution platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  )
}
