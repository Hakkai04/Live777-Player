import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    { 'btn-primary': 'py-2 px-4 bg-blue-500 duration-300 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:pointer-events-none disabled:bg-gray-500 disabled:opacity-60' },
    { 'btn-icon': 'p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200' },
    { 'btn-danger': 'py-2 px-4 bg-red-500 duration-300 text-white font-bold rounded-lg shadow-md hover:bg-red-600 focus:outline-none' },
    { 'panel': 'bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl' },
    { 'stat-card': 'bg-gray-800/60 rounded-lg p-3 border border-gray-700/30' }
  ],
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle'
      }
    })
  ]
})
