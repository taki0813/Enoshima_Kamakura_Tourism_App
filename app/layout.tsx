import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
// 作成したSessionProviderWrapperをインポート
import SessionProviderWrapper from "@/components/session-provider-wrapper"

export const metadata: Metadata = {
  title: "江ノ島・鎌倉観光ガイド",
  description: "江ノ島・鎌倉エリアの観光プランを診断結果に基づいて提案するWebアプリ",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* SessionProviderWrapperでアプリケーション全体をラップ */}
        <SessionProviderWrapper>
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        </SessionProviderWrapper>
        <Analytics />
      </body>
    </html>
  )
}