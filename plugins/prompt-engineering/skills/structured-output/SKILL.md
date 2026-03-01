---
description: When the user asks about structured output from LLMs, JSON output, parsing LLM responses, type-safe AI output, Zod schemas for LLM output, XML output, function calling, tool use, or making LLM output machine-readable
---

# Structured Output

Get reliable, machine-parseable output from LLMs. Covers JSON mode, schema enforcement, XML patterns, function calling, and output parsing strategies.

## JSON Output with Schema Enforcement

### Anthropic Claude — Tool Use for Structured Output

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Define the output schema as a tool
const extractionTool = {
  name: 'extract_product_info',
  description: 'Extract structured product information from text',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Product name' },
      price: { type: 'number', description: 'Price in USD' },
      category: {
        type: 'string',
        enum: ['electronics', 'clothing', 'food', 'other'],
        description: 'Product category',
      },
      features: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key product features',
      },
      inStock: { type: 'boolean', description: 'Whether the product is in stock' },
    },
    required: ['name', 'price', 'category', 'features', 'inStock'],
  },
};

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  tools: [extractionTool],
  tool_choice: { type: 'tool', name: 'extract_product_info' },
  messages: [{
    role: 'user',
    content: 'Extract product info: "The UltraWidget Pro is a $49.99 smart gadget with WiFi, Bluetooth, and voice control. Currently available."',
  }],
});

// Parse the structured output
const toolUse = response.content.find(block => block.type === 'tool_use');
const product = toolUse?.input;
// { name: "UltraWidget Pro", price: 49.99, category: "electronics", features: ["WiFi", "Bluetooth", "voice control"], inStock: true }
```

### OpenAI — Structured Outputs (response_format)

```typescript
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const client = new OpenAI();

const ProductSchema = z.object({
  name: z.string(),
  price: z.number(),
  category: z.enum(['electronics', 'clothing', 'food', 'other']),
  features: z.array(z.string()),
  inStock: z.boolean(),
});

const completion = await client.beta.chat.completions.parse({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'Extract product information from the text.' },
    { role: 'user', content: 'The UltraWidget Pro is a $49.99 smart gadget...' },
  ],
  response_format: zodResponseFormat(ProductSchema, 'product'),
});

const product = completion.choices[0].message.parsed;
// Fully typed as z.infer<typeof ProductSchema>
```

## Zod Schema → Prompt Pattern

When you can't use native structured output, embed the schema in the prompt:

```typescript
import { z } from 'zod';

// Define your schema
const ReviewSchema = z.object({
  summary: z.string().describe('One-sentence summary of the review'),
  sentiment: z.enum(['positive', 'negative', 'mixed']),
  score: z.number().min(1).max(5),
  keyPoints: z.array(z.string()).min(1).max(5),
  recommendation: z.boolean(),
});

// Convert schema to prompt description
function schemaToPrompt(schema: z.ZodObject<any>): string {
  const shape = schema.shape;
  const fields = Object.entries(shape).map(([key, value]) => {
    const zodType = value as z.ZodTypeAny;
    return `  "${key}": ${zodType.description || zodType._def.typeName}`;
  });
  return `{\n${fields.join(',\n')}\n}`;
}

// Use in prompt
const prompt = `Analyze this product review and respond with ONLY valid JSON matching this schema:

${schemaToPrompt(ReviewSchema)}

Review: "${userReview}"`;

// Parse and validate response
const raw = JSON.parse(llmResponse);
const validated = ReviewSchema.parse(raw); // Throws if invalid
```

## XML Output Pattern

XML is better than JSON for long-form structured content (models find it easier to produce):

### Prompt

```
Analyze the following code and provide your review in XML format:

<review>
  <summary>One paragraph overview</summary>
  <issues>
    <issue severity="critical|warning|info">
      <file>path/to/file</file>
      <line>line number</line>
      <description>What's wrong</description>
      <fix>How to fix it</fix>
    </issue>
  </issues>
  <score>1-10</score>
