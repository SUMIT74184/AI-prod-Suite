import { mockCitations } from '@/lib/mock-responses'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { fileName, style } = await request.json()

    const filteredCitations = style
      ? mockCitations.filter(c => c.style === style)
      : mockCitations

    return NextResponse.json({
      success: true,
      citations: filteredCitations,
      fileName,
      style,
      count: filteredCitations.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const style = searchParams.get('style')

  const filteredCitations = style
    ? mockCitations.filter(c => c.style === style)
    : mockCitations

  return NextResponse.json({
    success: true,
    citations: filteredCitations,
    count: filteredCitations.length,
  })
}
