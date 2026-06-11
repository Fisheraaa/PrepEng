import { NextRequest, NextResponse } from "next/server"
import { SignJWT, jwtVerify } from "jose"

// 密码从环境变量读取
const APP_PASSWORD = process.env.APP_PASSWORD || "prepeng2025"

// JWT 密钥（从环境变量读取，或用默认值）
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "prepeng-secret-key-change-in-production"
)

// 生成 JWT token
async function createToken(): Promise<string> {
  return new SignJWT({ role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h") // 2 小时过期
    .sign(JWT_SECRET)
}

// 验证 JWT token
export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { password, action, token } = body

  // 登录
  if (action === "login") {
    if (password !== APP_PASSWORD) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 })
    }

    const newToken = await createToken()
    return NextResponse.json({ success: true, token: newToken })
  }

  // 验证 session
  if (action === "verify") {
    if (!token) {
      return NextResponse.json({ valid: false }, { status: 401 })
    }

    const valid = await verifyToken(token)
    return NextResponse.json({ valid })
  }

  return NextResponse.json({ error: "无效请求" }, { status: 400 })
}
