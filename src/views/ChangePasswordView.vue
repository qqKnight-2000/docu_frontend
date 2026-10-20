<script setup lang="ts">
/**
 * @file 修改密码页
 * @description 视觉骨架（装饰舞台、英文角标、画布缩放、品牌区）由 AuthLayout 统一
 *              提供，本页只保留业务：修改密码表单、提交收口、服务端提示与
 *              「返回首页」链接。
 *
 *              画布内槽位（305 宽设计稿坐标系，BrandTitle 占 y=0~215 由布局固定）：
 *                · 修改密码表单首行                y=234（FIELD_1_TOP）
 *                  旧密码 / 新密码 / 修改按钮 共 3 行，行高 37、间距 22
 *                · 服务端提示文案                  y=397（表单底边下方 8px）
 *                · 「返回首页」链接                 y=418
 *
 *              修改成功后行为（API(2).md：成功后服务端撤销包括当前设备在内的全部
 *              会话）：前端必须清空本地 Token 再跳登录页，让用户用新密码重新登录——
 *              保留任何旧会话都会让改密失去意义。
 */
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthLayout from '@/components/layout/AuthLayout.vue'
import ChangePasswordForm from '@/components/change/ChangePasswordForm.vue'
import { changePassword } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

/* ------------------------------ 表单槽位 ------------------------------ */

/**
 * 表单首行（旧密码）顶边距（设计稿像素）。本页无 Tab，表单从品牌区下方直接排布。
 * 三行（旧密码 / 新密码 / 按钮）高 37px、间距 22px，由表单组件自行 flex 排版。
 */
const FIELD_1_TOP = 234
/** 服务端提示文案的顶边距：表单底边（234 + 2×59 + 37 = 389）下方 8px */
const NOTICE_TOP = 397
/** 「返回首页」链接的顶边距 */
const LINK_TOP = 418

/** 修改成功后停留时长（ms），让用户看清成功文案再跳转登录页 */
const REDIRECT_DELAY = 900

/** 修改请求进行中标志 */
const submitting = ref(false)

/** 服务端返回的错误文案（显示在表单下方） */
const serverError = ref('')
/** 修改成功文案（显示在表单下方，随后自动跳转登录页） */
const successMessage = ref('')

/** 修改成功后的跳转定时器句柄（组件卸载时清理） */
let redirectTimer: number | null = null

/**
 * 修改密码提交（由 ChangePasswordForm 本地校验通过后触发）
 * @description POST /user/change-password；成功后**先清空本地 Token**（服务端已撤销
 *              包括当前设备在内的全部会话，残留凭证只会让后续请求全部 401），
 *              再提示并跳转 /login。
 */
async function handleChangeSubmit(payload: {
  oldPassword: string
  newPassword: string
}): Promise<void> {
  if (submitting.value) {
    return
  }
  submitting.value = true
  serverError.value = ''
  successMessage.value = ''
  try {
    await changePassword(payload)
    userStore.clearAuth()
    successMessage.value = '密码已修改，正在前往登录…'
    redirectTimer = window.setTimeout(() => {
      void router.push('/login')
    }, REDIRECT_DELAY)
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : '修改失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  if (redirectTimer !== null) {
    window.clearTimeout(redirectTimer)
  }
})
</script>

<template>
  <AuthLayout>
    <!-- 修改密码表单：旧密码 / 新密码 / 修改按钮 -->
    <div
      class="auth-page__field auth-page__field--form"
      :style="{ top: `${FIELD_1_TOP}px` }"
    >
      <ChangePasswordForm
        :loading="submitting"
        @submit="handleChangeSubmit"
      />
    </div>

    <!-- 服务端返回的错误 / 成功文案（显示在表单下方，不挤压布局） -->
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

    <!-- 返回首页 -->
    <RouterLink
      class="auth-page__link auth-page__link--center"
      :style="{ top: `${LINK_TOP}px` }"
      to="/"
    >返回首页</RouterLink>
  </AuthLayout>
</template>
