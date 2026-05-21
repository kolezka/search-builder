export type ApiError = {
  error: string;
  code: string;
  issues?: unknown[];
  retry_after?: number;
};
export class ApiResponseError extends Error {
  status: number;
  body: ApiError;
  constructor(status: number, body: ApiError) {
    super(body.error);
    this.status = status;
    this.body = body;
  }
}
