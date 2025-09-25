// Enoshima_Kamakura_Tourism_App/app/api/search-spot/route.ts

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { spotName, area } = await request.json()

    if (!spotName || !area) {
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
江ノ島・鎌倉エリアの観光地「${spotName}」について、以下の情報をJSON形式で教えてください。
エリア: ${area === "enoshima" ? "江ノ島" : "鎌倉"}

以下のフォーマットで回答してください：
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
  "tips": ["おすすめポイントの配列"]
}

実在しない場合は null を返してください。
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
      // Extract JSON from the response - try multiple patterns
      let jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      let isArray = false
      
      // If no object match, try to find array
      if (!jsonMatch) {
        jsonMatch = generatedText.match(/\[[\s\S]*\]/)
        isArray = true
      }
      
      // If no match, try to find JSON between ```json and ``` or ``` and ```
      if (!jsonMatch) {
        jsonMatch = generatedText.match(/```(?:json)?\s*([\[\{][\s\S]*?[\]\}])\s*```/)
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1]
          isArray = jsonMatch[0].startsWith('[')
        }
      }
      
      // If still no match, try to find any JSON-like structure
      if (!jsonMatch) {
        jsonMatch = generatedText.match(/([\[\{][\s\S]*?[\]\}])/)
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1]
          isArray = jsonMatch[0].startsWith('[')
        }
      }

      if (!jsonMatch) {
        console.error("No JSON found in response:", generatedText)
        return NextResponse.json({ success: false, error: "Invalid JSON response" }, { status: 500 })
      }

      // Clean up the JSON string
      let jsonString = jsonMatch[0].trim()
      
      // Remove any trailing commas before closing braces/brackets
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1')
      
      const parsedData = JSON.parse(jsonString)

      // Handle array response (multiple spots)
      if (isArray && Array.isArray(parsedData)) {
        if (parsedData.length === 0) {
          return NextResponse.json({ success: false, error: "No spots found" }, { status: 404 })
        }
        // Return the first spot from the array
        return NextResponse.json({ success: true, spot: parsedData[0] })
      }

      // Handle single object response
      if (parsedData === null) {
        return NextResponse.json({ success: false, error: "Spot not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, spot: parsedData })
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError)
      console.error("Response text:", generatedText)
      return NextResponse.json({ success: false, error: "Failed to parse response" }, { status: 500 })
    }
  } catch (error) {
    console.error("Search spot API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}