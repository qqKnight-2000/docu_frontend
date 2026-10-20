<script setup lang="ts">
/**
 * @file 注册页
 * @description 视觉骨架（装饰舞台、英文角标、画布缩放、品牌区）由 AuthLayout 统一
 *              提供，本页只保留业务：注册方式 Tab、密码 / 验证码两套注册表单、
 *              提交收口、服务端提示与「已有账号？去登录」链接。
 *
 *              画布内槽位（305 宽设计稿坐标系，BrandTitle 占 y=0~215 由布局固定）：
 *                · 注册方式 Tab                    由 LoginTabs 内部定位（y=227）
 *                · 注册表单首行                    y=284（FIELD_1_TOP）
 *                  密码注册 4 行 / 验证码注册 5 行，行高 37、间距 22
 *                · 服务端提示文案                  表单底边下方 8px（随模式动态计算）
 *                · 「已有账号？去登录」链接          提示文案下方一行（随模式动态计算）
 *
 *              注册成功后行为（API(2).md：/user/register 与 /user/register/by-code
 *              响应 data 均为 UserInfo，不返回 Token）：显示成功文案后跳转 /login，
 *              由用户手动登录。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import LoginTabs from '@/components/login/LoginTabs.vue'
import PasswordRegisterForm from '@/components/register/PasswordRegisterForm.vue'
import CaptchaRegisterForm from '@/components/register/CaptchaRegisterForm.vue'
import { registerByCode, registerByPassword, sendRegisterCode } from '@/api/auth'

const router = useRouter()

/** 注册方式：密码 / 验证码（由 LoginTabs 切换） */
type RegisterMode = 'password' | 'code'
const registerMode = ref<RegisterMode>('password')

/**
 * 单个 Tab 的布局描述（结构与 LoginTabs 的 TabItem 一致，仅文案不同）
 * @property key      注册方式标识
 * @property label    文案
 * @property left     距画布左侧距离（设计稿像素）
 * @property width    文本框宽度（设计稿像素）
 * @property barWidth 激活下划线宽度（设计稿像素）
 */
interface RegisterTab {
  key: RegisterMode
  label: string
  left: number
  width: number
  barWidth: number
}

/** 注册页 Tab：几何坐标与登录页完全相同（文案同为 4/5 字，宽度一致），仅换文案 */
const registerTabs: RegisterTab[] = [
  { key: 'password', label: '密码注册', left: 0, width: 88, barWidth: 81 },
  { key: 'code', label: '验证码注册', left: 205, width: 100, barWidth: 100 },
]

/* ------------------------------ 表单槽位 ------------------------------ */

/** 注册表单首行顶边距（设计稿像素），与登录页输入框首行对齐，保证视觉重心一致 */
const FIELD_1_TOP = 284
/** 单个表单行高度（输入框 / 按钮统一 305×37） */
const FORM_ROW_HEIGHT = 37
/** 表单行间距（与 PasswordRegisterForm / CaptchaRegisterForm 的 gap 保持一致） */
const FORM_GAP = 22
/** 密码注册行数：用户名 / 手机号（选填）/ 密码 / 按钮 */
const PASSWORD_ROWS = 4
/** 验证码注册行数：用户名 / 手机号 / 验证码 / 密码 / 按钮 */
const CAPTCHA_ROWS = 5

/** 当前注册方式对应的表单行数 */
const formRowCount = computed(() =>
  registerMode.value === 'password' ? PASSWORD_ROWS : CAPTCHA_ROWS,
)

/**
 * 表单底边纵坐标（设计稿像素）。
 * 行步距 = 行高 + 行距 = 37 + 22 = 59；末行底边 = 首行顶 + (行数-1)×步距 + 行高。
 */
const formBottom = computed(
  () => FIELD_1_TOP + (formRowCount.value - 1) * (FORM_ROW_HEIGHT + FORM_GAP) + FORM_ROW_HEIGHT,
)

/** 服务端提示文案顶边距：紧贴表单底边下方 8px */
const noticeTop = computed(() => formBottom.value + 8)

/** 「已有账号？去登录」链接顶边距：提示文案下方一行 */
const linkTop = computed(() => noticeTop.value + 21)

