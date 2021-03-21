import PublicLibraryPatterns from "./PublicLibraryPatterns";

export default function findPublicLibrary(
	logger,
	url: string
): { name: string; pattern: string } | null {
	let match = (PublicLibraryPatterns as any).find((item) => {
		return new RegExp(item.pattern).test(url);
	});

	if (!match) {
		return null;
	}

	const m = new RegExp(match.pattern).exec(url);
	if (!m) {
		return null;
	}

	// We have a match, so we need to insert a new CSS File Definition with the information of known libraries
	const name = match.nameFromRegExp ? m[1] + " " + match.name : match.name;
	return {
		name,
		pattern: match.pattern,
	};
}
