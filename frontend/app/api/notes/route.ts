import { mockNotes } from '@/lib/mock-responses'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json()

    return NextResponse.json({
      success: true,
      notes: mockNotes,
      fileName,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    notes: mockNotes,
  })
}
