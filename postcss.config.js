import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const inputCache = new Map()

function inputForFile(from) {
  if (!inputCache.has(from)) {
    inputCache.set(from, postcss.parse('a{}', { from }).source.input)
  }
  return inputCache.get(from)
}

/**
 * Tailwind (p. ej. variantes before/after) a veces añade declaraciones sin `source`.
 * Debe ejecutarse en `Once` (no `OnceExit`): el plugin de URLs de Vite 8 corre en `Once`.
 */
function postcssFillDeclarationSource() {
  return {
    postcssPlugin: 'postcss-fill-declaration-source',
    Once(root, { result }) {
      const from = result.opts.from
      if (!from) return

      const fallbackInput = inputForFile(from)

      root.walkDecls((decl) => {
        if (decl.source?.input?.file) return

        let node = decl.parent
        while (node) {
          if (node.source?.input?.file) {
            decl.source = node.source
            return
          }
          node = node.parent
        }

        decl.source = {
          input: fallbackInput,
          start: decl.source?.start ?? { line: 1, column: 1 },
          end: decl.source?.end ?? { line: 1, column: 1 },
        }
      })
    },
  }
}
postcssFillDeclarationSource.postcss = true

export default {
  plugins: [tailwindcss(), autoprefixer(), postcssFillDeclarationSource()],
}
