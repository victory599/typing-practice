<template>
  <div v-if="open" class="modal-mask" @click.self="emit('close')">
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="share-qr-title">
      <h3 id="share-qr-title" class="modal-title">扫码分享到手机</h3>
      <p class="modal-body">
        请用<span class="emphasis">同一局域网（WiFi）</span>下的手机扫描下方二维码，打开分享页后可保存图片。
      </p>

      <p v-if="error" class="error-text">{{ error }}</p>

      <div v-else-if="loading" class="muted center">正在生成分享链接…</div>

      <template v-else-if="shareUrl">
        <div class="qr-wrap">
          <img v-if="qrDataUrl" class="qr" :src="qrDataUrl" alt="分享二维码" />
        </div>
        <p class="link-line emphasis">{{ shareUrl }}</p>
        <p v-if="expiresAt" class="muted expire emphasis">
          有效至 {{ formatExpire(expiresAt) }}（重启服务后也会清空）
        </p>
      </template>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  shareUrl: string
  expiresAt: number | null
  loading: boolean
  error: string
}>()

const emit = defineEmits<{ close: [] }>()

const qrDataUrl = ref('')

watch(
  () => [props.open, props.shareUrl] as const,
  async ([open, url]) => {
    qrDataUrl.value = ''
    if (!open || !url) return
    try {
      qrDataUrl.value = await QRCode.toDataURL(url, {
        width: 220,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
    } catch {
      qrDataUrl.value = ''
    }
  },
  { immediate: true },
)

function formatExpire(ts: number) {
  return new Date(ts).toLocaleString()
}
</script>

<style scoped>
.emphasis {
  color: orangered;
}

.center {
  text-align: center;
  margin: 1rem 0;
}

.qr-wrap {
  display: flex;
  justify-content: center;
  margin: 0.5rem 0 0.75rem;
}

.qr {
  width: 220px;
  height: 220px;
  border-radius: 8px;
  background: #fff;
}

.link-line {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  word-break: break-all;
  text-align: center;
  line-height: 1.4;
}

.expire {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  text-align: center;
}
</style>
