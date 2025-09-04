import type { RequestHandler } from "@sveltejs/kit";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type AnthropicTypes from "@anthropic-ai/sdk";
import { GoogleGenerativeAI, type FunctionDeclaration, type Tool } from "@google/generative-ai";

type Provider = "openai" | "anthropic" | "gemini";

function badRequest(message: string, status = 400) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function getProvider(request: Request): Provider {
	const url = new URL(request.url);
	const q = (url.searchParams.get("provider") || "").toLowerCase();
	const h = (request.headers.get("x-provider") || "").toLowerCase();
	const provider = (q || h || "openai") as Provider;
	if (provider !== "openai" && provider !== "anthropic" && provider !== "gemini") return "openai";
	return provider;
}

function getAuthToken(request: Request): string | undefined {
	const auth = request.headers.get("authorization") || request.headers.get("Authorization");
	if (!auth) return undefined;
	const parts = auth.split(" ");
	if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer") return parts[1];
	return undefined;
}

function sse(headers?: HeadersInit) {
	return {
		headers: {
			"content-type": "text/event-stream; charset=utf-8",
			"cache-control": "no-cache, no-transform",
			"connection": "keep-alive",
			...headers,
		},
	} as const;
}

function toSSEData(data: unknown) {
	return `data: ${JSON.stringify(data)}\n\n`;
}

// ---- Anthropic adapter ----

async function anthropicParseRequest(
	req: OpenAI.Chat.Completions.ChatCompletionCreateParams
): Promise<AnthropicTypes.MessageCreateParams> {
	function convertToolChoice(
		tool_choice?: OpenAI.ChatCompletionToolChoiceOption
	): AnthropicTypes.MessageCreateParams["tool_choice"] | undefined {
		if (!tool_choice) return undefined;
		if (tool_choice === "auto") return { type: "auto" };
		if (tool_choice === "required") return { type: "any" };
		if (tool_choice === "none") return undefined;
		return { type: "tool", name: tool_choice.function.name } as AnthropicTypes.MessageCreateParams["tool_choice"];
	}

	async function convertMessages(
		messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
	): Promise<AnthropicTypes.MessageCreateParamsNonStreaming["messages"]> {
		return Promise.all(
			messages.map(async m => {
				if (!m.content) throw new Error("content is required");
				const role = m.role === "assistant" ? "assistant" : "user";
				if (typeof m.content === "string") {
					return {
						role,
						content: [{ type: "text", text: m.content }] as AnthropicTypes.TextBlockParam[],
					} as AnthropicTypes.MessageParam;
				}
				return {
					role,
					content: await Promise.all(
						m.content!.map(async c => {
							if (c.type === "text") {
								return { type: "text", text: c.text } as AnthropicTypes.TextBlockParam;
							}
							if (c.type === "image_url") {
								return {
									type: "image",
									source: { type: "base64", media_type: "image/png", data: c.image_url.url },
								} as AnthropicTypes.ImageBlockParam;
							}
							const maybeFile = c as unknown as { type?: string; file?: { file_data: string } };
							if (maybeFile?.type === "file" && maybeFile.file?.file_data) {
								return {
									type: "image",
									source: {
										type: "base64",
										media_type: "application/octet-stream",
										data: maybeFile.file.file_data,
									},
								} as unknown as AnthropicTypes.ImageBlockParam;
							}
							throw new Error("Unsupported content type");
						})
					),
				} as AnthropicTypes.MessageParam;
			})
		);
	}

	const stop_sequences = typeof req.stop === "string" ? [req.stop] : Array.isArray(req.stop) ? req.stop : undefined;
	const system = req.messages.find(m => m.role === "system")?.content as string | undefined;
	const userAssistant = req.messages.filter(m => m.role === "user" || m.role === "assistant");

	const base: AnthropicTypes.MessageCreateParamsNonStreaming = {
		model: req.model,
		stream: false,
		stop_sequences,
		system,
		messages: await convertMessages(userAssistant),
		max_tokens: req.max_tokens ?? 8192,
		temperature: typeof req.temperature === "number" ? req.temperature : undefined,
		tools: (req.tools
			? req.tools.map(t => ({
					name: t.function.name,
					description: t.function.description,
					input_schema: t.function.parameters,
				}))
			: undefined) as AnthropicTypes.MessageCreateParamsNonStreaming["tools"],
		tool_choice: convertToolChoice(req.tool_choice),
		metadata: { user_id: req.user },
	};
	if (!req.stream) return base;
	return { ...base, stream: true } as AnthropicTypes.MessageCreateParamsStreaming;
}

