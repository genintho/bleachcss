export interface PublicLibraryPattern1 {
	readonly name: string;
	readonly pattern: string;
	readonly examples: string[];
}

export interface PublicLibraryPattern2 {
	readonly name: string;
	readonly pattern: string;
	readonly nameFromRegExp?: boolean;
	readonly examples: Record<string, string>;
}

export function findPublicLibrary(
	url: string
): { name: string; pattern: string } | null {
	let match = LIBRARIES.find((item) => {
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
	const name =
		// @ts-ignore
		match.nameFromRegExp === true ? m[1] + " " + match.name : match.name;
	return {
		name,
		pattern: match.pattern,
	};
}

export const LIBRARIES: (PublicLibraryPattern1 | PublicLibraryPattern2)[] = [
	{
		name: "Google Fonts",
		pattern: "fonts.googleapis.com/[css|earlyaccess]",
		examples: [
			"https://fonts.googleapis.com/earlyaccess/notokufiarabic.css",
			"http://fonts.googleapis.com/earlyaccess/notosanskr.css",
			"http://fonts.googleapis.com/css?family=Lato:100,300,regular,700,900%7COpen+Sans:300%7CIndie+Flower:regular%7COswald:300,regular,700&subset=latin%2Clatin-ext",
		],
	},
	{
		name: "Gravatar",
		// pattern: "s.gravatar\.com\/css\/[a-z]*?\.css\?ver=",
		pattern: "s.gravatar.com/css/[a-z]*?.css\\?ver=",
		examples: [
			"http://s.gravatar.com/css/services.css?ver=2017Maraa",
			"http://s.gravatar.com/css/hovercard.css?ver=2017Maraa",
		],
	},
	{
		name: "YouTube embed player",
		pattern: "www.youtube.com/yts/cssbin/",
		examples: [
			"https://www.youtube.com/yts/cssbin/www-embed-player-2x-vflVMZ7m5.css",
		],
	},
	{
		name: "on jsdelivr",
		nameFromRegExp: true,
		pattern: "cdn.jsdelivr.net/(.+?)/",
		examples: {
			emojione:
				"https://cdn.jsdelivr.net/emojione/2.2.7/assets/css/emojione.min.css",
		},
	},
	{
		name: "Yahoo Pure",
		pattern: "yui.yahooapis.com/pure/.+/pure-min.css$",
		examples: ["http://yui.yahooapis.com/pure/0.5.0/pure-min.css"],
	},
	{
		name: "Data Tables",
		pattern: "cdn.datatables.net/.*min.css",
		examples: [
			"http://cdn.datatables.net/1.10.12/css/jquery.dataTables.min.css?ver=4.7.2",
			"http://cdn.datatables.net/buttons/1.2.1/css/buttons.dataTables.min.css?ver=4.7.2",
			"http://cdn.datatables.net/select/1.2.0/css/select.dataTables.min.css?ver=4.7.2",
			"http://cdn.datatables.net/fixedheader/3.1.2/css/fixedHeader.dataTables.min.css?ver=4.7.2",
			"http://cdn.datatables.net/fixedcolumns/3.2.2/css/fixedColumns.dataTables.min.css?ver=4.7.2",
			"http://cdn.datatables.net/responsive/2.1.0/css/responsive.dataTables.min.css?ver=4.7.2",
		],
	},
	{
		name: "Facebook",
		pattern: "//www.facebook.com/rsrc.php/v3/",
		examples: [
			"https://www.facebook.com/rsrc.php/v3/y5/r/YuE4mlSfB2e.css",
			"https://www.facebook.com/rsrc.php/v3/yh/r/qmaTWKFBiZz.css",
		],
	},
	{
		name: "VK",
		pattern: "//vk.com/css",
		examples: [
			"https://vk.com/css/al/lite.css?32375767441",
			"https://vk.com/css/al/widget_community.css?29256813484",
			"https://vk.com/css/al/lite.css?35004468639",
		],
	},
	{
		name: "jQuery UI",
		pattern: "//code.jquery.com/ui/",
		examples: [
			"http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css",
			"http://code.jquery.com/ui/1.12.0/themes/base/jquery-ui.css",
			"http://code.jquery.com/ui/1.9.0/themes/base/jquery-ui.css,",
		],
	},
	{
		name: "Font-Awesome MaxCDN",
		pattern: "//maxcdn.bootstrapcdn.com/font-awesome/",
		examples: [
			"https://maxcdn.bootstrapcdn.com/font-awesome/4.1.0/css/font-awesome.min.css",
			"https://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css?ver=4.3.0",
			"http://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css",
			"http://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css?ver=4.6.3",
		],
	},
	{
		name: "Bootstrap MaxCDN",
		pattern: "//maxcdn.bootstrapcdn.com/bootstrap/",
		examples: [
			"https://maxcdn.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css",
			"https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap-theme.min.css",
			"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css?ver=4.7.2",
			"http://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css",
			"http://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.2/css/bootstrap.min.css?ver=4.7.2",
		],
	},
	{
		name: "on Cloudflare",
		nameFromRegExp: true,
		pattern: "//cdnjs.cloudflare.com/ajax/libs/(.+?)/",
		examples: {
			select2:
				"http://cdnjs.cloudflare.com/ajax/libs/select2/4.0.1/css/select2.min.css",
			"meyer-reset":
				"http://cdnjs.cloudflare.com/ajax/libs/meyer-reset/2.0/reset.min.css",
			"font-awesome":
				"http://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css?ver=4.1.9",
			"hover.css":
				"https://cdnjs.cloudflare.com/ajax/libs/hover.css/2.0.2/css/hover-min.css",
		},
	},
	{
		name: "Google Ads",
		pattern: "//tpc.googlesyndication.com/",
		examples: [
			"https://tpc.googlesyndication.com/sadbundle/$csp%3Der3$/8258083306377117186/css/Main.css",
			"https://tpc.googlesyndication.com/pagead/gadgets/suggestion_autolayout_V2/static_image_logo_v3.css",
		],
	},
	{
		name: "Google Search",
		pattern: "//www.google.com/uds/api/search/",
		examples: [
			"http://www.google.com/uds/api/search/1.0/581c068e7ad56cae00e4e2e8f7dc3837/default+en.css",
			"https://www.google.com/uds/api/search/1.0/30a7b43bf733edc52dc094738e892a6c/default+ja.css",
		],
	},
	{
		name: "on Bootstrapcdn",
		nameFromRegExp: true,
		pattern: "//netdna.bootstrapcdn.com/(.+?)/",
		examples: {
			bootstrap:
				"https://netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css",
			"font-awesome":
				"http://netdna.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css?2&ver=4.2.0",
		},
	},
	{
		name: "jQuery UI on Google CDN",
		pattern: "//ajax.googleapis.com/ajax/libs/jqueryui",
		examples: [
			"https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.2/themes/smoothness/jquery-ui.css?ver=4.7.3",
			"https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.4/themes/base/jquery-ui.css",
		],
	},
	{
		name: "Coinbase Checkout",
		pattern: "//www.coinbase.com/assets/",
		examples: [
			"https://www.coinbase.com/assets/application-59e4ce88ee00ef35784a4b14247e37e193e776337ccf8c7865101c54d50ad900.css",
		],
	},
	{
		name: "Google API",
		pattern: "//apis.google.com/_/scs/apps-static/",
		examples: [
			"https://apis.google.com/_/scs/apps-static/_/ss/k=oz.plusone.-1bhnwjczbudae.R.W.O/d=0/rs=AGLTcCOpawyvgROcRbUf0FbX75iaQwsoow",
		],
	},
	{
		name: "Flashalking Ads",
		pattern: "//secure.flashtalking.com|//cdn.flashtalking.com",
		examples: [
			"https://secure.flashtalking.com/64105/1524916/style.css",
			"https://cdn.flashtalking.com/64105/1524915/css-reset.css",
		],
	},
	{
		name: "Wordpress Plugin",
		nameFromRegExp: true,
		pattern: "/wp-content/plugins/(.+?)/",
		examples: {
			"youtube-channel-gallery":
				"http://www.tribunaonline.com.br/wp-content/plugins/youtube-channel-gallery/styles.css?ver=4.7.2",
			"simple-lightbox":
				"http://www.tribunaonline.com.br/wp-content/plugins/simple-lightbox/client/css/app.css?ver=2.6.0",
			"squelch-tabs-and-accordions-shortcodes":
				"http://www.tribunaonline.com.br/wp-content/plugins/squelch-tabs-and-accordions-shortcodes/css/squelch-tabs-and-accordions.css?ver=0.3.9",
		},
	},
	{
		name: "Wordpress Plugin",
		nameFromRegExp: true,
		pattern: "/wp-content/themes/pub/(.+?)/",
		examples: {
			twentytwelve:
				"https://s0.wp.com/wp-content/themes/pub/twentytwelve/style.css?m=1463090519h",
			inove: "https://s0.wp.com/wp-content/themes/pub/inove/style.css",
		},
	},
	{
		name: "Wordpress Plugin",
		nameFromRegExp: true,
		pattern: "/wp-content/themes/(.+?)/",
		examples: {
			fashionistas:
				"http://www.thefashiontip.com/wp-content/themes/fashionistas/css/athemes-symbols.css?ver=4.5.6",
			"tema-elsoldemexico":
				"https://www.elsoldemexico.com.mx/wp-content/themes/tema-elsoldemexico/css/reset-min.css",
		},
	},
	{
		name: "Wordpress Must Use Plugin",
		nameFromRegExp: true,
		pattern: "/mu-plugins/(.+?)/",
		examples: {
			"highlander-comments":
				"https://s2.wp.com/wp-content/mu-plugins/highlander-comments/rtl/style-rtl.css?m=1424115551h",
			carousel:
				"https://s0.wp.com/wp-content/mu-plugins/carousel/rtl/jetpack-carousel-rtl.css?m=1458924076h",
		},
	},
	{
		name: "Vimeo Video Player",
		pattern: "//f.vimeocdn.com/p/",
		examples: ["https://f.vimeocdn.com/p/2.53.8/css/player.css"],
	},
];
