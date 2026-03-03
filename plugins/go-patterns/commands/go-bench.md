---
name: go-bench
description: Set up Go benchmarks for a function — generate benchmark code, run it, and analyze results
arguments:
  - name: target
    description: Function name or file:function to benchmark (e.g., "ProcessData" or "handler.go:ServeHTTP")
    required: true
---

# Go Bench

Set up benchmarks for the Go function `$ARGUMENTS`. Find the function, understand what it does, and generate comprehensive benchmark code.

## Steps

### Step 1: Find the Function
Locate the target function. Read it and understand:
- What are the inputs/outputs?
- What's the expected performance profile? (CPU-bound, I/O-bound, allocation-heavy)
- What sizes/inputs should be benchmarked?

### Step 2: Generate Benchmark

Create a benchmark file (`*_bench_test.go`) with:

1. **Basic benchmark** — `b.N` loop with representative input
2. **Sub-benchmarks** — vary input sizes if applicable (e.g., 10, 100, 1000, 10000 items)
3. **Setup outside the loop** — use `b.ResetTimer()` to exclude setup time
4. **Avoid compiler optimization** — assign results to a package-level var

Template:
```go
package mypackage

import "testing"

var benchResult any // prevent compiler from optimizing away the call

func BenchmarkTargetFunction(b *testing.B) {
    // Setup
    input := prepareInput()
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        benchResult = TargetFunction(input)
    }
}

// Sub-benchmarks for different sizes
func BenchmarkTargetFunction_Sizes(b *testing.B) {
    sizes := []int{10, 100, 1000, 10000}

    for _, size := range sizes {
        b.Run(fmt.Sprintf("size-%d", size), func(b *testing.B) {
            input := prepareInput(size)
            b.ResetTimer()

            for i := 0; i < b.N; i++ {
                benchResult = TargetFunction(input)
            }
        })
    }
}
```

### Step 3: Run the Benchmark

Execute the benchmark and capture results:
```bash
go test -bench=BenchmarkTargetFunction -benchmem -count=5 ./path/to/package
```

### Step 4: Analyze Results

Explain the output:
- **ns/op** — nanoseconds per operation
- **B/op** — bytes allocated per operation
- **allocs/op** — allocations per operation

Provide:
- Is the performance reasonable for what it does?
- Where are the allocations coming from?
- Suggestions for optimization (if needed)
- Comparison against a baseline or alternative implementation

### Step 5: Comparison Benchmark (Optional)

If there's an obvious optimization, write both versions:
```bash
go test -bench=. -benchmem -count=5 | tee before.txt
# ... apply optimization ...
go test -bench=. -benchmem -count=5 | tee after.txt
benchstat before.txt after.txt
```

Provide the benchmark file path and the commands to run it.