function anthropicParseResponse(resp: AnthropicTypes.Messages.Message): OpenAI.ChatCompletion {
	return {
		id: resp.id,
		object: "chat.completion",
		created: Math.floor(Date.now() / 1000),
		model: resp.model,
		usage: {
			prompt_tokens: resp.usage.input_tokens,
			completion_tokens: resp.usage.output_tokens,
			total_tokens: resp.usage.input_tokens + resp.usage.output_tokens,
		},
		choices: [
			{
				index: 0,
				message: {
					role: "assistant",
					content: resp.content.map(c => (c.type === "text" ? c.text : "")).join("") || "",
				},
				finish_reason: "stop",
				logprobs: null,
			},
		],
	} as OpenAI.ChatCompletion;
}

// ---- Gemini adapter ----

function geminiCreateClient(model: string, apiKey: string, req: OpenAI.Chat.Completions.ChatCompletionCreateParams) {
	const genAI = new GoogleGenerativeAI(apiKey);
	return genAI.getGenerativeModel({
		model,
		generationConfig: {
			temperature: typeof req.temperature === "number" ? req.temperature : undefined,
			maxOutputTokens: req.max_tokens as number | undefined,
			topP: req.top_p as number | undefined,
		},
		systemInstruction: (() => {
			const system = req.messages.find(m => m.role === "system")?.content;
			if (!system) return undefined;
			return typeof system === "string" ? system : system.map(s => s.text).join("");
		})(),
		tools: req.tools
			? ([
					{
						functionDeclarations: req.tools.map(t => ({
							name: t.function.name,
							description: t.function.description,
							parameters: t.function.parameters,
						})) as FunctionDeclaration[],
					},
				] as Tool[])
			: undefined,
	});
}

type GeminiPart = { text: string } | { fileData: { fileUri: string; mimeType: string } };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
type GeminiRequest = { contents: GeminiContent[] };

function geminiParseRequest(req: OpenAI.Chat.Completions.ChatCompletionCreateParams): GeminiRequest {
	return {
		contents: req.messages.map(m => ({
			role: m.role === "assistant" ? "model" : "user",
			parts:
				typeof m.content === "string"
					? [{ text: m.content }]
					: m.content!.map(c => {
							if (c.type === "text") return { text: c.text } as GeminiPart;
							if (c.type === "image_url")
								return { fileData: { fileUri: c.image_url.url, mimeType: "image/png" } } as GeminiPart;
							const maybeFile = c as { type?: string; file?: { file_data: string } };
							if (maybeFile?.type === "file" && maybeFile.file?.file_data) {
								return {
									fileData: {
										fileUri: maybeFile.file.file_data,
										mimeType: "application/octet-stream",
									},
								} as GeminiPart;
							}
							throw new Error("Unsupported content part");
						}),
		})),
	};
}

