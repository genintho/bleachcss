export enum QueryFcn {
	"General",
	"id",
	"class",
}
export type Parse1ApiItem = {
	selector: string;
	exists: boolean;
	parent: string | null;
	fcn: QueryFcn;
};

export type Parse1Api = Parse1ApiItem[];
