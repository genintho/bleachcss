export default function findPattern(
    url: string
): { name: string; pattern: string } {
    const noScheme = url.replace(/.*:\/\//, "");
    const host = noScheme.split("/", 1)[0];
    const path = noScheme.replace(host, "").split("?", 1)[0];
    let pathName = path;
    let pathPattern = regexEscape(path);
    const query_pieces = noScheme
        .replace(host, "")
        .replace(path, "")
        .replace(/^\?/, "")
        .split("&");
    let queryNamePieces: string[] = [];
    let queryPatternPieces: string[] = [];

    Object.keys(pathVariations).forEach((variation) => {
        const { detect, replace } = pathVariations[variation];
        pathName = pathName.replace(detect, variation);
        pathPattern = pathPattern.replace(detect, replace);
    });

    query_pieces.forEach((piece) => {
        Object.keys(pathVariations).forEach((variation) => {
            const { detect, replace } = pathVariations[variation];
            pathName = pathName.replace(detect, variation);
            pathPattern = pathPattern.replace(detect, replace);
        });
        for (let variation in queryVariations) {
            const { detect, replace } = queryVariations[variation];
            if (detect.test(piece)) {
                queryNamePieces.push(variation);
                queryPatternPieces.push(replace);
                return;
            }
        }
        queryNamePieces.push(piece);
        queryPatternPieces.push(regexEscape(piece));
    });

    let queryName = queryNamePieces.join("&");
    queryName = queryName ? "?" + queryName : queryName;

    let queryPattern = queryPatternPieces.join("&");
    queryPattern = queryPattern ? "\\?" + queryPattern : queryPattern;

    let hostPattern =
        regexEscape(host.replace(domainDetectRegex, "")) + domainReplaceRegex;
    let hostName = host.replace(domainDetectRegex, ".<domain>");
    return {
        name: hostName + pathName + queryName,
        pattern: hostPattern + pathPattern + queryPattern,
    };
}
function regexEscape(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const commonSecondLevelDomains = [
    "ac",
    "co",
    "com",
    "edu",
    "gov",
    "me",
    "net",
    "org",
];
const domainReplaceRegex =
    "(.(" + commonSecondLevelDomains.join("|") + "))?.[^./]+";
const domainDetectRegex = new RegExp(domainReplaceRegex + "$", "i");

const pathVariations = {
    "<hash64>": {
        detect: /\b[0-9a-f]{64}\b/gi,
        replace: "[0-9a-f]{64}",
    },
    "<hash40>": {
        detect: /\b[0-9a-f]{40}\b/gi,
        replace: "[0-9a-f]{40}",
    },
    "<hash32>": {
        detect: /\b[0-9a-f]{32}\b/gi,
        replace: "[0-9a-f]{32}",
    },
    "_<hash32>_": {
        detect: /_[0-9a-f]{32}_/gi,
        replace: "_[0-9a-f]{32}_",
    },
    "<hash12>": {
        detect: /\b[0-9a-f]{12}\b/gi,
        replace: "[0-9a-f]{12}",
    },
    "<hash>": {
        detect: /\b[0-9a-f]{10,}\b/gi,
        replace: "[0-9a-f]{10,}",
    },
    "<unixtime>": {
        detect: /\b1[0-9]{9}\b/g,
        replace: "1[0-9]{9}",
    },
    "<unixtimeMillis>": {
        detect: /\b1[0-9]{12}\b/g,
        replace: "1[0-9]{12}",
    },
};
const queryVariations = {
    "timestamp=<timestamp>": {
        detect: /^timestamp=[\d]+$/i,
        replace: "timestamp=[\\d]+",
    },
    "v=<version>": {
        detect: /^v=([\d.]|[a-f\d])+$/i,
        replace: "v=([\\d.]|[a-f\\d])+",
    },
    "ver=<version>": {
        detect: /^ver=([\d.]|[a-f\d])+$/i,
        replace: "ver=([\\d.]|[a-f\\d])+",
    },
    "version=<version>": {
        detect: /^version=([\d.]|[a-f\d])+$/i,
        replace: "version=([\\d.]|[a-f\\d])+",
    },
};
