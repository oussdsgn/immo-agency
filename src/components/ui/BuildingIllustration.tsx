import { useId, type ReactElement } from 'react'
import { cn } from '@/lib/cn'
import type { BuildingVisual } from '@/types'

/**
 * Generated façade illustration used in place of property photos. Real photos
 * from the agency can replace it later without touching the layouts.
 */
const PALETTES: Record<BuildingVisual['palette'], { sky: [string, string]; wall: string; shade: string; win: string; accent: string; ground: string; leaf: string }> = {
  sand: { sky: ['#fbe9da', '#fdf6ee'], wall: '#efdcc3', shade: '#e0c7a6', win: '#7d93a6', accent: '#e2622b', ground: '#e8dccb', leaf: '#8aa66b' },
  terracotta: { sky: ['#f8e1d4', '#fdf3ec'], wall: '#e3a98a', shade: '#cf8d6c', win: '#6f8597', accent: '#f4efe6', ground: '#ead9c8', leaf: '#7f9b5f' },
  stone: { sky: ['#e7ecef', '#f7f5f1'], wall: '#f3efe8', shade: '#dcd4c8', win: '#73899c', accent: '#b98b5e', ground: '#e3dacd', leaf: '#6f9461' },
  olive: { sky: ['#eaefdf', '#f8f7f0'], wall: '#f1eadf', shade: '#d9cdb9', win: '#71879a', accent: '#8b9a5b', ground: '#dfe3cc', leaf: '#6c8f4e' },
  sky: { sky: ['#dfeaf5', '#f5f8fb'], wall: '#e9e6e1', shade: '#d2cdc5', win: '#5d7a92', accent: '#e2622b', ground: '#dfe2e4', leaf: '#76956a' },
}

export function BuildingIllustration({ visual, className, label }: { visual: BuildingVisual; className?: string; label?: string }) {
  const p = PALETTES[visual.palette]
  const gid = useId().replace(/:/g, '')
  const W = 400
  const H = 240
  const groundY = 214

  let building: ReactElement
  if (visual.style === 'tower') building = <Tower p={p} floors={Math.max(6, visual.floors)} groundY={groundY} />
  else if (visual.style === 'villa') building = <Villa p={p} groundY={groundY} />
  else if (visual.style === 'terrace') building = <Terrace p={p} floors={Math.max(2, visual.floors)} groundY={groundY} />
  else building = <Block p={p} floors={Math.max(3, visual.floors)} groundY={groundY} />

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn('block h-full w-full', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`sky-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky-${gid})`} />
      <circle cx="322" cy="58" r="22" fill="#fff" opacity="0.7" />
      <path d="M40 70c10-8 26-8 34 0 6-5 18-4 22 3H34c0-1 2-2 6-3Z" fill="#fff" opacity="0.65" />
      {building}
      <Tree x={58} y={groundY} p={p} scale={1} />
      <Tree x={352} y={groundY} p={p} scale={0.8} />
      <rect y={groundY} width={W} height={H - groundY} fill={p.ground} />
      <rect y={groundY} width={W} height="3" fill={p.shade} opacity="0.6" />
    </svg>
  )
}

type P = (typeof PALETTES)['sand']

function Windows({ x, y, cols, rows, w, h, gx, gy, p, balcony }: { x: number; y: number; cols: number; rows: number; w: number; h: number; gx: number; gy: number; p: P; balcony?: boolean }) {
  const out: ReactElement[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const wx = x + c * (w + gx)
      const wy = y + r * (h + gy)
      out.push(
        <g key={`${r}-${c}`}>
          <rect x={wx} y={wy} width={w} height={h} rx="2" fill={p.win} opacity={0.78 + ((r * 3 + c) % 3) * 0.07} />
          <rect x={wx + 2} y={wy + 2} width={w / 2 - 3} height={h - 4} rx="1" fill="#fff" opacity="0.14" />
          {balcony && <rect x={wx - 3} y={wy + h - 2} width={w + 6} height="5" rx="1" fill={p.shade} />}
        </g>,
      )
    }
  return <>{out}</>
}

