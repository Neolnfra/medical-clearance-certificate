// 通过 CDN 按需加载 OCR / PDF 引擎，避免主包体积过大，并支持离线降级（失败可由用户手动粘贴文本）
function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = url
    s.onload = resolve
    s.onerror = () => reject(new Error('脚本加载失败：' + url))
    document.head.appendChild(s)
  })
}

export async function ocrImage(file, onProgress) {
  await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js')
  if (!window.Tesseract) throw new Error('OCR 引擎不可用')
  const { data } = await window.Tesseract.recognize(file, 'chi_sim+eng', {
    logger: m => { if (onProgress && m.status) onProgress(m) }
  })
  return data.text || ''
}

export async function pdfToText(file) {
  await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js')
  const lib = window.pdfjsLib
  if (!lib) throw new Error('PDF 解析引擎不可用')
  lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
  const buf = await file.arrayBuffer()
  const pdf = await lib.getDocument({ data: buf }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(it => it.str).join(' ') + '\n'
  }
  return text
}

export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsText(file)
  })
}
