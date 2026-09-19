export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    public publicMessage: string,
  ) {
    super(code);
  }
}
export function audit(
  event: string,
  details: Record<string, string | number | boolean | null> = {},
) {
  console.info(
    JSON.stringify({ event, ...details, at: new Date().toISOString() }),
  );
}
