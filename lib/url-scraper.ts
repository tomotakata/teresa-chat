import * as cheerio from 'cheerio'

export interface ScrapedContent {
  title: string
  description: string
  text: string
  images: { src: string; alt: string }[]
  url: string
}

const BLOCKED_TAGS = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']

export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TeresaBot/1.0; +https://teresa.ai)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // タイトル取得
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text() ||
    url

  // 説明取得
  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    ''

  // 不要タグ削除
  BLOCKED_TAGS.forEach(tag => $(tag).remove())
  $('[aria-hidden="true"]').remove()

  // 画像情報取得（alt付きのもの優先）
  const images: { src: string; alt: string }[] = []
  $('img').each((_, el) => {
    const alt = $(el).attr('alt')?.trim() || ''
    const src = $(el).attr('src') || $(el).attr('data-src') || ''
    if (alt && src) {
      const absoluteSrc = src.startsWith('http') ? src : new URL(src, url).href
      images.push({ src: absoluteSrc, alt })
    }
  })

  // メインコンテンツ抽出（優先順）
  const mainSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.post', '.entry', 'body']
  let mainEl = null
  for (const sel of mainSelectors) {
    if ($(sel).length > 0) {
      mainEl = $(sel).first()
      break
    }
  }

  const rawText = mainEl ? mainEl.text() : $('body').text()

  // テキスト整形
  const text = rawText
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 画像のalt情報もテキストに付加
  const imageText = images.length > 0
    ? '\n\n【画像情報】\n' + images.map(img => `・${img.alt}`).join('\n')
    : ''

  return {
    title: title.trim(),
    description: description.trim(),
    text: text + imageText,
    images,
    url,
  }
}

// 複数URLを一括スクレイピング
export async function scrapeUrls(urls: string[]): Promise<ScrapedContent[]> {
  const results = await Promise.allSettled(urls.map(url => scrapeUrl(url)))
  return results
    .filter((r): r is PromiseFulfilledResult<ScrapedContent> => r.status === 'fulfilled')
    .map(r => r.value)
}
