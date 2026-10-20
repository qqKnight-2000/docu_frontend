<script setup lang="ts">
/**
 * @file 认证页共享布局（登录 / 注册 / 找回密码 / 修改密码）
 * @description 四页共用同一套视觉骨架，差异仅在画布内的表单与链接，
 *              由默认插槽提供。布局内固定包含：
 *
 *                1) decor-stage：1280×800 设计舞台，cover 等比缩放居中，
 *                   内含右下三张倾斜线稿纸（数据与几何来自 useAuthStage）；
 *                2) 顶栏三元素：左上品牌印记（内联 SVG）/ 右上 Welcome，
 *                   与画布内「文枢」构成一条墨迹带——三者墨迹顶边、底边分别
 *                   水平对齐（以文枢墨迹为标准，几何系数见 useAuthStage 常量
 *                   注释），任意窗口尺寸恒成立，小屏回退 42.3vh 居中；
 *                3) form-frame：视口水平居中；宽度表达式由脚本注入（--frame-w，
 *                   与墨迹带各 calc 同源）；内部 305×503 设计稿画布按框宽
 *                   等比缩放；画布顶部固定为品牌区 BrandTitle，其下为页面插槽。
 *
 *              插槽元素可用的定位 / 文案类（样式由本组件 :slotted 统一提供，
 *              视图层不再写任何 CSS）：
 *                · auth-page__field / --form   表单槽位包装（305 宽，top 行内样式给定）
 *                · auth-page__notice           服务端错误 / 成功提示（12px 墨色）
 *                · auth-page__link-row         底部两端对齐链接行（登录页用）
 *                · auth-page__link             链接文字样式（13px 次级墨色，hover 下划线）
 *                · auth-page__link--center     单条居中、绝对定位的链接（其余三页用）
 */
import BrandTitle from '@/components/login/BrandTitle.vue'
import PaperDoc from '@/components/illustration/PaperDoc.vue'
import {
  AUTH_SHEETS,
  BRAND_INK_HEIGHT_FACTOR,
  BRAND_INK_TOP_FACTOR,
  CORNER_ANCHOR_VW,
  CORNER_MARK_OFFSET_X,
  CORNER_MARK_OFFSET_Y,
  CORNER_MARK_SCALE,
  CORNER_RIGHT_GAP,
  CORNER_TOP_VH,
  FORM_DESIGN_HEIGHT,
  FORM_DESIGN_WIDTH,
  FRAME_W_CSS,
  SHEET_ROTATE,
  SHEET_WIDTH,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  useAuthStage,
  WELCOME_BOX_TOP_FACTOR,
  WELCOME_FONT_FACTOR,
} from '@/composables/useAuthStage'

const { stageScale, formScale, formFrameEl } = useAuthStage()

/**
 * 顶栏墨迹带（以文枢墨迹为标准，三元素顶底对齐）。各顶边均为
 * 「锚点(1.375vh + 3.086vw) + 系数 × FrameW」的 calc 表达式，系数来自
 * useAuthStage 中实测的字体墨迹数据：
 *   · 表单锚点：画布中心 = 锚点 + 224.5/305·FrameW（224.5 = 半画布 251.5
 *     − 品牌名顶 34 + 光学修正 7），使文枢墨迹带顶边 = 锚点 + 12.18/305·FrameW；
 *   · 印记顶边 = 墨迹带顶边（+ CORNER_MARK_OFFSET_Y 手动微调），
 *     印记高度 = 墨迹带高 × CORNER_MARK_SCALE（顶边锚定墨迹带顶，向下放大）；
 *   · Welcome 盒顶 = 墨迹带顶 − 盒内偏移，字号使其墨迹高 = 墨迹带高。
 */
const formAnchor = `calc(${CORNER_TOP_VH}vh + ${CORNER_ANCHOR_VW}vw + ${(224.5 / 305).toFixed(6)} * ${FRAME_W_CSS})`

/** 左上印记顶边 = 文枢墨迹带顶边 + 手动微调 */
const markTop = `calc(${CORNER_TOP_VH}vh + ${CORNER_ANCHOR_VW}vw + ${BRAND_INK_TOP_FACTOR.toFixed(6)} * ${FRAME_W_CSS} + ${CORNER_MARK_OFFSET_Y}px)`

/** 印记高度 = 文枢墨迹带高 × CORNER_MARK_SCALE（顶边仍锚定墨迹带顶，向下放大） */
const markHeight = `calc(${(BRAND_INK_HEIGHT_FACTOR * CORNER_MARK_SCALE).toFixed(6)} * ${FRAME_W_CSS})`

/** Welcome 盒顶 = 文枢墨迹带顶边 − 盒内墨迹偏移（0.1275em，系数已烘焙） */
const welcomeTop = `calc(${CORNER_TOP_VH}vh + ${CORNER_ANCHOR_VW}vw + ${WELCOME_BOX_TOP_FACTOR.toFixed(6)} * ${FRAME_W_CSS})`

