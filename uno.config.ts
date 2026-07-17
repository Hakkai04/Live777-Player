import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    { 'btn-primary': 'py-2 px-4 bg-blue-500 duration-300 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:pointer-events-none disabled:bg-gray-700 disabled:text-white/40' },
    { 'btn-icon': 'p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-200' },
    { 'btn-danger': 'py-2 px-4 bg-red-500 duration-300 text-white font-bold rounded-lg shadow-md hover:bg-red-600 focus:outline-none' },
    { 'panel': 'bg-gray-900/90 backdrop-blur-sm border border-gray-600/30 rounded-xl' },
    { 'stat-card': 'bg-gray-800/70 rounded-lg p-3 border border-gray-600/25' },
    { 'input-field': 'px-3 py-2.5 bg-gray-900/90 border border-gray-600/40 rounded-lg text-white/90 text-sm outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-colors disabled:opacity-40' },
    { 'select-field': 'px-3 py-2.5 bg-gray-900/90 border border-gray-600/40 rounded-lg text-white/90 text-sm outline-none focus:border-blue-500/60 appearance-none cursor-pointer disabled:opacity-40' },
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
