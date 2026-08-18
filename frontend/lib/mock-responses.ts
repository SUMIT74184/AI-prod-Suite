export function getSimulatedResponse(message: string): string {
  const lowercaseMsg = message.toLowerCase()

  // Research Assistant responses
  if (lowercaseMsg.includes('summary')) {
    return `Here's a comprehensive summary of the document:\n\n• Key Finding 1: The document introduces fundamental concepts\n• Key Finding 2: Advanced techniques are discussed in depth\n• Key Finding 3: Real-world applications are provided\n\nThe document provides valuable insights into the subject matter with practical examples and actionable recommendations.`
  }

  if (lowercaseMsg.includes('research')) {
    return `I can help you research this topic. Here are the key areas to explore:\n\n1. Historical Context: Understanding the evolution of this concept\n2. Current Methodologies: Modern approaches and best practices\n3. Case Studies: Real-world implementations\n4. Future Trends: Emerging developments\n5. Resources: Recommended reading and tools`
  }

  if (lowercaseMsg.includes('notes')) {
    return `📝 Generated Notes:\n\n**Section 1: Introduction**\n- Overview and context\n- Key definitions\n- Scope and objectives\n\n**Section 2: Main Content**\n- Core concepts\n- Important details\n- Examples and illustrations\n\n**Section 3: Conclusions**\n- Summary of findings\n- Implications\n- Further reading suggestions`
  }

  if (lowercaseMsg.includes('flashcard')) {
    return `📚 Generated Flashcards:\n\nFlashcard 1:\nQ: What is the primary concept?\nA: A fundamental principle that establishes the foundation for understanding the subject.\n\nFlashcard 2:\nQ: How is it applied in practice?\nA: Through systematic implementation of proven methodologies and best practices.\n\nFlashcard 3:\nQ: What are the key benefits?\nA: Improved efficiency, better outcomes, and enhanced understanding.`
  }

  if (lowercaseMsg.includes('quiz')) {
    return `❓ Generated Quiz Questions:\n\n1. What is the main concept discussed?\n   A) Concept A\n   B) Concept B (Correct)\n   C) Concept C\n\n2. How is it implemented?\n   A) Method 1 (Correct)\n   B) Method 2\n   C) Method 3\n\n3. What are the implications?\n   A) Implication 1\n   B) Implication 2 (Correct)\n   C) Implication 3\n\n4. Where is it most applicable?\n   A) Domain 1 (Correct)\n   B) Domain 2\n   C) Domain 3\n\n5. What is the key challenge?\n   A) Challenge 1\n   B) Challenge 2 (Correct)\n   C) Challenge 3`
  }

  if (lowercaseMsg.includes('citation')) {
    return `📖 Extracted Citations:\n\n1. Smith, J., & Johnson, K. (2023). "Title of Paper." Journal of Studies, 45(2), 123-145.\n\n2. Brown, L., Davis, M., & Wilson, R. (2022). "Research Findings." International Review, 38(4), 456-478.\n\n3. Taylor, P., Anderson, S. (2023). "Contemporary Analysis." Research Quarterly, 52(1), 89-102.\n\n4. Martinez, A., Garcia, B., & Lopez, C. (2022). "Comprehensive Study." Academic Press, pp. 234-256.\n\nNote: These citations are in APA format. Would you like a different citation style (MLA, Chicago, Harvard)?`
  }

  // Default response
  return `Thank you for your question! Based on your inquiry, here are some key insights:\n\n• The topic encompasses multiple dimensions that require careful consideration\n• Current best practices suggest a systematic approach\n• Implementation can vary based on specific context and requirements\n• I recommend exploring the resources provided for deeper understanding\n\nWould you like me to dive deeper into any specific aspect?`
}

export const mockFlashcards = [
  { id: '1', front: 'What is AI?', back: 'Artificial Intelligence is the simulation of human intelligence processes by machines.' },
  { id: '2', front: 'Define Machine Learning', back: 'A subset of AI that enables systems to learn from data without being explicitly programmed.' },
  { id: '3', front: 'What is NLP?', back: 'Natural Language Processing enables computers to understand and process human language.' },
]

export const mockQuizzes = [
  {
    id: '1',
    question: 'What is the main application of machine learning?',
    options: ['Image processing', 'Predictive analysis', 'All of the above'],
    correctAnswer: 2,
  },
  {
    id: '2',
    question: 'Which of these is not a machine learning algorithm?',
    options: ['Decision Trees', 'Linear Regression', 'HTML'],
    correctAnswer: 2,
  },
]

export const mockNotes = `
# Research Notes

## Key Concepts
- Fundamental principles of the subject
- Advanced techniques and methodologies
- Practical applications and use cases

## Main Findings
1. The research indicates significant developments in the field
2. Multiple approaches are being explored concurrently
3. Integration of different methodologies shows promise

## Implications
- Potential for widespread adoption
- Need for further research in specific areas
- Recommendations for practitioners

## References
- Key publications and resources
- Recommended reading materials
- Expert opinions and insights
`

export const mockCitations = [
  { id: '1', text: 'Smith, J., & Johnson, K. (2023)', style: 'APA' },
  { id: '2', text: 'Smith, J., Johnson, K. 2023', style: 'Harvard' },
  { id: '3', text: 'Smith, J., & Johnson, K. (2023).', style: 'Chicago' },
]
