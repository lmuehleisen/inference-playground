export function createInit(cb: () => void) {
	let called = $state(false);

	return {
		fn: () => {
			if (called) return;
			called = true;
			cb();
		},
		get called() {
			return called;
		},
	};
}
