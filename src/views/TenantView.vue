<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <div class="w-full max-w-md">
      <!-- Logo & Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
          <Store class="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 class="text-2xl font-bold text-foreground">POS'a Hoş Geldiniz</h1>
        <p class="text-muted-foreground mt-1 text-sm">Mağazanıza giriş yapmak için alan adını girin</p>
      </div>

      <!-- Form Card -->
      <Card class="shadow-xl">
        <CardContent class="pt-6">
          <!-- Success State -->
          <div v-if="showSuccess" class="py-8 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle class="h-8 w-8 text-green-600" />
            </div>
            <p class="text-lg font-medium text-foreground">Mağaza Bulundu!</p>
            <p class="text-sm text-muted-foreground mt-1">Giriş sayfasına yönlendiriliyorsunuz...</p>
          </div>

          <!-- Form -->
          <form v-else @submit.prevent="handleSubmit">
            <div class="space-y-4">
              <!-- Recent Tenants -->
              <div v-if="recentTenants.length > 0 && !domain" class="space-y-2">
                <Label class="text-xs text-muted-foreground">Son Kullanılanlar</Label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="tenant in recentTenants"
                    :key="tenant"
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
                    @click="selectRecentTenant(tenant)"
                  >
                    <Clock class="h-3 w-3 text-muted-foreground" />
                    <span>{{ tenant }}</span>
                  </button>
                </div>
              </div>

              <!-- Domain Input -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label for="domain">Mağaza Alan Adı</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" class="text-muted-foreground hover:text-foreground">
                          <HelpCircle class="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" class="max-w-xs">
                        <p>Mağaza alan adınız, hesap oluştururken size verilen özel adrestir. Genellikle şirketinizin adını içerir.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div class="relative">
                  <Globe class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="domain"
                    v-model="domain"
                    placeholder="magazaniz.b2bnord.com"
                    :disabled="isLoading"
                    :class="[
                      'pl-10 pr-10',
                      validationState === 'valid' && 'border-green-500 focus-visible:ring-green-500',
                      validationState === 'invalid' && 'border-destructive focus-visible:ring-destructive'
                    ]"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    @input="validateDomain"
                  />
                  <!-- Validation Icon -->
                  <div class="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle v-if="validationState === 'valid'" class="h-5 w-5 text-green-500" />
                    <XCircle v-else-if="validationState === 'invalid'" class="h-5 w-5 text-destructive" />
                  </div>
                </div>

                <!-- Validation Message -->
                <p v-if="validationMessage" :class="['text-sm', validationState === 'invalid' ? 'text-destructive' : 'text-muted-foreground']">
                  {{ validationMessage }}
                </p>

                <!-- Error from API -->
                <p v-if="error" class="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle class="h-4 w-4 flex-shrink-0" />
                  {{ error }}
                </p>
              </div>

              <!-- Helper Text -->
              <p class="text-xs text-muted-foreground">
                Örnek: <span class="font-medium">magazaniz.b2bnord.com</span> veya <span class="font-medium">magazaniz.com</span>
              </p>

              <!-- Submit Button -->
              <Button
                type="submit"
                :disabled="validationState !== 'valid' || isLoading"
                :class="[
                  'w-full transition-all',
                  validationState === 'valid' && !isLoading && 'bg-primary hover:bg-primary/90',
                ]"
                size="lg"
              >
                <Loader2 v-if="isLoading" class="h-4 w-4 mr-2 animate-spin" />
                <span v-else-if="validationState === 'valid'">Devam Et</span>
                <span v-else-if="!domain.trim()">Alan adı girin</span>
                <span v-else>Geçerli bir alan adı girin</span>
              </Button>

              <!-- Help Link -->
              <div class="text-center pt-2">
                <Dialog v-model:open="showHelpDialog">
                  <DialogTrigger asChild>
                    <button type="button" class="text-sm text-muted-foreground hover:text-primary transition-colors">
                      Mağazamı bulamıyorum
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mağazanızı Bulamıyor musunuz?</DialogTitle>
                      <DialogDescription>
                        Aşağıdaki adımları deneyin
                      </DialogDescription>
                    </DialogHeader>
                    <div class="space-y-4 py-4">
                      <div class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">1</div>
                        <div>
                          <p class="font-medium">Kayıt e-postanızı kontrol edin</p>
                          <p class="text-sm text-muted-foreground">Mağaza açıldığında gönderilen e-postada alan adınız bulunur.</p>
                        </div>
                      </div>
                      <div class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">2</div>
                        <div>
                          <p class="font-medium">Şirket yöneticinize sorun</p>
                          <p class="text-sm text-muted-foreground">Hesabı oluşturan kişi alan adını bilecektir.</p>
                        </div>
                      </div>
                      <div class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">3</div>
                        <div>
                          <p class="font-medium">Destek ile iletişime geçin</p>
                          <p class="text-sm text-muted-foreground">
                            E-posta: <a href="mailto:destek@b2bnord.com" class="text-primary hover:underline">destek@b2bnord.com</a>
                          </p>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- Footer -->
      <p class="text-center text-xs text-muted-foreground mt-6">
        Güvenli bağlantı ile korunmaktadır
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Store, Globe, Loader2, HelpCircle, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const RECENT_TENANTS_KEY = 'pos_recent_tenants'
const MAX_RECENT_TENANTS = 3