export const POST: RequestHandler = async ({ request }) => {
	const provider = getProvider(request);
	const apiKey = getAuthToken(request);
	if (!apiKey) return badRequest("Missing Authorization header", 401);

	let req: OpenAI.Chat.Completions.ChatCompletionCreateParams;
	try {
		req = (await request.json()) as OpenAI.Chat.Completions.ChatCompletionCreateParams;
	} catch {
		return badRequest("Invalid JSON body");
	}

	if (provider === "openai") {
		const client = new OpenAI({ apiKey });
		if (req.stream) {
			const stream = (await client.chat.completions.create({
				...req,
				stream: true,
			})) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
			const readable = new ReadableStream<Uint8Array>({
				async start(controller) {
					const encoder = new TextEncoder();
					try {
						for await (const chunk of stream) {
							controller.enqueue(encoder.encode(toSSEData(chunk)));
						}
					} catch (err: unknown) {
						const message = err instanceof Error ? err.message : String(err);
						controller.enqueue(encoder.encode(toSSEData({ error: message })));
					} finally {
						controller.close();
					}
				},
			});
			return new Response(readable, sse());
		}
		const response = await client.chat.completions.create({ ...req, stream: false });
		return new Response(JSON.stringify(response), { headers: { "content-type": "application/json" } });
	}

	if (provider === "anthropic") {
		const client = new Anthropic({ apiKey });
		if (req.stream) {
			const parsed = (await anthropicParseRequest(req)) as AnthropicTypes.MessageCreateParamsStreaming;
			const stream = await client.messages.create({ ...parsed, stream: true });
			const readable = new ReadableStream<Uint8Array>({
				async start(controller) {
					const encoder = new TextEncoder();
					let startMsg: AnthropicTypes.Messages.Message | undefined;
					try {
						for await (const ev of stream) {
							const base = () => ({
								id: startMsg?.id || "",
								object: "chat.completion.chunk",
								created: Math.floor(Date.now() / 1000),
								model: startMsg?.model || req.model,
							});
							if (ev.type === "message_start") startMsg = ev.message;
							else if (ev.type === "content_block_delta") {
								if (ev.delta.type !== "text_delta") continue;
								controller.enqueue(
									encoder.encode(
										toSSEData({ ...base(), choices: [{ index: ev.index, delta: { content: ev.delta.text } }] })
									)
								);
							} else if (ev.type === "message_delta") {
								if (req.stream_options?.include_usage) {
									controller.enqueue(
										encoder.encode(
											toSSEData({
												...base(),
												choices: [],
												usage: {
													prompt_tokens: startMsg!.usage.input_tokens,
													completion_tokens: ev.usage!.output_tokens,
													total_tokens: startMsg!.usage.input_tokens + ev.usage!.output_tokens,
												},
											})
										)
									);
								} else {
									controller.enqueue(
										encoder.encode(toSSEData({ ...base(), choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }))
									);
								}
							}
						}
					} catch (err: unknown) {
						controller.enqueue(encoder.encode(toSSEData({ error: err instanceof Error ? err.message : String(err) })));
					} finally {
						controller.close();
					}
				},
			});
			return new Response(readable, sse());
		}
		const parsed = (await anthropicParseRequest(req)) as AnthropicTypes.MessageCreateParamsNonStreaming;
		const resp = await client.messages.create(parsed);
		return new Response(JSON.stringify(anthropicParseResponse(resp)), {
			headers: { "content-type": "application/json" },
		});
	}

	// gemini
	const model = req.model;
	const client = geminiCreateClient(model, apiKey, req);
	if (req.stream) {
		const { stream } = await client.generateContentStream(geminiParseRequest(req));
		const id = "chatcmpl-" + crypto.randomUUID();
		const readable = new ReadableStream<Uint8Array>({
			async start(controller) {
				const encoder = new TextEncoder();
				try {
					for await (const chunk of stream) {
						controller.enqueue(
							encoder.encode(
								toSSEData({
									id,
									object: "chat.completion.chunk",
									created: Math.floor(Date.now() / 1000),
									model,
									choices: [
										{
											index: 0,
											delta: { content: chunk.text() },
											finish_reason: null,
										},
									],
								})
							)
						);
					}
					if (req.stream_options?.include_usage) {
						const last = await client.generateContent(geminiParseRequest(req));
						const usage = last.response.usageMetadata!;
						controller.enqueue(
							encoder.encode(
								toSSEData({
									id,
									object: "chat.completion.chunk",
									created: Math.floor(Date.now() / 1000),
									model,
									choices: [],
									usage: {
										prompt_tokens: usage.promptTokenCount,
										completion_tokens: usage.candidatesTokenCount,
										total_tokens: usage.totalTokenCount,
									},
								})
							)
						);
					} else {
						controller.enqueue(
							encoder.encode(
								toSSEData({
									id,
									object: "chat.completion.chunk",
									created: Math.floor(Date.now() / 1000),
									model,
									choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
								})
							)
						);
					}
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : String(err);
					controller.enqueue(encoder.encode(toSSEData({ error: message })));
				} finally {
					controller.close();
				}
			},
		});
		return new Response(readable, sse());
	}
	const { response } = await client.generateContent(geminiParseRequest(req));
	const out: OpenAI.ChatCompletion = {
		id: "chatcmpl-" + crypto.randomUUID(),
		object: "chat.completion",
		created: Math.floor(Date.now() / 1000),
		model,
		choices: [
			{
				index: 0,
				message: { role: "assistant", content: response.text(), refusal: null },
				finish_reason: "stop",
				logprobs: null,
			},
		],
		usage: {
			prompt_tokens: response.usageMetadata!.promptTokenCount,
			completion_tokens: response.usageMetadata!.candidatesTokenCount,
			total_tokens: response.usageMetadata!.totalTokenCount,
		},
	};
	return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
};
