/**
 * @file 认证页共享舞台（登录 / 注册 / 找回密码 / 修改密码四页通用）
 * @description 四个认证页共用同一套「装饰层 + 表单层」解耦几何，本 composable
 *              统一收口三套计算，视图层只需通过 AuthLayout.vue 取用，不再各自复制：
 *
 *                1) 装饰舞台 cover 缩放：1280×800 设计舞台按宽高比取较大值等比
 *                   缩放居中（等价 background-size: cover），右下三张倾斜线稿
 *                   纸随之出血，超出视口部分由页面裁切。
 *
 *                2) 表单画布等比缩放：内部坐标系固定 305×503（FORM_DESIGN_*），
 *                   按表单框实际渲染宽度除以设计宽度得到 scale，任意屏幕比例下
 *                   内部元素相对位置都与设计稿一致。
 *
 *                3) 顶栏墨迹带对齐：左上品牌印记、中文「文枢」、右上「Welcome」
 *                   三者的【墨迹】顶边与底边分别落在同一水平线上，以文枢墨迹带为
 *                   标准（常量由 Noto Serif SC 实测墨迹数据推导，见下）；Welcome
 *                   右边界到视口右边界的间距由 CORNER_RIGHT_GAP 控制。
 *
 *              resize / ResizeObserver 的注册与销毁在此统一管理，
 *              调用方无需编写任何生命周期样板。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'

/** 纸张版式（与 PaperDoc 的 variant 字面量保持一致） */
export type SheetVariant = 'newspaper' | 'magazine' | 'manifest'

/**
 * 单张纸在设计舞台上的布局（坐标原点为舞台左上角，单位设计稿像素）
 * @property id       实例标识
 * @property cx       中心点横坐标
 * @property cy       中心点纵坐标
 * @property variant  版式（三张纸互不相同）
 */
export interface SheetPosition {
  id: string
  cx: number
  cy: number
  variant: SheetVariant
}

/* ------------------------- 装饰舞台常量（设计稿像素） ------------------------- */

/** 设计舞台尺寸（与设计稿画布一致） */
export const STAGE_WIDTH = 1280
export const STAGE_HEIGHT = 800

/** 纸张统一倾斜角（设计稿记为 18°，屏幕坐标下即 -18deg） */
export const SHEET_ROTATE = -15

/** 单张纸原始宽度（高度由 SVG 宽高比自适应，为 533） */
export const SHEET_WIDTH = 424

/* ---------- 三张纸布局：中心沿倾斜角自动对齐（顶边共线）+ 整体沿法线下移 ---------- */

/** 三张纸中心横坐标（设计稿像素，相邻间距 420）：最左杂志 / 中间单据 / 最右报纸 */
const SHEET_CX = [260, 680, 1100] as const

/** 基准纸（最左）中心纵坐标；其余纸的纵坐标按倾斜角自动推导，保证三张纸顶边共线 */
const SHEET_BASE_CY = 977

/** 三张纸整体沿「纸顶边法线、指向下方」平移的距离（设计稿像素） */
const SHEET_SHIFT = -5

/** 下移方向相对竖直方向的外倾角（度）：设计稿 -15° 标注，即向右下偏 15° */
const SHEET_SHIFT_TILT = 15

const toRad = (deg: number): number => (deg * Math.PI) / 180

/** 相邻两纸中心的纵向高差：横距 × tan(倾斜角)，负值即右高左低 */
const SHEET_DY = (SHEET_CX[1] - SHEET_CX[0]) * Math.tan(toRad(SHEET_ROTATE))

/** 整体位移分量：沿与竖直方向夹 SHEET_SHIFT_TILT 的斜向下方 */
const SHEET_SHIFT_X = SHEET_SHIFT * Math.sin(toRad(SHEET_SHIFT_TILT))
const SHEET_SHIFT_Y = SHEET_SHIFT * Math.cos(toRad(SHEET_SHIFT_TILT))

/** 三张纸的布局（顶边共线后整体下移）：最左杂志 / 中间单据 / 最右报纸 */
export const AUTH_SHEETS: readonly SheetPosition[] = [
  {
    id: 'sheet-left',
    cx: SHEET_CX[0] + SHEET_SHIFT_X,
    cy: SHEET_BASE_CY + SHEET_SHIFT_Y,
    variant: 'magazine',
  },
  {
    id: 'sheet-mid',
    cx: SHEET_CX[1] + SHEET_SHIFT_X,
    cy: SHEET_BASE_CY + SHEET_DY + SHEET_SHIFT_Y,
    variant: 'manifest',
  },
  {
    id: 'sheet-right',
    cx: SHEET_CX[2] + SHEET_SHIFT_X,
    cy: SHEET_BASE_CY + 2 * SHEET_DY + SHEET_SHIFT_Y,
    variant: 'newspaper',
  },
]

/* --------------------------- 表单画布常量（设计稿像素） --------------------------- */

/** 表单内部设计稿宽度；所有槽位元素均按此坐标系编写 */
export const FORM_DESIGN_WIDTH = 305

/**
 * 表单坐标空间总高。行距收紧后最下方元素结束于 y≈449，底部为透明留白，
 * 固定总高保证表单整体缩放比、框体尺寸、视觉重心在四页之间完全一致。
 */
export const FORM_DESIGN_HEIGHT = 503

/* ------------------- 顶栏墨迹带：三元素上下边界对齐 ------------------- */

