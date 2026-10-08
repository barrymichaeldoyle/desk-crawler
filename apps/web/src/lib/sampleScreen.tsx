import { paintedSceneUri } from '@trmnl-games/desk-crawler/art/sceneColour'
import { scenePath } from '@trmnl-games/desk-crawler/art/sceneKey'
import { BIOME_BANDS } from './palette'
import { Hearts } from '../routes/app/desk-crawler/-gameScreen'

/** The sample fight, painted like the hero page's scene (D96). */
const SAMPLE_SCENE = paintedSceneUri(scenePath('server_room', 'fight', { kind: 'monster', id: 'cable_serpent', elite: false }, 5))!

/**
 * The public sample of a game screen: the device's fight scene painted in colour under
 * a small HUD, in the companion's style. A fictional hero; it never creates one.
 */
export function SampleScreen({ className = '' }: { className?: string }) {
  const bands = BIOME_BANDS.server_room!
  return (
    <div className={`relative overflow-hidden border-4 border-night ${className}`}>
      <div aria-hidden="true" className="absolute inset-0 grid grid-rows-[18%_14%_40%_28%]">
        {bands.map((colour, i) => <div key={i} style={{ background: colour }} />)}
      </div>
      <img src={SAMPLE_SCENE} alt="Pip the office warrior squares up to a Cable Serpent in the Server Room" width={760} height={200} className="relative block w-full pt-14 [image-rendering:pixelated] sm:pt-16" />
      <div className="absolute top-2 left-2 flex items-center gap-2 border-[3px] border-night bg-night/85 px-2.5 py-1.5 label-px sm:top-3 sm:left-3">
        <span>Pip <span className="text-gold-ink">Lv5</span></span>
        <Hearts hp={118} maxHp={148} />
      </div>
      <p className="absolute top-2 right-2 border-[3px] border-night bg-night/85 px-2.5 py-1.5 label-px text-gold-ink sm:top-3 sm:right-3">640 gold</p>
    </div>
  )
}
