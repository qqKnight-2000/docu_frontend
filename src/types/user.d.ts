/**
 * 用户相关的全局类型声明
 * 职责：定义用户信息、Token 等共享类型，供 stores/api 等模块引用。
 */

// 当前登录用户的完整信息（对应 /user/me 响应 data）
export interface UserInfo {
  id: number
  username: string
  // 未绑定手机号时为 null（API 文档 §6.1：phone | string/null）
  phone: string | null
  role: string
  status: string
  // 后端 DECIMAL 序列化可能是数字或字符串（宽容写法），按字符串处理再格式化
  balance: number | string
  createTime: string
  // 尚未登录过时为 null（注册响应 data 中该字段可为 null）
  lastLoginTime: string | null
}

// 归一化后的 Token 数据结构（统一帐密登录与验证码登录的返回）
export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
}
