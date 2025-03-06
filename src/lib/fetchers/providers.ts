export interface HuggingFaceModelResponse {
	_id: string;
	id: string;
	inferenceProviderMapping: InferenceProviderMapping;
}

export type InferenceProviderMapping = {
	[k: string]: Provider;
};

export interface Provider {
	status: string;
	providerId: string;
	task: string;
}

/**
 * Error thrown when the Hugging Face API request fails
 */
export class HuggingFaceApiError extends Error {
	status: number;
	details: string;

	constructor(message: string, status: number, details: string) {
		super(message);
		this.name = "HuggingFaceApiError";
		this.status = status;
		this.details = details;
	}
}

/**
 * Fetches model data from the Hugging Face API
 *
 * @param modelId - The Hugging Face model ID (can include namespace like "username/model-name")
 * @param token - Optional Hugging Face API token for authentication
 * @returns Promise resolving to the model data
 * @throws {HuggingFaceApiError} When the API request fails
 */
export async function fetchHuggingFaceModel(modelId: string, token?: string): Promise<HuggingFaceModelResponse> {
	if (!modelId) {
		throw new Error("Model ID is required");
	}

	// Construct the API URL
	const apiUrl = `https://huggingface.co/api/models/${modelId}?expand%5B%5D=inferenceProviderMapping`;

	// Prepare headers for the request
	const headers: HeadersInit = {};
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	try {
		// Make the request to Hugging Face API
		const response = await fetch(apiUrl, {
			method: "GET",
			headers,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new HuggingFaceApiError("Failed to fetch data from Hugging Face API", response.status, errorText);
		}

		return (await response.json()) as HuggingFaceModelResponse;
	} catch (error) {
		if (error instanceof HuggingFaceApiError) {
			throw error;
		}

		// Handle other errors (network, etc.)
		throw new Error(
			`Error fetching Hugging Face model data: ${error instanceof Error ? error.message : "Unknown error"}`
		);
	}
}