/** 注册成功后停留时长（ms），让用户看清成功文案再跳转登录页 */
const REGISTER_REDIRECT_DELAY = 900

/** 注册请求进行中标志 */
const submitting = ref(false)

/** 服务端返回的注册错误文案（显示在按钮下方） */
const serverError = ref('')
/** 注册成功文案（显示在按钮下方，随后自动跳转登录页） */
const successMessage = ref('')

/** 注册成功后的跳转定时器句柄（组件卸载时清理） */
let redirectTimer: number | null = null

/**
 * 注册请求统一收口（密码注册与验证码注册共用）
 * @description 成功后提示并跳转 /login（响应 data 为 UserInfo，不含 Token）；
 *              失败时把服务端 msg 显示在表单下方，loading 态由 submitting 驱动。
 * @param request 具体注册接口调用（返回 Promise）
 */
async function runRegister(request: () => Promise<unknown>): Promise<void> {
  if (submitting.value) {
    return
  }
  submitting.value = true
  serverError.value = ''
  successMessage.value = ''
  try {
    await request()
    successMessage.value = '注册成功，正在前往登录…'
    redirectTimer = window.setTimeout(() => {
      void router.push('/login')
    }, REGISTER_REDIRECT_DELAY)
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : '注册失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

/**
 * 密码注册提交（由 PasswordRegisterForm 本地校验通过后触发）
 * @description POST /user/register；phone 为选填，未填时不下发该字段。
 */
function handlePasswordRegisterSubmit(payload: {
  username: string
  password: string
  phone?: string
}): void {
  void runRegister(() => registerByPassword(payload))
}

/**
 * 验证码注册提交（由 CaptchaRegisterForm 本地校验通过后触发）
 * @description POST /user/register/by-code；username/phone/code/password 均必填。
 */
function handleCaptchaRegisterSubmit(payload: {
  username: string
  phone: string
  code: string
  password: string
}): void {
  void runRegister(() => registerByCode(payload))
}

/**
 * 发送验证码（透传给 CaptchaRegisterForm → CaptchaInput）
 * @description POST /user/register/code；成功后返回 null，倒计时由 CaptchaInput 自行管理。
 * @param phone 已通过格式校验的手机号
 */
async function requestRegisterCode(phone: string): Promise<null> {
  await sendRegisterCode(phone)
  return null
}

/** 切换注册方式时清空上一次的服务端提示，避免串模式残留 */
watch(registerMode, () => {
  serverError.value = ''
  successMessage.value = ''
  if (redirectTimer !== null) {
    window.clearTimeout(redirectTimer)
    redirectTimer = null
  }
})

onBeforeUnmount(() => {
  if (redirectTimer !== null) {
    window.clearTimeout(redirectTimer)
  }
})
</script>

<template>
  <AuthLayout>
    <!-- 注册方式 Tab：密码注册 / 验证码注册（复用登录页 Tab 组件，仅更换文案） -->
    <LoginTabs v-model="registerMode" :tabs="registerTabs" aria-label="注册方式" />

    <!-- 注册表单：按当前方式渲染密码注册或验证码注册 -->
    <div
      class="auth-page__field auth-page__field--form"
      :style="{ top: `${FIELD_1_TOP}px` }"
    >
      <PasswordRegisterForm
        v-if="registerMode === 'password'"
        :loading="submitting"
        @submit="handlePasswordRegisterSubmit"
      />
      <CaptchaRegisterForm
        v-else
        :loading="submitting"
        :request-code="requestRegisterCode"
        @submit="handleCaptchaRegisterSubmit"
      />
    </div>

    <!-- 服务端返回的注册错误 / 成功文案（显示在表单下方，不挤压布局） -->
    <span
      v-if="serverError"
      class="auth-page__notice"
      :style="{ top: `${noticeTop}px` }"
      role="alert"
    >{{ serverError }}</span>
    <span
      v-else-if="successMessage"
      class="auth-page__notice"
      :style="{ top: `${noticeTop}px` }"
      role="status"
    >{{ successMessage }}</span>

    <!-- 已有账号：返回登录页 -->
    <RouterLink
      class="auth-page__link auth-page__link--center"
      :style="{ top: `${linkTop}px` }"
      to="/login"
    >已有账号？去登录</RouterLink>
  </AuthLayout>
</template>