/**
 * 顶栏三元素（左印记 / 中文枢 / 右 Welcome）共用一条【墨迹带】，以文枢墨迹为
 * 标准：三者墨迹顶边、底边分别水平对齐。几何全部由表单框渲染宽度 FrameW
 * （= 305 设计像素的实际像素宽，表达式 FRAME_W_CSS）推导，与画布缩放同源，
 * 任意窗口尺寸（含 clamp 生效区间）下对齐恒成立。
 *
 * 字体系数实测自页面内 canvas TextMetrics（Noto Serif SC，200px 采样）：
 *   · 文枢 500 字重：墨迹高 0.925em（asc 0.84 + desc 0.085），
 *     line-height:1 时字形盒顶 → 墨迹顶间隙 0.0925em ≈ 5.18 设计px；
 *   · Welcome 400 字重（字符串）：墨迹高 0.820em（asc 0.805 + desc 0.015），
 *     line-height:1 时盒顶 → 墨迹顶偏移 0.1275em（半负行距 −0.2175 + 0.345）。
 */

/** 顶栏锚点 vh 分量（沿用角标原始顶距 11/800） */
export const CORNER_TOP_VH = 1.375
/** 顶栏锚点 vw 分量（原 Welcome 盒顶系数 (10.547−4.375)/2，已冻结进文枢链路，勿随 Welcome 改动） */
export const CORNER_ANCHOR_VW = 3.086

/** 表单框宽度表达式（= 305 设计像素的渲染宽度；经 --frame-w 注入 AuthLayout 框体） */
export const FRAME_W_CSS = 'min(clamp(260px, 23.828vw, 480px), 46vh)'

/** 文枢墨迹带顶边系数：(光学修正 7 + 盒内间隙 5.18) ÷ 305，叠加在锚点之上 */
export const BRAND_INK_TOP_FACTOR = 12.18 / 305
/** 文枢墨迹带高度系数：56 × 0.925 ÷ 305（印记高度 = 此值 × FrameW） */
export const BRAND_INK_HEIGHT_FACTOR = 51.8 / 305

/**
 * Welcome 字号系数：使其墨迹高（0.820em）等于文枢墨迹带高（51.8 设计px）
 * → 51.8 ÷ 0.82 ≈ 63.17 设计px ÷ 305。比文枢字号（56）大一号是墨迹带等高的
 * 必然结果——拉丁大写墨迹天然矮于 CJK，等高必须等墨迹而非等字号。
 */
export const WELCOME_FONT_FACTOR = 51.8 / 0.82 / 305
/** Welcome 盒顶系数：墨迹带顶 − 盒内偏移 0.1275em → (12.18 − 63.17 × 0.1275) ÷ 305 */
export const WELCOME_BOX_TOP_FACTOR = (12.18 - (51.8 / 0.82) * 0.1275) / 305

/**
 * 「文枢」字号（设计稿像素，BrandTitle 引用）； BRAND_TOP_Y 为其字形顶边画布
 * 纵坐标（= BrandTitle 的 NAME_TOP）。二者与表单锚点内烘焙的 7px 光学修正共同
 * 决定墨迹带位置，改动需同步 BRAND_INK_TOP_FACTOR / BRAND_INK_HEIGHT_FACTOR。
 */
export const BRAND_FONT_PX = 56
export const BRAND_TOP_Y = 34

/** 右上角标「Welcome」右边界（字母 e）到视口右边界的间距（px，调大更靠内） */
export const CORNER_RIGHT_GAP = 12

/* ---------------------- 左上品牌印记：位置 / 大小微调 ---------------------- */

/** 印记高度缩放（1 = 与文枢墨迹带等高；1.2 = 放大 20%，顶边仍锚定墨迹带顶） */
export const CORNER_MARK_SCALE = 1.5

/** 印记水平微移（px）：正 = 向右，负 = 向左；基准位置 = CORNER_RIGHT_GAP（与 Welcome 对称） */
export const CORNER_MARK_OFFSET_X = 80

/** 印记垂直微移（px）：正 = 向下，负 = 向上；基准顶边 = 文枢墨迹带顶边 */
export const CORNER_MARK_OFFSET_Y = -15

/** useAuthStage 返回的舞台状态与模板引用 */
export interface AuthStage {
  /** 装饰舞台 cover 缩放比（写入 decor-stage 的 transform） */
  stageScale: Ref<number>
  /** 表单画布缩放比（渲染宽度 / 设计宽度） */
  formScale: Ref<number>
  /** 表单框外层元素引用（挂到 __frame 上测量实际宽度） */
  formFrameEl: Ref<HTMLDivElement | null>
}

/**
 * 注册认证页共享舞台的全部响应式状态与监听
 * @returns 见 {@link AuthStage}
 */
export function useAuthStage(): AuthStage {
  /** 装饰舞台 cover 缩放比 */
  const stageScale = ref(1)
  /** 表单内部等比缩放比 */
  const formScale = ref(1)
  /** 表单框外层引用 */
  const formFrameEl = ref<HTMLDivElement | null>(null)

  /** 监听表单框宽度变化（ResizeObserver 句柄，卸载时断开） */
  let formResizeObserver: ResizeObserver | null = null

  /** 取宽比、高比中较大者，保证装饰舞台始终 cover 铺满视口 */
  function updateStageScale(): void {
    stageScale.value = Math.max(
      window.innerWidth / STAGE_WIDTH,
      window.innerHeight / STAGE_HEIGHT,
    )
  }

  onMounted(() => {
    updateStageScale()
    window.addEventListener('resize', updateStageScale)

    if (formFrameEl.value) {
      formResizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry) {
          formScale.value = entry.contentRect.width / FORM_DESIGN_WIDTH
        }
      })
      formResizeObserver.observe(formFrameEl.value)
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateStageScale)
    formResizeObserver?.disconnect()
  })

  return { stageScale, formScale, formFrameEl }
}