</review>
```

### Parsing XML Output

```typescript
function parseReviewXML(xml: string) {
  // Extract XML block from response (model may add text around it)
  const match = xml.match(/<review>[\s\S]*?<\/review>/);
  if (!match) throw new Error('No review XML found in response');

  const reviewXml = match[0];

  // Simple regex parsing (for known structure)
  const summary = reviewXml.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim();
  const score = parseInt(reviewXml.match(/<score>(\d+)<\/score>/)?.[1] ?? '0');

  const issueRegex = /<issue severity="(\w+)">\s*<file>(.*?)<\/file>\s*<line>(.*?)<\/line>\s*<description>([\s\S]*?)<\/description>\s*<fix>([\s\S]*?)<\/fix>\s*<\/issue>/g;

  const issues = [];
  let issueMatch;
  while ((issueMatch = issueRegex.exec(reviewXml)) !== null) {
    issues.push({
      severity: issueMatch[1],
      file: issueMatch[2],
      line: parseInt(issueMatch[3]),
      description: issueMatch[4].trim(),
      fix: issueMatch[5].trim(),
    });
  }

  return { summary, score, issues };
}
```

## Function Calling / Tool Use

Let the model decide which function to call based on user intent:

```typescript
const tools = [
  {
    name: 'search_products',
    description: 'Search the product catalog by keyword, category, or price range',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords' },
        category: { type: 'string', enum: ['electronics', 'clothing', 'food'] },
        maxPrice: { type: 'number', description: 'Maximum price in USD' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_order_status',
    description: 'Check the status of an existing order by order ID',
    input_schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Order ID (e.g., ORD-12345)' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'create_support_ticket',
    description: 'Create a support ticket for issues that cannot be resolved automatically',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['subject', 'description', 'priority'],
    },
  },
];

// The model chooses the right tool based on user message:
// "Where's my order ORD-789?" → get_order_status({ orderId: "ORD-789" })
// "Show me headphones under $100" → search_products({ query: "headphones", maxPrice: 100 })
// "I have a billing problem" → create_support_ticket({ subject: "Billing issue", ... })
```

## Output Parsing Strategies

### Strategy 1: JSON Block Extraction

```typescript
function extractJSON(text: string): unknown {
  // Try direct parse first
  try { return JSON.parse(text); } catch {}

  // Extract from markdown code block
  const codeBlock = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]); } catch {}
  }

  // Extract first { ... } or [ ... ] block
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }

  throw new Error('No valid JSON found in response');
}
```

### Strategy 2: Retry with Error Feedback

```typescript
async function getStructuredOutput<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: string | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    const fullPrompt = lastError
      ? `${prompt}\n\nYour previous response had this error: ${lastError}\nPlease fix it and try again.`
      : prompt;

    const response = await callLLM(fullPrompt);

    try {
      const parsed = extractJSON(response);
      return schema.parse(parsed);
    } catch (err) {
      lastError = err instanceof z.ZodError
        ? `Validation error: ${err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`
        : `Parse error: ${(err as Error).message}`;
    }
  }

  throw new Error(`Failed to get valid structured output after ${maxRetries + 1} attempts`);
}
```

## When to Use Each Approach

| Approach | Best For | Reliability |
|----------|----------|-------------|
| **Tool use / function calling** | Structured extraction, routing | ★★★★★ (schema-enforced) |
| **response_format (OpenAI)** | JSON output with Zod schemas | ★★★★★ (guaranteed valid) |
| **JSON in prompt + parsing** | Any model, no SDK required | ★★★☆☆ (may need retries) |
| **XML in prompt** | Long-form structured content | ★★★★☆ (models handle well) |
| **Markdown conventions** | Human-readable structured output | ★★★☆☆ (flexible but less reliable) |

## Checklist

- [ ] Using native structured output (tool use / response_format) when available
- [ ] Schema defined with Zod for type safety and validation
- [ ] Output parser handles edge cases (extra text, markdown blocks)
- [ ] Retry logic with error feedback for unreliable formats
- [ ] Enum values used for categorical fields (not free text)
- [ ] Required fields specified to prevent missing data
- [ ] Field descriptions help the model understand what to produce
- [ ] Response validated against schema before use in application
