import { z } from 'zod'
const texto = (m) => z.string().trim().min(1, 'Campo obrigatório.').max(m)
const preco = z.number({ invalid_type_error: 'Informe um valor.' }).positive('O valor deve ser maior que zero.').max(99999999.99)
console.log(texto(20).safeParse('A'.repeat(21)).error.issues[0].message)
console.log(texto(160).safeParse('A'.repeat(161)).error.issues[0].message)
console.log(preco.safeParse(1e9).error.issues[0].message)
console.log(z.string().trim().min(1,'Informe o e-mail.').max(160).email('E-mail inválido.').safeParse('abc').error.issues[0].message)
