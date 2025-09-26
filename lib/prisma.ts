import { PrismaClient } from "@prisma/client"

// PrismaClientの新しいインスタンスを返す関数
const prismaClientSingleton = () => {
  return new PrismaClient()
}

// グローバルオブジェクトに`prisma`プロパティが存在することを宣言
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// グローバルオブジェクトの`prisma`が存在すればそれを使用し、なければ新しいインスタンスを作成
const prisma = globalThis.prisma ?? prismaClientSingleton()

// 本来のexport default prisma; の代わりに、名前付きエクスポートに変更
// これにより、`import { prisma } from '@/lib/prisma'` が機能する
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma

export { prisma };