const STORAGE_KEY = 'wheel_items'

export const MIN_COUNT = 3
export const MAX_COUNT = 12

export const DEFAULT_ITEMS = [
  '火锅',
  '川菜',
  '日料',
  '西式快餐',
  '面食',
  '饺子',
  '麻辣烫',
  '家常炒菜',
]

export function loadItems() {
  const saved = uni.getStorageSync(STORAGE_KEY)
  if (Array.isArray(saved) && saved.length >= MIN_COUNT) {
    return saved
  }
  return [...DEFAULT_ITEMS]
}

export function saveItems(items) {
  uni.setStorageSync(STORAGE_KEY, items)
}
