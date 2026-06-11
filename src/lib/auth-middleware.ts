import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/app/api/auth/route"

// 验证请求中的 token
export async function validateRequest(req: NextRequest): Promise<boolean> {
  const token = req.headers.get("X-Session-Token")

  if (!token) {
    return false
  }

  return verifyToken(token)
}

// 创建未授权响应
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "未授权，请先登录" },
    { status: 401 }
  )
}
