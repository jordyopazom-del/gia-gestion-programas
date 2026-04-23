import "./globals.css";

export const metadata = {
  title: 'GIA Health Systems | Dashboard',
  description: 'Gestión Clínica Inteligente',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
