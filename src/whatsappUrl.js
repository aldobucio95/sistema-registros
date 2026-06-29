/**
 * Enlaces oficiales de Click-to-Chat de WhatsApp.
 *
 * Usamos `https://api.whatsapp.com/send` (endpoint canónico documentado por WhatsApp) en vez de `wa.me`
 * porque `wa.me` introduce un redirect intermedio que en algunos navegadores/escritorios reinterpreta los
 * bytes percent-encoded como Latin-1 antes de pasarlos a la app, rompiendo los emojis (U+FFFD `\u{FFFD}`).
 *
 * Codificamos con `encodeURIComponent` (espacios = `%20`) en vez de `URLSearchParams` (espacios = `+`):
 * algunos clientes de WhatsApp tratan `+` como literal y la decodificación posterior puede dañar la
 * secuencia UTF-8 de un emoji que esté pegado a un espacio.
 *
 * Saneamos sustitutos UTF-16 huérfanos para garantizar UTF-8 bien formado al percent-encode.
 */

function stripIllFormedUtf16Units(str) {
  const s = String(str ?? '');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += s.slice(i, i + 2);
        i += 1;
      }
    } else if (c < 0xdc00 || c > 0xdfff) {
      out += s[i];
    }
  }
  return out;
}

function normalizePhoneDigits(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

function prepareMessageBody(messageText) {
  const raw = String(messageText ?? '');
  const base = typeof raw.normalize === 'function' ? raw.normalize('NFC') : raw;
  return stripIllFormedUtf16Units(base);
}

/**
 * URL Click-to-Chat (api.whatsapp.com/send). Es la que devolvemos por defecto.
 * @param {string} phoneDigits Solo dígitos internacionales (sin `+`).
 * @param {string} [messageText]
 */
export function buildWhatsAppMeUrl(phoneDigits, messageText) {
  const phone = normalizePhoneDigits(phoneDigits);
  const safe = prepareMessageBody(messageText);
  const params = [];
  if (phone) params.push(`phone=${phone}`);
  if (safe.length > 0) params.push(`text=${encodeURIComponent(safe)}`);
  const qs = params.join('&');
  return qs ? `https://api.whatsapp.com/send?${qs}` : 'https://api.whatsapp.com/send';
}

/**
 * URL alternativa por dominio `wa.me` (algunas integraciones móviles solo abren este host).
 * Misma codificación segura para emojis.
 */
export function buildWhatsAppMeShortUrl(phoneDigits, messageText) {
  const phone = normalizePhoneDigits(phoneDigits);
  const safe = prepareMessageBody(messageText);
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return safe.length > 0 ? `${base}?text=${encodeURIComponent(safe)}` : base;
}
