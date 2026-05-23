import { useEffect } from 'react';
import { createAudioBuses, playMusic, stopMusic } from './buses';

/**
 * Title-screen music (M_AUDIO.3). Mounts an isolated AudioBuses instance and
 * plays the menu loop while the title is on-screen; stops on unmount so the
 * gameplay loop (started by `useAudio` inside the Canvas) plays alone.
 *
 * The buses are independent from the in-game `useAudio` buses — howler
 * manages globally-muted state via `Howler.mute()` so the SoundToggle still
 * silences both.
 */
export function useTitleMusic(): void {
  useEffect(() => {
    const buses = createAudioBuses();
    playMusic(buses, 'audio.music.menu');
    return () => {
      // stop the menu loop when the title unmounts (entering gameplay)
      stopMusic();
      // M_SEC.27 — unload every Howl in the title-bus cache so the
      // WebAudio buffers don't linger across the title → gameplay
      // transition (the gameplay buses are a separate instance, so
      // the title cache would otherwise stay alive forever).
      for (const bus of Object.values(buses)) {
        for (const howl of bus.cache.values()) howl.unload();
        bus.cache.clear();
      }
    };
  }, []);
}
