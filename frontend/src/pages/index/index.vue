<script setup>
import { computed, ref } from 'vue'
import { DEFAULT_ITEMS, MAX_COUNT, MIN_COUNT, loadItems, saveItems } from '@/utils/categories'

const SECTOR_COLORS = [
  '#FAC775',
  '#F5C4B3',
  '#B5D4F4',
  '#C0DD97',
  '#CECBF6',
  '#F4C0D1',
  '#9FE1CB',
  '#E6C9A8',
]

const SPIN_MS = 3500

const items = ref(loadItems())
const rotation = ref(0)
const spinning = ref(false)
const result = ref('')
const showResult = ref(false)
const showManager = ref(false)
const newName = ref('')

const step = computed(() => 360 / Math.max(items.value.length, 1))

const wheelBackground = computed(() => {
  const stops = items.value.map((item, index) => {
    const from = index * step.value
    const to = from + step.value
    return `${SECTOR_COLORS[index % SECTOR_COLORS.length]} ${from}deg ${to}deg`
  })
  return `conic-gradient(from 0deg, ${stops.join(', ')})`
})

function labelStyle(index) {
  const angle = index * step.value + step.value / 2
  return {
    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-210rpx)`,
  }
}

function spin() {
  if (spinning.value) return
  if (items.value.length < MIN_COUNT) {
    uni.showToast({ title: `至少需要 ${MIN_COUNT} 个品类`, icon: 'none' })
    return
  }

  spinning.value = true
  showResult.value = false

  const hitIndex = Math.floor(Math.random() * items.value.length)
  const target = (360 - (hitIndex * step.value + step.value / 2) + 360) % 360
  const current = ((rotation.value % 360) + 360) % 360
  const delta = (target - current + 360) % 360
  rotation.value += 360 * 4 + delta

  setTimeout(() => {
    spinning.value = false
    result.value = items.value[hitIndex]
    showResult.value = true
    uni.vibrateShort({ fail: () => {} })
  }, SPIN_MS)
}

function addItem() {
  const name = newName.value.trim()
  if (!name) return
  if (items.value.includes(name)) {
    uni.showToast({ title: '已经有这个品类了', icon: 'none' })
    return
  }
  if (items.value.length >= MAX_COUNT) {
    uni.showToast({ title: `最多 ${MAX_COUNT} 个品类`, icon: 'none' })
    return
  }
  items.value = [...items.value, name]
  newName.value = ''
  saveItems(items.value)
}

function removeItem(name) {
  if (items.value.length <= MIN_COUNT) {
    uni.showToast({ title: `至少保留 ${MIN_COUNT} 个品类`, icon: 'none' })
    return
  }
  items.value = items.value.filter((item) => item !== name)
  saveItems(items.value)
}

function resetItems() {
  items.value = [...DEFAULT_ITEMS]
  saveItems(items.value)
  uni.showToast({ title: '已恢复默认品类', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="header__title">今天吃什么</text>
      <text class="header__subtitle">别纠结了，转一下就好</text>
    </view>

    <view class="wheel-wrap">
      <view class="pointer" />
      <view class="wheel" :style="{ background: wheelBackground, transform: `rotate(${rotation}deg)` }">
        <view v-for="(item, index) in items" :key="item" class="label" :style="labelStyle(index)">
          <text class="label__text">{{ item }}</text>
        </view>
      </view>
      <view class="hub" :class="{ 'hub--spinning': spinning }" @tap="spin">
        <text class="hub__text">{{ spinning ? '···' : '转' }}</text>
      </view>
    </view>

    <view class="actions">
      <view class="btn btn--ghost" @tap="showManager = true">管理品类</view>
    </view>

    <view v-if="showResult" class="mask" @tap="showResult = false">
      <view class="result" @tap.stop>
        <text class="result__hint">今天就吃</text>
        <text class="result__name">{{ result }}</text>
        <view class="btn btn--primary" @tap="spin">再转一次</view>
      </view>
    </view>

    <view v-if="showManager" class="mask" @tap="showManager = false">
      <view class="sheet" @tap.stop>
        <view class="sheet__head">
          <text class="sheet__title">我的品类</text>
          <text class="sheet__count">{{ items.length }} / {{ MAX_COUNT }}</text>
        </view>

        <scroll-view class="list" scroll-y>
          <view v-for="item in items" :key="item" class="list__item">
            <text class="list__name">{{ item }}</text>
            <text class="list__del" @tap="removeItem(item)">删除</text>
          </view>
        </scroll-view>

        <view class="adder">
          <input
            v-model="newName"
            class="adder__input"
            placeholder="添加一个品类，如 螺蛳粉"
            :maxlength="8"
            confirm-type="done"
            @confirm="addItem"
          />
          <view class="adder__btn" @tap="addItem">添加</view>
        </view>

        <view class="sheet__foot">
          <text class="tip">至少 {{ MIN_COUNT }} 个，最多 {{ MAX_COUNT }} 个</text>
          <text class="tip tip--link" @tap="resetItems">恢复默认</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 60rpx 40rpx 80rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #FDF8F0;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 50rpx;
}

.header__title {
  font-size: 48rpx;
  font-weight: 600;
  color: #3D2C1E;
  letter-spacing: 2rpx;
}

.header__subtitle {
  margin-top: 14rpx;
  font-size: 26rpx;
  color: #9A8571;
}

.wheel-wrap {
  position: relative;
  width: 620rpx;
  height: 620rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pointer {
  position: absolute;
  top: -8rpx;
  left: 50%;
  width: 0;
  height: 0;
  margin-left: -18rpx;
  border-left: 18rpx solid transparent;
  border-right: 18rpx solid transparent;
  border-top: 34rpx solid #D85A30;
  z-index: 3;
}

.wheel {
  position: relative;
  width: 620rpx;
  height: 620rpx;
  border-radius: 50%;
  border: 14rpx solid #FFFFFF;
  box-sizing: border-box;
  transition: transform 3.5s cubic-bezier(0.15, 0.85, 0.2, 1);
}

.label {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200rpx;
  text-align: center;
  z-index: 2;
}

.label__text {
  font-size: 26rpx;
  color: #4A3728;
  font-weight: 500;
}

.hub {
  position: absolute;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(93, 62, 36, 0.18);
  z-index: 4;
}

.hub--spinning {
  opacity: 0.7;
}

.hub__text {
  font-size: 40rpx;
  font-weight: 600;
  color: #D85A30;
}

.actions {
  margin-top: 60rpx;
}

.btn {
  padding: 22rpx 64rpx;
  border-radius: 48rpx;
  font-size: 28rpx;
  text-align: center;
}

.btn--ghost {
  background: #FFFFFF;
  color: #7A5C3E;
  border: 1rpx solid #EBDCC8;
}

.btn--primary {
  background: #D85A30;
  color: #FFFFFF;
  padding: 22rpx 0;
  width: 100%;
}

.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(45, 32, 20, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.result {
  width: 520rpx;
  padding: 56rpx 48rpx 40rpx;
  border-radius: 32rpx;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result__hint {
  font-size: 26rpx;
  color: #9A8571;
}

.result__name {
  margin: 24rpx 0 44rpx;
  font-size: 64rpx;
  font-weight: 600;
  color: #D85A30;
}

.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 48rpx 40rpx 60rpx;
  border-radius: 32rpx 32rpx 0 0;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-self: flex-end;
}

.sheet__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.sheet__title {
  font-size: 34rpx;
  font-weight: 600;
  color: #3D2C1E;
}

.sheet__count {
  font-size: 26rpx;
  color: #9A8571;
}

.list {
  max-height: 420rpx;
}

.list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 8rpx;
  border-bottom: 1rpx solid #F3EADF;
}

.list__name {
  font-size: 30rpx;
  color: #4A3728;
}

.list__del {
  font-size: 26rpx;
  color: #C0553A;
}

.adder {
  display: flex;
  align-items: center;
  margin-top: 32rpx;
  padding: 12rpx 12rpx 12rpx 28rpx;
  border-radius: 48rpx;
  background: #FDF8F0;
  border: 1rpx solid #EBDCC8;
}

.adder__input {
  flex: 1;
  font-size: 28rpx;
  color: #4A3728;
}

.adder__btn {
  padding: 14rpx 36rpx;
  border-radius: 40rpx;
  background: #D85A30;
  color: #FFFFFF;
  font-size: 26rpx;
}

.sheet__foot {
  display: flex;
  justify-content: space-between;
  margin-top: 28rpx;
}

.tip {
  font-size: 24rpx;
  color: #B0A090;
}

.tip--link {
  color: #D85A30;
}
</style>
