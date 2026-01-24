<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 overflow-y-auto">
    <div class="w-full max-w-md">
      <!-- Tenant Info -->
      <div class="text-center mb-8">
        <img
          v-if="authStore.tenant?.logo_url"
          :src="authStore.tenant.logo_url"
          :alt="authStore.tenant.name"
          class="h-16 mx-auto mb-4"
        />
        <div
          v-else
          class="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg"
        >
          <span class="text-2xl font-bold text-primary-foreground">{{ tenantInitials }}</span>
        </div>
        <h1 class="text-2xl font-bold text-foreground">{{ authStore.tenant?.name }}</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          <Store class="inline h-4 w-4 mr-1" />
          {{ authStore.tenant?.company_name || 'Mağaza' }} için giriş yapın
        </p>
      </div>

      <!-- Form Card -->
      <Card class="shadow-xl">
        <CardContent class="pt-6">
          <!-- Success State -->
          <div v-if="showSuccess" class="py-8 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle class="h-8 w-8 text-green-600" />
            </div>
            <p class="text-lg font-medium text-foreground">Giriş Başarılı!</p>
            <p class="text-sm text-muted-foreground mt-1">Yönlendiriliyorsunuz...</p>
          </div>

          <!-- Form -->
          <form v-else @submit.prevent="handleSubmit">
            <div class="space-y-4">
              <!-- Email Field -->
              <div class="space-y-2">
                <Label for="email">E-posta</Label>
                <div class="relative">
                  <Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="ornek@email.com"
                    :disabled="isLoading"
                    :class="[
                      'pl-10 pr-10',
                      emailValidation === 'valid' && 'border-green-500 focus-visible:ring-green-500',
                      emailValidation === 'invalid' && 'border-destructive focus-visible:ring-destructive'
                    ]"
                    autocomplete="email"
                    @blur="validateEmail"
                    @input="clearEmailError"
                  />
                  <!-- Validation Icon -->
                  <div v-if="email.trim()" class="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle v-if="emailValidation === 'valid'" class="h-5 w-5 text-green-500" />
                    <XCircle v-else-if="emailValidation === 'invalid'" class="h-5 w-5 text-destructive" />
                  </div>
                </div>
                <p v-if="errors.email" class="text-sm text-destructive">{{ errors.email }}</p>
              </div>

              <!-- Password Field -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label for="password">Şifre</Label>
                  <button
                    type="button"
                    class="text-xs text-primary hover:underline"
                    @click="showForgotPassword = true"
                  >
                    Şifremi Unuttum?
                  </button>
                </div>
                <div class="relative">
                  <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Şifrenizi girin"
                    :disabled="isLoading"
                    class="pl-10 pr-10"
                    autocomplete="current-password"
                    @keydown="checkCapsLock"
                    @keyup="checkCapsLock"
                  />
                  <!-- Password Toggle -->
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    @click="showPassword = !showPassword"
                  >
                    <EyeOff v-if="showPassword" class="h-5 w-5" />
                    <Eye v-else class="h-5 w-5" />
                  </button>
                </div>
                <!-- Caps Lock Warning -->
                <p v-if="capsLockOn" class="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle class="h-4 w-4" />
                  Caps Lock açık
                </p>
                <p v-if="errors.password" class="text-sm text-destructive">{{ errors.password }}</p>
              </div>

              <!-- Remember Me -->
              <div class="flex items-center space-x-2">
                <Checkbox id="remember" v-model:checked="rememberMe" />
                <label
                  for="remember"
                  class="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Beni hatırla (30 gün)
                </label>
              </div>

              <!-- General Error -->
              <div v-if="generalError" class="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p class="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle class="h-4 w-4 flex-shrink-0" />
                  {{ generalError }}
                </p>
              </div>

              <!-- Submit Button -->
              <Button
                type="submit"
                :disabled="isLoading"
                class="w-full"
                size="lg"
              >
                <Loader2 v-if="isLoading" class="h-4 w-4 mr-2 animate-spin" />
                {{ isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
              </Button>
            </div>
          </form>

          <!-- Back Link -->
          <div v-if="!showSuccess" class="mt-4 text-center">
            <Button
              variant="link"
              class="text-sm text-muted-foreground hover:text-primary"
              @click="handleBack"
            >
              <ArrowLeft class="h-4 w-4 mr-1" />
              Farklı bir mağaza kullan
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Security Footer -->
      <p class="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
        <Shield class="h-3 w-3" />
        Güvenli bağlantı ile korunmaktadır
      </p>
    </div>

    <!-- Forgot Password Dialog -->
    <Dialog v-model:open="showForgotPassword">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {{ resetStep === 'email' ? 'Şifrenizi mi Unuttunuz?' : resetStep === 'sent' ? 'E-postanızı Kontrol Edin' : 'Şifre Sıfırlama' }}
          </DialogTitle>
          <DialogDescription>
            {{ resetStep === 'email'
              ? 'Şifre sıfırlama kodu e-posta adresinize gönderilecektir.'
              : resetStep === 'sent'
              ? 'Gelen kutunuzu kontrol edin.'
              : 'E-postanıza gönderilen kodu ve yeni şifrenizi girin.' }}
          </DialogDescription>
        </DialogHeader>

        <!-- Step 1: Email Input -->
        <div v-if="resetStep === 'email'" class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="reset-email">E-posta Adresi</Label>
            <Input
              id="reset-email"
              v-model="resetEmail"
              type="email"
              placeholder="ornek@email.com"
              :disabled="isResetting"
            />
          </div>
          <p v-if="resetError" class="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle class="h-4 w-4 flex-shrink-0" />
            {{ resetError }}
          </p>
        </div>

        <!-- Step 2: Email Sent Confirmation -->
        <div v-else-if="resetStep === 'sent'" class="space-y-4 py-4">
          <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p class="text-sm text-amber-800">
              <AlertTriangle class="inline h-4 w-4 mr-1.5" />
              {{ resetMessage }}
            </p>
          </div>
          <div class="p-3 bg-muted rounded-lg">
            <p class="text-sm text-muted-foreground">
              <Mail class="inline h-4 w-4 mr-1" />
              Gönderildi: <span class="font-medium text-foreground">{{ resetEmail }}</span>
            </p>
          </div>
          <p class="text-xs text-muted-foreground">
            E-posta gelmedi mi? Spam klasörünü kontrol edin veya tekrar deneyin.
          </p>
        </div>

        <!-- Step 3: Token & New Password -->
        <div v-else class="space-y-4 py-4">
          <div class="p-3 bg-muted rounded-lg">
            <p class="text-sm text-muted-foreground">
              <Mail class="inline h-4 w-4 mr-1" />
              Kod gönderildi: <span class="font-medium text-foreground">{{ resetEmail }}</span>
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="reset-token">Sıfırlama Kodu</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-8 px-2 text-xs"
                @click="pasteToken"
                :disabled="isResetting"
              >
                <ClipboardPaste class="h-4 w-4 mr-1" />
                Yapıştır
              </Button>
            </div>
            <Textarea
              id="reset-token"
              v-model="resetToken"
              placeholder="E-postanıza gelen kodu buraya yapıştırın"
              :disabled="isResetting"
              class="font-mono text-sm min-h-[80px] resize-none"
              @paste="handleTokenPaste"
            />
            <p class="text-xs text-muted-foreground flex items-center justify-between">
              <span>E-postadan kodu kopyalayıp yapıştırın</span>
              <span :class="resetToken.trim().length > 0 ? 'text-primary font-medium' : ''">
                {{ resetToken.trim().length }} karakter
              </span>
            </p>
          </div>

          <div class="space-y-2">
            <Label for="new-password">Yeni Şifre</Label>
            <div class="relative">
              <Input
                id="new-password"
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="Yeni şifrenizi girin"
                :disabled="isResetting"
                class="pr-10"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                @click="showNewPassword = !showNewPassword"
              >
                <EyeOff v-if="showNewPassword" class="h-5 w-5" />
                <Eye v-else class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="confirm-password">Şifre Tekrar</Label>
            <Input
              id="confirm-password"
              v-model="confirmPassword"
              :type="showNewPassword ? 'text' : 'password'"
              placeholder="Yeni şifrenizi tekrar girin"
              :disabled="isResetting"
            />
          </div>

          <p v-if="resetError" class="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle class="h-4 w-4 flex-shrink-0" />
            {{ resetError }}
          </p>
          <p v-if="resetSuccess" class="text-sm text-green-600 flex items-center gap-1.5">
            <CheckCircle class="h-4 w-4 flex-shrink-0" />
            {{ resetSuccess }}
          </p>
        </div>

        <DialogFooter class="flex-col sm:flex-row gap-2">
          <Button
            v-if="resetStep === 'token'"
            variant="ghost"
            @click="resetStep = 'sent'"
            :disabled="isResetting"
            class="sm:mr-auto"
          >
            <ArrowLeft class="h-4 w-4 mr-1" />
            Geri
          </Button>
          <Button variant="outline" @click="closeForgotPassword" :disabled="isResetting">
            İptal
          </Button>
          <!-- Step 1: Send code -->
          <Button
            v-if="resetStep === 'email'"
            @click="handleForgotPassword"
            :disabled="!resetEmail.trim() || isResetting"
          >
            <Loader2 v-if="isResetting" class="h-4 w-4 mr-2 animate-spin" />
            Kod Gönder
          </Button>
          <!-- Step 2: Confirm received -->
          <template v-else-if="resetStep === 'sent'">
            <Button
              variant="outline"
              @click="handleForgotPassword"
              :disabled="isResetting"
            >
              <Loader2 v-if="isResetting" class="h-4 w-4 mr-2 animate-spin" />
              Tekrar Gönder
            </Button>
            <Button @click="resetStep = 'token'">
              Kodu Aldım
            </Button>
          </template>
          <!-- Step 3: Reset password -->
          <Button
            v-else
            @click="handleResetPassword"
            :disabled="!canSubmitReset || isResetting"
          >
            <Loader2 v-if="isResetting" class="h-4 w-4 mr-2 animate-spin" />
            Şifreyi Sıfırla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Mail,
  Lock,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Store,
  Shield,
  ClipboardPaste
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const REMEMBER_EMAIL_KEY = 'pos_remember_email'

const router = useRouter()
const authStore = useAuthStore()

// Form state
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const capsLockOn = ref(false)
const isLoading = ref(false)
const showSuccess = ref(false)
const errors = ref<{ email?: string; password?: string }>({})
const generalError = ref('')

// Forgot password state
const showForgotPassword = ref(false)
const resetStep = ref<'email' | 'sent' | 'token'>('email')
const resetEmail = ref('')
const resetToken = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const isResetting = ref(false)
const resetError = ref('')
const resetSuccess = ref('')
const resetMessage = ref('')

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const tenantInitials = computed(() => {
  const name = authStore.tenant?.name || ''
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const emailValidation = computed(() => {
  if (!email.value.trim()) return 'empty'
  if (emailRegex.test(email.value.trim())) return 'valid'
  return 'invalid'
})

const canSubmitReset = computed(() => {
  return (
    resetToken.value.trim().length > 0 &&
    newPassword.value.length >= 8 &&
    newPassword.value === confirmPassword.value
  )
})

function validateEmail() {
  if (email.value.trim() && !emailRegex.test(email.value.trim())) {
    errors.value.email = 'Geçerli bir e-posta adresi girin'
  }
}

function clearEmailError() {
  errors.value.email = ''
  generalError.value = ''
}

function checkCapsLock(event: KeyboardEvent) {
  capsLockOn.value = event.getModifierState('CapsLock')
}

function loadRememberedEmail() {
  try {
    const remembered = localStorage.getItem(REMEMBER_EMAIL_KEY)
    if (remembered) {
      email.value = remembered
      rememberMe.value = true
    }
  } catch {
    // Ignore localStorage errors
  }
}

function saveRememberedEmail() {
  try {
    if (rememberMe.value && email.value.trim()) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.value.trim())
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY)
    }
  } catch {
    // Ignore localStorage errors
  }
}

async function handleSubmit() {
  // Clear previous errors
  errors.value = {}
  generalError.value = ''

  // Validate
  if (!email.value.trim()) {
    errors.value.email = 'E-posta adresi gerekli'
    return
  }
  if (!emailRegex.test(email.value.trim())) {
    errors.value.email = 'Geçerli bir e-posta adresi girin'
    return
  }
  if (!password.value.trim()) {
    errors.value.password = 'Şifre gerekli'
    return
  }

  isLoading.value = true

  try {
    await authStore.login(email.value.trim(), password.value)
    // Save remember me preference
    saveRememberedEmail()
    // Show success state
    showSuccess.value = true
    // Navigate after brief delay
    setTimeout(async () => {
      console.log('[Login] Attempting navigation to /pos, isAuthenticated:', authStore.isAuthenticated)
      try {
        await router.push('/pos')
        console.log('[Login] Navigation successful')
      } catch (navError) {
        console.error('[Login] Navigation failed:', navError)
        // Force navigation if push fails
        router.replace('/pos')
      }
    }, 1000)
  } catch (err: any) {
    generalError.value = err.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.'
  } finally {
    isLoading.value = false
  }
}

async function handleForgotPassword() {
  if (!resetEmail.value.trim()) return

  resetError.value = ''
  resetSuccess.value = ''
  resetMessage.value = ''
  isResetting.value = true

  try {
    const response = await authApi.forgotPassword(resetEmail.value.trim())
    // Store message and move to 'sent' step
    resetMessage.value = response.message || 'Eğer bu e-posta ile bir hesap varsa, şifre sıfırlama kodu gönderilecektir.'
    resetStep.value = 'sent'
  } catch (err: any) {
    resetError.value = err.response?.data?.message || err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'
  } finally {
    isResetting.value = false
  }
}

async function handleResetPassword() {
  if (!canSubmitReset.value) return

  resetError.value = ''
  resetSuccess.value = ''
  isResetting.value = true

  try {
    const response = await authApi.resetPassword(
      resetEmail.value.trim(),
      resetToken.value.trim(),
      newPassword.value,
      confirmPassword.value
    )
    resetSuccess.value = response.message || 'Şifreniz başarıyla sıfırlandı.'
    // Close dialog after showing success
    setTimeout(() => {
      closeForgotPassword()
    }, 2000)
  } catch (err: any) {
    resetError.value = err.response?.data?.message || err.message || 'Şifre sıfırlama başarısız. Lütfen tekrar deneyin.'
  } finally {
    isResetting.value = false
  }
}

function closeForgotPassword() {
  showForgotPassword.value = false
  // Reset all state after dialog closes
  setTimeout(() => {
    resetStep.value = 'email'
    resetEmail.value = ''
    resetToken.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    resetError.value = ''
    resetSuccess.value = ''
    resetMessage.value = ''
    showNewPassword.value = false
  }, 200)
}

async function pasteToken() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      resetToken.value = text.trim()
    }
  } catch {
    // Clipboard access denied or not supported
    console.log('Clipboard access not available')
  }
}

function handleTokenPaste(event: ClipboardEvent) {
  // Auto-trim whitespace when pasting
  const pastedText = event.clipboardData?.getData('text')
  if (pastedText) {
    event.preventDefault()
    resetToken.value = pastedText.trim()
  }
}

function handleBack() {
  authStore.logout()
  router.push('/tenant')
}

onMounted(() => {
  loadRememberedEmail()
})
</script>
