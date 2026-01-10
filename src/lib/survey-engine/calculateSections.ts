export function calculateSections(
  metaParams: any,
  N: number,
  topicContext: any
): any[] {
  const numBlocks = metaParams.depth >= 2 ? 3 : 2;
  const questionsPerBlock = Math.floor(N / numBlocks);

  return Array.from({ length: numBlocks }, (_, i) => ({
    section_id: i + 1,
    topic: topicContext?.key_concepts?.[i] || `Секция ${i + 1}`,
    num_questions: questionsPerBlock,
    has_screening: metaParams.structure === 'branching' && i === 0
  }));
}
