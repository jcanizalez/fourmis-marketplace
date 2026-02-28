# HTTP Client Best Practices

Build robust, typed HTTP clients for consuming APIs. Covers fetch wrappers, error handling, retry logic, interceptors, and type-safe API clients.

## Type-Safe Fetch Wrapper

```typescript
// lib/api-client.ts — production-ready HTTP client
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: any,
    public url: string,
  ) {
    super(`${status} ${statusText}: ${url}`);
    this.name = 'ApiError';
  }

  get isNotFound() { return this.status === 404; }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isValidationError() { return this.status === 400; }
  get isServerError() { return this.status >= 500; }
}

class ApiClient {
  constructor(
    private baseUrl: string,
    private defaultHeaders: Record<string, string> = {},
  ) {}

  private async request<T>(method: HttpMethod, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = new URL(path, this.baseUrl);

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new ApiError(response.status, response.statusText, errorBody, url.toString());
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  get<T>(path: string, options?: RequestOptions) { return this.request<T>('GET', path, undefined, options); }
  post<T>(path: string, body?: unknown, options?: RequestOptions) { return this.request<T>('POST', path, body, options); }
  put<T>(path: string, body?: unknown, options?: RequestOptions) { return this.request<T>('PUT', path, body, options); }
  patch<T>(path: string, body?: unknown, options?: RequestOptions) { return this.request<T>('PATCH', path, body, options); }
  delete<T>(path: string, options?: RequestOptions) { return this.request<T>('DELETE', path, undefined, options); }

  // Create a new client with additional headers (e.g., auth token)
  withAuth(token: string): ApiClient {
    return new ApiClient(this.baseUrl, {
      ...this.defaultHeaders,
      Authorization: `Bearer ${token}`,
    });
  }
}

// Usage
const api = new ApiClient('https://api.example.com');
const authedApi = api.withAuth(token);

const users = await authedApi.get<{ data: User[]; meta: Pagination }>('/api/users', {
  params: { page: 1, limit: 20 },
});
```

## Retry Logic

```typescript
// lib/retry.ts — exponential backoff with jitter
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryOn?: (error: unknown) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10_000,
    retryOn = (err) => err instanceof ApiError && err.isServerError,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay,
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
const users = await withRetry(
  () => api.get<User[]>('/api/users'),
  { maxRetries: 3, retryOn: (err) => err instanceof ApiError && err.status >= 500 }
);
```

## Request Cancellation

```typescript
// Cancel requests on component unmount or navigation
function useApiData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    api.get<T>(url, { signal: controller.signal })
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort(); // Cleanup on unmount
  }, [url]);

  return { data, error, loading };
}

// Timeout wrapper
async function fetchWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = 10_000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}
```

## React Query / TanStack Query Integration

```typescript
// hooks/use-users.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useUsers(page = 1) {
  return useQuery({
    queryKey: ['users', page],
    queryFn: () => api.get<{ data: User[]; meta: Pagination }>('/api/users', {
      params: { page, limit: 20 },
    }),
    staleTime: 60_000, // 1 minute
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUser) => api.post<User>('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Usage in component
function UserList() {
  const { data, isLoading, error } = useUsers();
  const createUser = useCreateUser();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {data.data.map(user => <UserCard key={user.id} user={user} />)}
      <button onClick={() => createUser.mutate({ name: 'New', email: 'new@test.com' })}>
        Add User
      </button>
    </div>
  );
}
```

## Python — httpx Client

```python
# lib/api_client.py
import httpx
from typing import Any

class ApiClient:
    def __init__(self, base_url: str, token: str | None = None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers=headers,
            timeout=30.0,
        )

    async def get(self, path: str, **params: Any) -> dict:
        response = await self.client.get(path, params=params)
        response.raise_for_status()
        return response.json()

    async def post(self, path: str, data: dict) -> dict:
        response = await self.client.post(path, json=data)
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()

# Usage
async with ApiClient("https://api.example.com", token="...") as api:
    users = await api.get("/api/users", page=1, limit=20)
```

## Go — http.Client

```go
// pkg/client/client.go
package client

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type Client struct {
    BaseURL    string
    HTTPClient *http.Client
    Token      string
}

func New(baseURL string, token string) *Client {
    return &Client{
        BaseURL: baseURL,
        Token:   token,
        HTTPClient: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

func (c *Client) do(method, path string, body any, result any) error {
    var reqBody *bytes.Reader
    if body != nil {
        data, err := json.Marshal(body)
        if err != nil {
            return fmt.Errorf("marshal: %w", err)
        }
        reqBody = bytes.NewReader(data)
    }

    req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
    if err != nil {
        return fmt.Errorf("new request: %w", err)
    }

    req.Header.Set("Content-Type", "application/json")
    if c.Token != "" {
        req.Header.Set("Authorization", "Bearer "+c.Token)
    }

    resp, err := c.HTTPClient.Do(req)
    if err != nil {
        return fmt.Errorf("do: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return fmt.Errorf("API error: %d %s", resp.StatusCode, resp.Status)
    }

    if result != nil {
        return json.NewDecoder(resp.Body).Decode(result)
    }
    return nil
}

func (c *Client) Get(path string, result any) error  { return c.do("GET", path, nil, result) }
func (c *Client) Post(path string, body, result any) error { return c.do("POST", path, body, result) }
```

## HTTP Client Checklist

1. [ ] Base URL is configurable (not hardcoded)
2. [ ] Authentication headers are attached automatically
3. [ ] Requests have timeouts (default 30s)
4. [ ] Responses are typed (no `any` in production)
5. [ ] Errors are properly typed and catchable
6. [ ] Retry logic for transient failures (5xx, network errors)
7. [ ] Request cancellation supported (AbortController)
8. [ ] Content-Type is set correctly for all request types
9. [ ] Query parameters are properly encoded
10. [ ] Sensitive data not logged in error messages
