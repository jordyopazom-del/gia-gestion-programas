import "./globals.css";

export const metadata = {
  title: 'GIA Belarmina | Gestión Integral APS',
  description: 'Sistema de Gestión de Programas de Salud - Futrono',
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
