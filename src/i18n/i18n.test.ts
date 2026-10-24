import { describe, expect, it } from 'vitest'
import ar from './ar'
import fr from './fr'
import { translate, translatePlural } from './translate'

function leaves(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out[path] = v
    else Object.assign(out, leaves(v, path))
  }
  return out
}

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('dictionaries', () => {
  const { plurals: _frPlurals, ...frRest } = fr
  const { plurals: _arPlurals, ...arRest } = ar
  void _frPlurals
  void _arPlurals
  const frLeaves = leaves(frRest)
  const arLeaves = leaves(arRest)

  it('Arabic has exactly the French keys', () => {
    expect(Object.keys(arLeaves).sort()).toEqual(Object.keys(frLeaves).sort())
  })

  it('no empty strings and same interpolation variables', () => {
    for (const [key, value] of Object.entries(frLeaves)) {
      expect(value.trim(), key).not.toBe('')
      expect(arLeaves[key].trim(), key).not.toBe('')
      expect(vars(arLeaves[key]), key).toEqual(vars(value))
    }
  })

  it('every plural set has an `other` form in both languages', () => {
    for (const key of Object.keys(fr.plurals) as (keyof typeof fr.plurals)[]) {
      expect(fr.plurals[key].other).toBeTruthy()
      expect(ar.plurals[key].other).toBeTruthy()
    }
  })
})

describe('translate', () => {
  it('interpolates variables', () => {
    expect(translate('fr', 'home.greeting', { name: 'Amine' })).toBe('Bonjour Amine')
    expect(translate('ar', 'home.greeting', { name: 'Amine' })).toBe('مرحباً \u2068Amine\u2069')
  })

  it('selects plural forms per locale', () => {
    expect(translatePlural('fr', 'rooms', 1)).toBe('1 pièce')
    expect(translatePlural('fr', 'rooms', 3)).toBe('3 pièces')
    expect(translatePlural('fr', 'activeReports', 0)).toBe('Aucun signalement actif')
    expect(translatePlural('ar', 'rooms', 2)).toBe('غرفتان')
    expect(translatePlural('ar', 'rooms', 3)).toBe('3 غرف')
    expect(translatePlural('ar', 'rooms', 11)).toBe('11 غرفة')
  })

  it('returns the key for unknown entries', () => {
    expect(translate('fr', 'does.not.exist')).toBe('does.not.exist')
  })
})
