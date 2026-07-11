import { mockQuizzes } from '@/lib/mock-responses'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { fileName, answers } = await request.json()

    let score = 0
    if (answers) {
      mockQuizzes.forEach((quiz) => {
        if (answers[quiz.id] === quiz.correctAnswer) {
          score++
        }
      })
    }

    return NextResponse.json({
      success: true,
      quizzes: mockQuizzes,
      fileName,
      score: answers ? Math.round((score / mockQuizzes.length) * 100) : null,
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
    quizzes: mockQuizzes,
    count: mockQuizzes.length,
  })
}
