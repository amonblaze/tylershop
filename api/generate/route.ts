import { NextResponse } from 'next/server';

// DeepSeek API proxy - API key sunucuda kalır
export async function POST(request: Request) {
  try {
    const { productName, category } = await request.json();

    if (!productName) {
      return NextResponse.json({ error: 'Ürün adı gerekli' }, { status: 400 });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Sen bir e-ticaret ürün açıklaması yazarısın. Profesyonel, SEO uyumlu, satış odaklı, 200-300 kelime, Türkçe. Her zaman maddeler halinde değil, akıcı paragraf formatında yaz.'
          },
          {
            role: 'user',
            content: `Kategori: ${category}\nÜrün: ${productName}\n\nBu ürün için profesyonel bir e-ticaret açıklaması yaz. Anahtar kelimeleri doğal bir şekilde metne yerleştir. Sonunda 3-5 etiket öner.`
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek API error:', err);
      return NextResponse.json({ error: 'API hatası' }, { status: 502 });
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || 'Açıklama üretilemedi.';

    return NextResponse.json({ description });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
