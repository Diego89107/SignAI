import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin que elimina del código fuente de three.js la línea que emite el aviso
// `THREE.Clock: This module has been deprecated.` El warning lo dispara
// @react-three/fiber v8 al instanciar internamente `new THREE.Clock()`. Como
// no podemos reasignar la clase (el namespace de un módulo ES es inmutable),
// la modificamos directamente en el código que Vite sirve.
function removeThreeClockDeprecation() {
  return {
    name: 'remove-three-clock-deprecation',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('three')) return null
      if (!code.includes('THREE.Clock: This module has been deprecated')) return null
      return code.replace(
        /console\.warn\(\s*['"`]THREE\.Clock: This module has been deprecated[^'"`]*['"`]\s*\)\s*;?/g,
        ''
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), removeThreeClockDeprecation()],
  base: './',
})