/** Welcome 字号 = 文枢墨迹带高 ÷ 0.820（Welcome 每em墨迹高） */
const welcomeFontSize = `calc(${WELCOME_FONT_FACTOR.toFixed(6)} * ${FRAME_W_CSS})`
</script>

<template>
  <main class="auth-page">
    <!-- ============ 装饰层：1280×800 舞台，cover 缩放，右下出血 ============ -->
    <div
      class="auth-page__decor-stage"
      :style="{
        width: `${STAGE_WIDTH}px`,
        height: `${STAGE_HEIGHT}px`,
        transform: `translate(-50%, -50%) scale(${stageScale})`,
      }"
      aria-hidden="true"
    >
      <!-- 三张倾斜线稿纸 -->
      <div class="auth-page__decor">
        <div
          v-for="(sheet, index) in AUTH_SHEETS"
          :key="sheet.id"
          class="auth-page__sheet"
          :style="{
            left: `${sheet.cx - SHEET_WIDTH / 2}px`,
            top: `${sheet.cy}px`,
            width: `${SHEET_WIDTH}px`,
            transform: `translateY(-50%) rotate(${SHEET_ROTATE}deg)`,
            zIndex: index + 1,
          }"
        >
          <PaperDoc :variant="sheet.variant" />
        </div>
      </div>
    </div>

    <!-- 左上角品牌印记：剑穿 DD 字母组合（Documenter monogram，矢量复刻自设计稿）。
         左边距 = CORNER_RIGHT_GAP + OFFSET_X（与右上 Welcome 左右对称，可微移），
         顶边 = 文枢墨迹带顶边（+ OFFSET_Y 微调），高度 = 墨迹带高 × CORNER_MARK_SCALE。 -->
    <svg
      class="auth-page__corner-mark"
      viewBox="0 0 167 322"
      :style="{
        left: `${CORNER_RIGHT_GAP + CORNER_MARK_OFFSET_X}px`,
        top: markTop,
        height: markHeight,
      }"
      aria-hidden="true"
    >
      <g fill="currentColor">
        <!-- 剑首（顶部横杆）与剑柄轴（短柄） -->
        <rect x="66" y="0" width="32" height="14" />
        <rect x="74" y="14" width="16" height="28" />
        <!-- 护手（宽横杆） -->
        <rect x="38" y="42" width="88" height="20" />
        <!-- 剑身：自护手向下穿行于两个字根之间，直达箭镞 -->
        <rect x="74" y="62" width="16" height="218" />
        <!-- 左字根：方形括号（上横 / 左竖 / 下横，右端止于剑身；整体相对剑身上移 15） -->
        <rect x="0" y="85" width="74" height="20" />
        <rect x="0" y="85" width="20" height="170" />
        <rect x="0" y="235" width="74" height="20" />
        <!-- 右字根：纵长半椭圆 D 字碗（evenodd 挖孔得 20 宽环带，左缘止于剑身） -->
        <path
          fill-rule="evenodd"
          d="M90 85 L104 85 C138.5 85 166.5 123.1 166.5 170 C166.5 216.9 138.5 255 104 255 L90 255 Z
             M90 105 L104 105 C127.5 105 146.5 134.1 146.5 170 C146.5 205.9 127.5 235 104 235 L90 235 Z"
        />
        <!-- 箭镞（下端三角尖） -->
        <path d="M62 280 L102 280 L82 322 Z" />
      </g>
    </svg>

    <!-- 英文角标：仅右上角一个 Welcome；盒顶/字号由墨迹带推导（等文枢墨迹高），
         行高固定 1（WELCOME_BOX_TOP_FACTOR 的偏移系数按 line-height:1 实测），勿改 -->
    <span
      class="auth-page__corner"
      :style="{
        top: welcomeTop,
        right: `${CORNER_RIGHT_GAP}px`,
        fontSize: welcomeFontSize,
        lineHeight: '1',
      }"
      aria-hidden="true"
    >Welcome</span>

    <!-- ============ 表单层：视口居中，纵向锚点使文枢与 Welcome 同一水平线 ============ -->
    <div class="auth-page__content" :style="{ '--form-anchor': formAnchor }">
      <div
        ref="formFrameEl"
        class="auth-page__frame"
        :style="{ '--frame-w': FRAME_W_CSS }"
      >
        <div
          class="auth-page__canvas"
          :style="{
            width: `${FORM_DESIGN_WIDTH}px`,
            height: `${FORM_DESIGN_HEIGHT}px`,
            transform: `scale(${formScale})`,
          }"
        >
          <!-- 品牌区：文枢 + 键盘标识（四页统一） -->
          <BrandTitle />

          <!-- 页面专属内容：Tab / 表单 / 提示 / 链接 -->
          <slot />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.auth-page {
  position: relative;
  // 锁死视口高度并裁切，防止表单超高产生文档滚动条（滚动条会挤偏水平居中）
  height: 100vh;
  overflow: hidden;

  /* ------------------------------ 装饰层 ------------------------------ */

  // 装饰舞台以视口中心为缩放原点（cover 出血）
  &__decor-stage {
    position: absolute;
    left: 50%;
    top: 50%;
    transform-origin: center;
    z-index: 0;
    pointer-events: none;
  }

  &__decor {
    position: absolute;
    inset: 0;
  }

  // 单张纸：左上角定位 + translateY 垂直居中，旋转围绕自身中心
  &__sheet {
    position: absolute;
    transform-origin: center;
  }

  // 英文角标：直接相对视口定位（不随装饰舞台 cover 缩放被裁切），
  // 以【右边界】定位；top/字号/行高/右边距由模板按 useAuthStage 常量内联注入，
  // 保证与表单纵向锚点共用同一套数字，不出现两处硬编码漂移。
  &__corner {
    position: absolute;
    z-index: 1;
    font-family: $font-serif;
    color: $ink;
    white-space: nowrap;
    pointer-events: none;
  }

  // 左上角品牌印记（内联 SVG）：left/top/height 由模板注入，
  // 宽度按 viewBox 167:300 自适应，颜色走墨色变量
  &__corner-mark {
    position: absolute;
    z-index: 1;
    width: auto;
    color: $ink;
    pointer-events: none;
  }

  /* ------------------------------ 表单层 ------------------------------ */

  // 表单定位层：水平居中；纵向锚点 --form-anchor 由脚本注入（默认回退 42.3vh），
  // 配合子框 translateY(-50%)，锚点值即表单框中心的视口高度
  &__content {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    justify-content: center;
    padding-top: var(--form-anchor, 42.3vh);
  }

  // 表单框：宽度表达式来自 useAuthStage 的 FRAME_W_CSS（经 --frame-w 注入，
  // 与顶栏墨迹带各 calc 同源单一出处）；高度固定按宽高比 305:503 自适应，
  // 整体缩放比、框尺寸、字间距四页一致
  &__frame {
    position: relative;
    width: var(--frame-w, min(clamp(260px, 23.828vw, 480px), 46vh));
    aspect-ratio: 305 / 503;
    flex: none;
    // 关键：父容器是 flex（交叉轴为纵向），默认 stretch 会用容器高覆盖
    // aspect-ratio 算出的高度，导致框体变形、内部画布下沉。改为 flex-start
    // 后高度严格等于 宽 × 503/305。
    align-self: flex-start;
    // 框体中心对齐到 --form-anchor 锚点（= Welcome 中心线 + 半画布高修正）
    transform: translateY(-50%);
  }

  // 内部设计稿画布：固定 305×503，以左上角为原点缩放
  &__canvas {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: left top;
  }

  /* --------------------- 插槽元素（由各页面提供内容） --------------------- */

  // 表单槽位包装：305 宽，顶边距由页面以行内 top 坐标给定；
  // 单框默认高 37px，--form 高度由内部表单行自行撑开
  :slotted(.auth-page__field) {
    position: absolute;
    left: 0;
    width: 305px;
    height: 37px;
  }

  :slotted(.auth-page__field--form) {
    height: auto;
  }

  // 服务端错误 / 成功提示（绝对定位，不挤压布局）
  :slotted(.auth-page__notice) {
    position: absolute;
    left: 2px;
    font-family: $font-serif;
    font-weight: $weight-normal;
    font-size: 12px;
    line-height: 1.4;
    color: $ink;
    white-space: nowrap;
    pointer-events: none;
  }

  // 底部两端对齐链接行（登录页：忘记密码？/ 还没有账号？注册）
  :slotted(.auth-page__link-row) {
    position: absolute;
    left: 0;
    width: 305px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  // 链接文字：次级墨色，hover / 键盘聚焦加深并出下划线
  :slotted(.auth-page__link) {
    font-family: $font-serif;
    font-weight: $weight-normal;
    font-size: 13px;
    line-height: 1.4;
    text-decoration: none;
    color: $ink-soft;
    transition: color $transition-fast;
  }

  :slotted(.auth-page__link:hover) {
    color: $ink;
    text-decoration: underline;
  }

  :slotted(.auth-page__link:focus-visible) {
    outline: none;
    color: $ink;
    text-decoration: underline;
  }

  // 单条居中链接（注册 / 找回 / 修改密码页）：绝对定位、305 宽内居中
  :slotted(.auth-page__link--center) {
    position: absolute;
    left: 0;
    width: 305px;
    text-align: center;
  }
}

// 小屏（<768px）：隐藏纸张装饰与角标；无角标可对齐，表单回退 42.3vh 固定居中，
// 宽度取视口 86% 并受 46vh 高度约束
@media (max-width: 768px) {
  .auth-page {
    &__decor-stage,
    &__corner,
    &__corner-mark {
      display: none;
    }

    &__content {
      padding-top: 42.3vh;
    }

    &__frame {
      width: min(86vw, 46vh);
    }
  }
}
</style>
