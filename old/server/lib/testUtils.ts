/**
 * Use this function when mocking the return value of a function returning a promise (async function)
 *
 * @param {anything} v The value you want to return
 * @returns {Promise<any>}
 */
export function promReturn(v) {
	return new Promise<any>((resolve) => {
		process.nextTick(() => {
			resolve(v);
		});
	});
}