function Block({ p, floors, groundY }: { p: P; floors: number; groundY: number }) {
  const fh = Math.min(30, 150 / floors)
  const h = floors * fh + 18
  const x = 110
  const w = 180
  const top = groundY - h
  return (
    <g>
      <rect x={x - 6} y={top - 6} width={w + 12} height="8" rx="2" fill={p.shade} />
      <rect x={x} y={top} width={w} height={h} fill={p.wall} />
      <rect x={x + w - 26} y={top} width="26" height={h} fill={p.shade} opacity="0.55" />
      <Windows x={x + 16} y={top + 12} cols={4} rows={floors - 1} w={26} h={fh - 12} gx={14} gy={12} p={p} balcony />
      <rect x={x + 70} y={groundY - 32} width="40" height="32" rx="3" fill={p.accent} />
      <rect x={x + 76} y={groundY - 26} width="28" height="26" rx="2" fill={p.win} opacity="0.85" />
    </g>
  )
}

function Tower({ p, floors, groundY }: { p: P; floors: number; groundY: number }) {
  const fh = Math.min(22, 175 / floors)
  const h = floors * fh + 14
  const x = 150
  const w = 100
  const top = groundY - h
  return (
    <g>
      <rect x={x + 30} y={top - 12} width="40" height="12" fill={p.shade} />
      <rect x={x} y={top} width={w} height={h} fill={p.wall} />
      <rect x={x + w - 18} y={top} width="18" height={h} fill={p.shade} opacity="0.6" />
      <Windows x={x + 12} y={top + 10} cols={3} rows={floors - 1} w={18} h={fh - 9} gx={10} gy={9} p={p} />
      <rect x={x + 36} y={groundY - 24} width="28" height="24" rx="2" fill={p.accent} />
      <rect x={x - 60} y={groundY - 70} width="56" height="70" fill={p.shade} opacity="0.5" />
      <Windows x={x - 52} y={groundY - 60} cols={2} rows={3} w={16} h={12} gx={8} gy={8} p={p} />
    </g>
  )
}

function Villa({ p, groundY }: { p: P; groundY: number }) {
  return (
    <g>
      <rect x="96" y={groundY - 46} width="208" height="46" fill={p.wall} />
      <rect x="140" y={groundY - 96} width="124" height="52" fill={p.wall} />
      <rect x="136" y={groundY - 100} width="132" height="6" rx="2" fill={p.shade} />
      <rect x="92" y={groundY - 50} width="216" height="6" rx="2" fill={p.shade} />
      <Windows x={156} y={groundY - 84} cols={3} rows={1} w={26} h={30} gx={12} gy={0} p={p} />
      <Windows x={112} y={groundY - 36} cols={2} rows={1} w={30} h={24} gx={12} gy={0} p={p} />
      <rect x="236" y={groundY - 38} width="30" height="38" rx="3" fill={p.accent} />
      <rect x="276" y={groundY - 36} width="18" height="24" rx="2" fill={p.win} opacity="0.85" />
      <rect x="40" y={groundY - 16} width="320" height="16" fill={p.shade} opacity="0.7" />
    </g>
  )
}

function Terrace({ p, floors, groundY }: { p: P; floors: number; groundY: number }) {
  const fh = 44
  const blocks: ReactElement[] = []
  for (let i = 0; i < floors; i++) {
    const w = 220 - i * 46
    const x = 90 + i * 14
    const y = groundY - (i + 1) * fh
    blocks.push(
      <g key={i}>
        <rect x={x} y={y} width={w} height={fh} fill={p.wall} />
        <rect x={x + w - 20} y={y} width="20" height={fh} fill={p.shade} opacity="0.5" />
        <rect x={x - 4} y={y - 4} width={w + 8} height="5" rx="2" fill={p.shade} />
        <Windows x={x + 14} y={y + 10} cols={Math.max(2, Math.floor((w - 30) / 40))} rows={1} w={26} h={fh - 18} gx={14} gy={0} p={p} />
        {i > 0 && <circle cx={x + w + 12} cy={y + fh - 8} r="8" fill={p.leaf} opacity="0.85" />}
      </g>,
    )
  }
  return <g>{blocks}</g>
}

function Tree({ x, y, p, scale }: { x: number; y: number; p: P; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-2.5" y="-30" width="5" height="30" rx="2" fill="#9b7b5c" />
      <circle cx="0" cy="-44" r="20" fill={p.leaf} />
      <circle cx="-11" cy="-34" r="12" fill={p.leaf} opacity="0.85" />
      <circle cx="12" cy="-36" r="13" fill={p.leaf} opacity="0.9" />
    </g>
  )
}
