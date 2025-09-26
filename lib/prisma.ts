import { PrismaClient } from "@prisma/client"

// PrismaClientの新しいインスタンスを返す関数
const prismaClientSingleton = () => {
  return new PrismaClient()
}

// グローバルオブジェクトに`prisma`プロパティが存在することを宣言
declare global {
  // @ts-ignore
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// グローバルオブジェクトの`prisma`が存在すればそれを使用し、なければ新しいインスタンスを作成
const prisma = globalThis.prisma ?? prismaClientSingleton()

// 開発環境以外では、グローバルにインスタンスを設定しない
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma

// 名前付きエクスポートとして、prismaインスタンスを提供
// これがAPIルートで期待されている形式です
export { prisma };