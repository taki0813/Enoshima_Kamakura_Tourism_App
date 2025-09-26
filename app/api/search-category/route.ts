import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" 

export async function POST(request: NextRequest) {
  try {
    const { category, area, preferences } = await request.json()

    if (!category || !area) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY

    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not configured")
      return NextResponse.json({ 
        success: false, 
        error: "API key not configured. Please set GEMINI_API_KEY environment variable." 
      }, { status: 500 })
    }

    const prompt = `
江ノ島・鎌倉エリアで「${category}」に関連するおすすめスポットを3つ教えてください。
エリア: ${area === "enoshima" ? "江ノ島" : "鎌倉"}
${preferences ? `ユーザーの希望: ${preferences}` : ""}

以下のフォーマットで回答してください：
[
  {
    "name": "スポット名",
    "description": "100文字程度の説明",
    "category": "shrine/temple/nature/culture/food/shopping/activity のいずれか",
    "tags": ["関連するタグの配列"],
    "duration": 滞在時間（分）,
    "difficulty": "easy/moderate/hard のいずれか",
    "coordinates": {"lat": 緯度, "lng": 経度},
    "openHours": "営業時間",
    "entrance_fee": 入場料（円）,
    "tips": ["おすすめポイントの配列"],
    "reason": "なぜこのスポットがおすすめかの理由"
  }
]

実在しない場合は空の配列を返してください。
`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      return NextResponse.json({ success: false, error: "No response from Gemini API" }, { status: 500 })
    }

    try {
      // 正規表現を使ってJSON部分をより確実に抽出
      const jsonMatch = generatedText.match(/```json\s*([\s\S]*?)\s*```|\[[\s\S]*?\]/)
      
      if (!jsonMatch) {
        console.error("No JSON array found in response:", generatedText)
        return NextResponse.json({ success: false, error: "Invalid JSON response: No JSON array found" }, { status: 500 })
      }

      // 抽出した文字列をクリーンアップ
      let jsonString = jsonMatch[1] || jsonMatch[0]
      jsonString = jsonString.trim().replace(/,\s*([}\]])/g, '$1');

      const spots = JSON.parse(jsonString)

      if (!Array.isArray(spots)) {
        return NextResponse.json({ success: false, error: "Invalid response format: not an array" }, { status: 500 })
      }

      return NextResponse.json({ success: true, spots })
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError)
      console.error("Response text:", generatedText)
      return NextResponse.json({ success: false, error: "Failed to parse response" }, { status: 500 })
    }
  } catch (error) {
    console.error("Search category API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}