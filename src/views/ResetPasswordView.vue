<script setup lang="ts">
/**
 * @file 找回密码页
 * @description 视觉骨架（装饰舞台、英文角标、画布缩放、品牌区）由 AuthLayout 统一
 *              提供，本页只保留业务：找回密码表单、提交收口、服务端提示与
 *              「想起密码了？返回登录」链接。
 *
 *              画布内槽位（305 宽设计稿坐标系，BrandTitle 占 y=0~215 由布局固定）：
 *                · 找回密码表单首行                y=234（FIELD_1_TOP）
 *                  手机号 / 验证码 / 新密码 / 重设按钮 共 4 行，行高 37、间距 22
 *                · 服务端提示文案                  y=456（表单底边下方 8px）
 *                · 「想起密码了？返回登录」链接       y=477
 *
 *              重设成功后行为（API(2).md：/user/reset-password 响应 data 为 null，
 *              服务端会撤销该用户的全部会话）：前端必须清空本地 Token 再跳登录页，
 *              否则残留的旧凭证会让「改密踢下线」失去意义。
 */
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import ResetPasswordForm from '@/components/reset/ResetPasswordForm.vue'
import { resetPassword, sendResetCode } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

/* ------------------------------ 表单槽位 ------------------------------ */

/**
 * 表单首行（手机号）顶边距（设计稿像素）。本页无 Tab，表单从品牌区下方直接排布。
 * 四行（手机号 / 验证码 / 新密码 / 按钮）高 37px、间距 22px，由表单组件自行 flex 排版。
 */
const FIELD_1_TOP = 234
/** 服务端提示文案的顶边距：表单底边（234 + 3×59 + 37 = 448）下方 8px */
const NOTICE_TOP = 456
/** 「想起密码了？返回登录」链接的顶边距 */
const LINK_TOP = 477

/** 重设成功后停留时长（ms），让用户看清成功文案再跳转登录页 */
const REDIRECT_DELAY = 900

/** 重设请求进行中标志 */
const submitting = ref(false)

/** 服务端返回的重设错误文案（显示在表单下方） */
const serverError = ref('')
/** 重设成功文案（显示在表单下方，随后自动跳转登录页） */
const successMessage = ref('')

/** 重设成功后的跳转定时器句柄（组件卸载时清理） */
let redirectTimer: number | null = null

/**
 * 重设密码提交（由 ResetPasswordForm 本地校验通过后触发）
 * @description POST /user/reset-password；成功后**先清空本地 Token**（服务端已撤销全部
 *              会话，残留凭证会让改密失效），再提示并跳转 /login。
 */
async function handleResetSubmit(payload: {
  phone: string
  code: string
  newPassword: string
}): Promise<void> {
  if (submitting.value) {
    return
  }
  submitting.value = true
  serverError.value = ''
  successMessage.value = ''
  try {
    await resetPassword(payload)
    userStore.clearAuth()
    successMessage.value = '密码已重置，正在前往登录…'
    redirectTimer = window.setTimeout(() => {
      void router.push('/login')
    }, REDIRECT_DELAY)
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : '重置失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

/**
 * 发送验证码（透传给 ResetPasswordForm → CaptchaInput）
 * @description POST /user/reset-password/code；成功后返回 null，倒计时由 CaptchaInput 自行管理。
 * @param phone 已通过格式校验的手机号
 */
async function requestResetCode(phone: string): Promise<null> {
  await sendResetCode(phone)
  return null
}

onBeforeUnmount(() => {
  if (redirectTimer !== null) {
    window.clearTimeout(redirectTimer)
  }
})
</script>

<template>
  <AuthLayout>
    <!-- 找回密码表单：手机号 / 验证码 / 新密码 / 重设按钮 -->
    <div
      class="auth-page__field auth-page__field--form"
      :style="{ top: `${FIELD_1_TOP}px` }"
    >
      <ResetPasswordForm
        :loading="submitting"
        :request-code="requestResetCode"
        @submit="handleResetSubmit"
      />
    </div>

    <!-- 服务端返回的重设错误 / 成功文案（显示在表单下方，不挤压布局） -->
    <span
      v-if="serverError"
      class="auth-page__notice"
      :style="{ top: `${NOTICE_TOP}px` }"
      role="alert"
    >{{ serverError }}</span>
    <span
      v-else-if="successMessage"
      class="auth-page__notice"
      :style="{ top: `${NOTICE_TOP}px` }"
      role="status"
    >{{ successMessage }}</span>

    <!-- 想起密码了：返回登录页 -->
    <RouterLink
      class="auth-page__link auth-page__link--center"
      :style="{ top: `${LINK_TOP}px` }"
      to="/login"
    >想起密码了？返回登录</RouterLink>
  </AuthLayout>
</template>
