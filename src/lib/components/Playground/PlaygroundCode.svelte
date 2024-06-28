<script>
	const nonStreaming = `await hf.chatCompletion({
  model: "mistrali/Mistral-7B-Instruct-v0.2",
  messages: [{ role: "user", content: "Complete the this sentence with words one plus one is equal " }], 
  max_tokens: 500,
  temperature: 0.1,
  seed: 0,
});`;

	const streaming = `let out = "";

for await (const chunk of hf.chatCompletionStream({
  model: "mistrali/Mistral-7B-Instruct-v0.2",
  messages: [
    { role: "user", content: "Complete the equation 1+1= ,just the answer" }, 
  ],
  max_tokens: 500, 
  temperature: 0.1,
  seed: 0,
})) {
  if (chunk.choices && chunk.choices.length > 0) {
    out += chunk.choices[0].delta.content;
  }  
}`;
</script>

<div class="overflow-hidden p-8">
	<h2 class="mb-4 font-bold">Non-streaming API</h2>
	<pre
		class="overflow-x-auto rounded-md bg-gray-800 p-4 text-sm text-white">{@html nonStreaming}</pre>

	<h2 class="my-4 font-bold">Streaming API</h2>
	<pre class="overflow-x-auto rounded-md bg-gray-800 p-4 text-sm text-white">{streaming}</pre>
</div>
