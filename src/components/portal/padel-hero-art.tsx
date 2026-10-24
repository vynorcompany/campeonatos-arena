/** Lightweight vector artwork: glass court, perforated padel racket and ball. */
export function PadelHeroArt() {
  return <svg viewBox="0 0 440 350" fill="none" aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:top-0 tw:right-0 tw:h-full tw:w-[64%] tw:opacity-30 tw:min-[700px]:w-[56%] tw:min-[700px]:opacity-90">
    <path d="m137 46 246 64-54 230-263-62Z" fill="#25846a" fillOpacity=".3" stroke="#a8e1c2" strokeOpacity=".35"/>
    <path d="m160 72 196 50-44 186-207-50Zm-28 116 201 52m-98-149-45 190" stroke="#b8edce" strokeOpacity=".5" strokeWidth="2"/>
    <path d="m115 181 221 58m-223-58v-24m224 83v-24" stroke="#d7f2df" strokeOpacity=".65" strokeWidth="4"/>
    <g transform="translate(171 42) rotate(27 100 140)">
      <path d="M101 28C52 28 25 61 25 105c0 39 23 70 55 84l7 42h29l7-42c32-14 55-45 55-84 0-44-28-77-77-77Z" fill="#e6f2dd"/>
      <path d="M87 219h29v48a14.5 14.5 0 0 1-29 0Z" fill="#cdec83"/>
      <g fill="#155940">{[[75,76],[108,76],[59,108],[92,108],[125,108],[75,140],[108,140],[92,169]].map(([cx,cy])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9"/>)}</g>
    </g>
    <path d="M270 68c24-29 54-36 89-20" stroke="#d5ef93" strokeOpacity=".5" strokeWidth="2" strokeDasharray="4 7"/>
    <circle cx="362" cy="56" r="22" fill="#d4f475"/><path d="M348 40c13 6 21 16 22 32" stroke="#537524" strokeWidth="2.5"/>
  </svg>;
}
