<template>
  <Dialog :open="true" @update:open="$emit('close')">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Barkod Tara</DialogTitle>
        <DialogDescription>
          Kameranızı barkoda tutun veya manuel olarak girin
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Camera View -->
        <div class="relative aspect-video bg-black rounded-xl overflow-hidden">
          <video
            ref="videoRef"
            class="w-full h-full object-cover"
            autoplay
            playsinline
          />

          <!-- Scanning Overlay -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-64 h-32 border-2 border-white/50 rounded-lg relative">
              <div class="absolute inset-0 border-2 border-primary rounded-lg animate-pulse" />
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="isInitializing"
            class="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-3"
          >
            <Loader2 class="h-8 w-8 animate-spin text-white" />
            <span class="text-white text-sm">Kamera başlatılıyor...</span>
          </div>

          <!-- Error State -->
          <div
            v-if="error"
            class="absolute inset-0 flex items-center justify-center bg-black/80"
          >
            <div class="text-center text-white p-4">
              <AlertTriangle class="h-12 w-12 mx-auto mb-2 text-yellow-400" />
              <p class="text-sm">{{ error }}</p>
            </div>
          </div>
        </div>

        <!-- Manual Input -->
        <div class="space-y-2">
          <Label>Veya barkodu manuel girin:</Label>
          <div class="flex gap-2">
            <Input
              v-model="manualBarcode"
              placeholder="Barkod girin..."
              class="flex-1"
              @keyup.enter="submitManualBarcode"
            />
            <Button
              :disabled="!manualBarcode.trim()"
              @click="submitManualBarcode"
            >
              Gönder
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('close')">
          İptal
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { AlertTriangle, Loader2 } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const emit = defineEmits<{
  scan: [barcode: string]
  close: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const isInitializing = ref(true)
const error = ref<string | null>(null)
const manualBarcode = ref('')
let stream: MediaStream | null = null

async function initCamera() {
  isInitializing.value = true
  error.value = null

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })

    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }
  } catch (err: any) {
    console.error('Camera error:', err)
    if (err.name === 'NotAllowedError') {
      error.value = 'Kamera erişimi reddedildi. Lütfen kamera erişimine izin verin.'
    } else if (err.name === 'NotFoundError') {
      error.value = 'Bu cihazda kamera bulunamadı.'
    } else {
      error.value = 'Kameraya erişilemedi. Lütfen tekrar deneyin.'
    }
  } finally {
    isInitializing.value = false
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
}

function submitManualBarcode() {
  const barcode = manualBarcode.value.trim()
  if (barcode) {
    emit('scan', barcode)
    emit('close')
  }
}

onMounted(() => {
  initCamera()
})

onUnmounted(() => {
  stopCamera()
})
</script>
