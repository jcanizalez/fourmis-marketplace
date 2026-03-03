---
description: When the user asks about Go concurrency, goroutines, channels, select statement, sync primitives, WaitGroup, Mutex, worker pools, fan-out fan-in, rate limiting, errgroup, or concurrent patterns in Go
---

# Concurrency Patterns

## Goroutines & Channels

### Basic Goroutine
```go
func main() {
    go func() {
        fmt.Println("running in background")
    }()

    // Main goroutine must wait, or it exits immediately
    time.Sleep(100 * time.Millisecond)
}
```

### Channels — Communication Between Goroutines
```go
// Unbuffered channel — sender blocks until receiver is ready
ch := make(chan string)

go func() {
    ch <- "hello" // blocks until someone reads
}()

msg := <-ch // blocks until someone writes
fmt.Println(msg) // "hello"
```

### Buffered Channels
```go
// Buffered — sender blocks only when buffer is full
ch := make(chan int, 3)

ch <- 1 // doesn't block
ch <- 2 // doesn't block
ch <- 3 // doesn't block
ch <- 4 // blocks until someone reads

// Range over channel (reads until closed)
go func() {
    for i := 0; i < 5; i++ {
        ch <- i
    }
    close(ch) // MUST close when done sending
}()

for val := range ch {
    fmt.Println(val)
}
```

### Directional Channels
```go
// Send-only and receive-only channels for API clarity
func producer(out chan<- int) {
    for i := 0; i < 10; i++ {
        out <- i
    }
    close(out)
}

func consumer(in <-chan int) {
    for val := range in {
        fmt.Println(val)
    }
}

func main() {
    ch := make(chan int, 5)
    go producer(ch)
    consumer(ch) // blocks until channel is closed
}
```

---

## Select Statement

Multiplex across multiple channels. Like a switch for channels.

```go
func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(100 * time.Millisecond)
        ch1 <- "from ch1"
    }()

    go func() {
        time.Sleep(200 * time.Millisecond)
        ch2 <- "from ch2"
    }()

    // Wait for whichever is ready first
    select {
    case msg := <-ch1:
        fmt.Println(msg)
    case msg := <-ch2:
        fmt.Println(msg)
    }
}
```

### Select with Timeout
```go
select {
case result := <-ch:
    fmt.Println("got result:", result)
case <-time.After(5 * time.Second):
    fmt.Println("timed out")
}
```

### Non-blocking Select
```go
select {
case msg := <-ch:
    fmt.Println("received:", msg)
default:
    fmt.Println("no message ready")
}
```

---

## Sync Primitives

### sync.WaitGroup — Wait for N Goroutines
```go
func fetchAll(urls []string) []string {
    var (
        mu      sync.Mutex
        results []string
        wg      sync.WaitGroup
    )

    for _, url := range urls {
        wg.Add(1)
        go func(u string) {
            defer wg.Done()
            body := fetch(u)

            mu.Lock()
            results = append(results, body)
            mu.Unlock()
        }(url)
    }

    wg.Wait() // blocks until all goroutines call Done()
    return results
}
```

### sync.Mutex — Protect Shared State
```go
type SafeCounter struct {
    mu sync.Mutex
    v  map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.v[key]++
}

func (c *SafeCounter) Value(key string) int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.v[key]
}

// Use RWMutex when reads >> writes
type Cache struct {
    mu   sync.RWMutex
    data map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // Multiple readers OK
    defer c.mu.RUnlock()
    val, ok := c.data[key]
    return val, ok
}

func (c *Cache) Set(key, val string) {
    c.mu.Lock()          // Exclusive write
    defer c.mu.Unlock()
    c.data[key] = val
}
```

### sync.Once — Run Exactly Once
```go
var (
    instance *Database
    once     sync.Once
)

func GetDB() *Database {
    once.Do(func() {
        instance = connectToDatabase()
    })
    return instance
}
```

### sync.Pool — Reuse Temporary Objects
```go
var bufPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer)
    },
}

func process(data []byte) {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufPool.Put(buf)
    }()

    buf.Write(data)
    // use buf...
}
```

---

## Context Propagation

### Cancellation
```go
func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    result, err := fetchWithContext(ctx, "https://api.example.com/data")
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            log.Println("request timed out")
        }
        return
    }
    fmt.Println(result)
}

func fetchWithContext(ctx context.Context, url string) (string, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return "", err
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    return string(body), err
}
```

### Passing Values in Context
```go
type contextKey string

const userIDKey contextKey = "userID"

func WithUserID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, userIDKey, id)
}

func UserIDFrom(ctx context.Context) (string, bool) {
    id, ok := ctx.Value(userIDKey).(string)
    return id, ok
}
```

---

## Fan-Out / Fan-In

```go
func fanOutFanIn(input []int, workers int) []int {
    jobs := make(chan int, len(input))
    results := make(chan int, len(input))

    // Fan-out: start N workers
    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job) // do work
            }
        }()
    }

    // Send jobs
    for _, val := range input {
        jobs <- val
    }
    close(jobs)

    // Close results when all workers done
    go func() {
        wg.Wait()
        close(results)
    }()

    // Fan-in: collect results
    var output []int
    for result := range results {
        output = append(output, result)
    }
    return output
}
```

---

## errgroup — Goroutines with Error Handling

```go
import "golang.org/x/sync/errgroup"

func fetchAll(ctx context.Context, urls []string) ([]string, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]string, len(urls))

    for i, url := range urls {
        i, url := i, url // capture loop vars
        g.Go(func() error {
            body, err := fetchWithContext(ctx, url)
            if err != nil {
                return fmt.Errorf("fetch %s: %w", url, err)
            }
            results[i] = body
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err // first error cancels context
    }
    return results, nil
}
```

### errgroup with Concurrency Limit
```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10) // max 10 concurrent goroutines

for _, url := range urls {
    url := url
    g.Go(func() error {
        return processURL(ctx, url)
    })
}

if err := g.Wait(); err != nil {
    return err
}
```

---

## Rate Limiting

### Token Bucket with time.Ticker
```go
func rateLimited(requests []Request) {
    ticker := time.NewTicker(100 * time.Millisecond) // 10 req/sec
    defer ticker.Stop()

    for _, req := range requests {
        <-ticker.C // wait for next tick
        go handle(req)
    }
}
```

### With golang.org/x/time/rate
```go
import "golang.org/x/time/rate"

limiter := rate.NewLimiter(rate.Every(100*time.Millisecond), 5) // 10/sec, burst 5

func handleRequest(ctx context.Context, req Request) error {
    if err := limiter.Wait(ctx); err != nil {
        return err // context cancelled or deadline exceeded
    }
    return process(req)
}
```

---

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| `go func()` + channel | Simple async task with result |
| `sync.WaitGroup` | Wait for N goroutines to finish |
| `errgroup.Group` | N goroutines with error propagation |
| `sync.Mutex` | Protect shared mutable state |
| `sync.RWMutex` | Shared state with reads >> writes |
| `sync.Once` | Singleton initialization |
| `select` | Multiplex channels, timeouts, non-blocking |
| Fan-out/fan-in | Parallel processing pipeline |
| `context.WithTimeout` | Deadline propagation |
| `rate.Limiter` | Rate limiting API calls |
