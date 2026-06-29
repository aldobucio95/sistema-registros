/**
 * Genera `public/pwa-icon-512.png`: logo VNPM en lienzo 512×512, proporción conservada (letterbox).
 * Fuente: Wikimedia Commons — https://commons.wikimedia.org/wiki/File:Vida_Nueva_para_el_Mundo.png
 * Licencia: CC BY-SA 4.0 (atribución al subir derivados a sitios públicos si aplica).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outPath = path.join(root, 'public', 'pwa-icon-512.png')

const COMMONS_LOGO =
  'https://upload.wikimedia.org/wikipedia/commons/9/94/Vida_Nueva_para_el_Mundo.png'

async function main() {
  const res = await fetch(COMMONS_LOGO, { redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar logo`)
  const buf = Buffer.from(await res.arrayBuffer())

  const resized = await sharp(buf)
    .resize(512, 512, {
      fit: 'contain',
      position: 'centre',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer()

  fs.writeFileSync(outPath, resized)
  const meta = await sharp(resized).metadata()
  console.log(`[generate-pwa-icon] escrito ${outPath} (${meta.width}×${meta.height})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
