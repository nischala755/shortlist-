export class SubmissionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubmissionValidationError";
  }
}

export function validateSubmissionInput(value: unknown, questionIds: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SubmissionValidationError("Submission data must be an object");
  const input = value as Record<string, unknown>;
  const status = input.status;
  const answers = input.answers;
  if (status !== "DRAFT" && status !== "SUBMITTED") throw new SubmissionValidationError("Submission status must be DRAFT or SUBMITTED");
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) throw new SubmissionValidationError("Answers must be an object");
  const answerMap = answers as Record<string, unknown>;
  const allowedIds = new Set(questionIds);
  for (const [questionId, answer] of Object.entries(answerMap)) {
    if (!allowedIds.has(questionId)) throw new SubmissionValidationError("Answers contain an unknown question");
    if (typeof answer !== "string" || answer.length > 100_000) throw new SubmissionValidationError("Each answer must be text of at most 100,000 characters");
  }
  if (status === "SUBMITTED" && questionIds.some((questionId) => typeof answerMap[questionId] !== "string" || answerMap[questionId].trim() === "")) {
    throw new SubmissionValidationError("All questions require an answer before submission");
  }
  return { status, answers: answerMap };
}
