type AgentApi = {
  get(path: string): Promise<unknown>;
  patch(path: string, body: unknown): Promise<unknown>;
  post(path: string, body: unknown): Promise<unknown>;
};

export function handleMcp(
  request: Request,
  api: AgentApi,
  options: { approve(message: string, action: unknown): Promise<string | null>; version?: string },
): Promise<Response>;

export function isCloudflareBrowserIntegrityBlock(response: Response, bodyText?: string): boolean;
export function stagingResponseError(response: Response, origin: string): Promise<Error>;
