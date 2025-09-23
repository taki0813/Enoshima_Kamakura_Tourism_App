import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { whatToDo, area, preferences } = await request.json()

    if (!whatToDo) {
      return NextResponse.json({ success: false, error: "Missing whatToDo parameter" }, { status: 400 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY

    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not configured")
      return NextResponse.json({
        success: false,
        error: "API key not configured. Please set GEMINI_API_KEY environment variable.",
      }, { status: 500 })
    }

    const prompt = `
ユーザーの「やりたいこと」を分析して、江ノ島・鎌倉エリアの観光スポットを3つ、JSON配列形式で提案してください。

ユーザーのやりたいこと: ${whatToDo}
エリア: ${area === "enoshima" ? "江ノ島" : area === "kamakura" ? "鎌倉" : "江ノ島・鎌倉"}
ユーザーの好み: ${preferences || "特に指定なし"}

以下のフォーマットで回答してください：
[
  {
    "name": "正式名称",
    "description": "100文字程度の説明",
    "category": "shrine/temple/nature/culture/food/shopping/activity のいずれか",
    "tags": ["関連するタグの配列"],
    "duration": 滞在時間（分）,
    "difficulty": "easy/moderate/hard のいずれか",
    "coordinates": {"lat": 緯度, "lng": 経度},
    "openHours": "営業時間",
    "entrance_fee": 入場料（円）,
    "tips": ["おすすめポイントの配列"],
    "reason": "このスポットがユーザーのやりたいことに合う理由（30文字程度）"
  },
  // ... 2 more spots
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
        signal: AbortSignal.timeout(30000), // 30秒のタイムアウト
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
      // Extract JSON from the response
      let jsonMatch = generatedText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        jsonMatch = generatedText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1]
        }
      }
      if (!jsonMatch) {
        console.error("No JSON array found in response:", generatedText)
        return NextResponse.json({ success: false, error: "Invalid JSON array response" }, { status: 500 })
      }

      let jsonString = jsonMatch[0].trim()
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1')

      const spotsData = JSON.parse(jsonString)

      if (!Array.isArray(spotsData)) {
        return NextResponse.json({ success: false, error: "Expected JSON array but got object" }, { status: 500 })
      }

      return NextResponse.json({ success: true, spots: spotsData })
    } catch (parseError) {
      console.error("Failed to parse Gemini response for what-to-do:", parseError)
      console.error("Response text:", generatedText)
      return NextResponse.json({ success: false, error: "Failed to parse response" }, { status: 500 })
    }
  } catch (error) {
    console.error("Process what-to-do API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}