const router = useRouter()
const authStore = useAuthStore()

const domain = ref('')
const isLoading = ref(false)
const error = ref('')
const showSuccess = ref(false)
const showHelpDialog = ref(false)
const recentTenants = ref<string[]>([])

// Domain validation regex - allows subdomains like store.platform.com
const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

const validationState = computed(() => {
  if (!domain.value.trim()) return 'empty'
  // Clean the domain first
  const cleanDomain = cleanDomainInput(domain.value)
  if (domainRegex.test(cleanDomain)) return 'valid'
  return 'invalid'
})

const validationMessage = computed(() => {
  if (validationState.value === 'invalid' && domain.value.trim()) {
    return 'Geçerli bir alan adı formatı girin'
  }
  return ''
})

function cleanDomainInput(input: string): string {
  let cleaned = input.trim().toLowerCase()
  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//, '')
  // Remove trailing slash
  cleaned = cleaned.replace(/\/$/, '')
  // Remove www.
  cleaned = cleaned.replace(/^www\./, '')
  return cleaned
}

function validateDomain() {
  error.value = ''
}

function selectRecentTenant(tenant: string) {
  domain.value = tenant
}

function saveRecentTenant(tenant: string) {
  const cleaned = cleanDomainInput(tenant)
  let tenants = [...recentTenants.value]
  // Remove if already exists
  tenants = tenants.filter(t => t !== cleaned)
  // Add to beginning
  tenants.unshift(cleaned)
  // Keep only max
  tenants = tenants.slice(0, MAX_RECENT_TENANTS)
  // Save
  localStorage.setItem(RECENT_TENANTS_KEY, JSON.stringify(tenants))
  recentTenants.value = tenants
}

function loadRecentTenants() {
  try {
    const stored = localStorage.getItem(RECENT_TENANTS_KEY)
    if (stored) {
      recentTenants.value = JSON.parse(stored)
    }
  } catch {
    recentTenants.value = []
  }
}

async function handleSubmit() {
  if (validationState.value !== 'valid') return

  isLoading.value = true
  error.value = ''

  const cleanedDomain = cleanDomainInput(domain.value)

  try {
    await authStore.verifyTenant(cleanedDomain)
    // Save to recent tenants
    saveRecentTenant(cleanedDomain)
    // Show success state
    showSuccess.value = true
    // Navigate after brief delay
    setTimeout(() => {
      router.push('/login')
    }, 1000)
  } catch (err: any) {
    error.value = err.message || 'Mağaza bulunamadı. Lütfen alan adını kontrol edin.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadRecentTenants()
})
</script>
