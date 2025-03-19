export function fileToDataURL(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = function (event) {
			resolve(event.target?.result as string);
		};

		reader.onerror = function (error) {
			reject(error);
		};

		reader.readAsDataURL(file);
	});
}
