import { Montserrat } from 'next/font/google'
import { CascaApp } from '../components/casca-app'
import { ProvedorEstoque } from '../components/provedor-estoque'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
})

export const metadata = {
  title: 'StockMind',
  description: 'Sistema inteligente de controle de estoque para pequenos comércios.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={montserrat.variable}>
      <body className="bg-slate-100">
        <ProvedorEstoque>
          <CascaApp>{children}</CascaApp>
        </ProvedorEstoque>
      </body>
    </html>
  )
}
