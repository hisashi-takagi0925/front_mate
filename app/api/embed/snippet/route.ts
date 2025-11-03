import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'script'
  const tenantId = searchParams.get('tenantId') || 'YOUR_TENANT_ID'
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''

  if (type === 'iframe') {
    const html = `<iframe src="${base}/chat/${tenantId}" style="width:100%;height:600px;border:0"></iframe>`
    return NextResponse.json({ snippet: html })
  }

  const js = `
  (function(){
    var i=document.createElement('iframe');
    i.src='${base}/chat/${tenantId}';
    i.style.cssText='position:fixed;bottom:16px;right:16px;width:360px;height:560px;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.15);z-index:999999;';
    document.body.appendChild(i);
  })();
  `.trim()
  return NextResponse.json({ snippet: `<script>${js}<\/script>` })
}

