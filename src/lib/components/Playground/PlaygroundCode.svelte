<script>
	export let model = '';

	const npmSnippet = `import { HfInference } from '@huggingface/inference'

const hf = new HfInference('your access token')`;

	$: nonStreaming = `await hf.chatCompletion({
  model: "${model}",
  messages: [
    { role: "user", content: "Complete the this sentence with words one plus one is equal " }
  ], 
  max_tokens: 500,
  temperature: 0.1,
  seed: 0,
});`;

	$: streaming = `let out = "";

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

<div class="pt-2">
	<div
		class="border-b border-gray-200 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400"
	>
		<ul class="-mb-px flex flex-wrap">
			<li>
				<a
					href="#"
					class="active inline-block rounded-t-lg border-b-2 border-black p-4 text-black dark:border-blue-500 dark:text-blue-500"
					aria-current="page">Huggingface.js</a
				>
			</li>
			<li>
				<a
					href="#"
					class="inline-block rounded-t-lg border-b-2 border-transparent p-4 hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300"
					>Curl</a
				>
			</li>
		</ul>
	</div>

	<div class="px-4 pb-4 pt-6">
		<h2 class="font-semibold">Install and instantiate</h2>
	</div>
	<pre
		class="overflow-x-auto border-y border-y-gray-100 bg-gray-50 px-4 py-6 text-sm">{npmSnippet}</pre>
	<div class="px-4 pb-4 pt-6">
		<h2 class="font-semibold">Non-Streaming API</h2>
	</div>
	<pre
		class="overflow-x-auto border-y border-y-gray-100 bg-gray-50 px-4 py-6 text-sm">{nonStreaming}</pre>
	<div class="px-4 pb-4 pt-6">
		<h2 class="font-semibold">Streaming API</h2>
	</div>
	<pre
		class="overflow-x-auto border-y border-gray-100 bg-gray-50 px-4 py-6 text-sm">{streaming}</pre>
</div>
