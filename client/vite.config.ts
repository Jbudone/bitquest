import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: ['..']
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: 'index.html',
        tools: 'tools.html',
        animator: 'animator.html',
        vfx: 'vfx.html',
        save_state: 'save-state.html',
        render_map: 'render_map.html',
        level_editor: 'level-editor.html',
        quest_graph: 'quest-graph.html',
        cutscene_sequencer: 'cutscene-sequencer.html',
        npc_schedules: 'npc-schedules.html',
        dungeon_generator: 'dungeon-generator.html',
        soundboard: 'soundboard.html',
        atmosphere: 'atmosphere.html'
      }
    }
  }
});
