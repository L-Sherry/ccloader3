import {
	IMPACT_CONFIGURATION,
	MAIN_SCRIPT_URL,
	REQUIRED_SCRIPT_URLS,
	REQUIRED_STYLESHEET_URLS,
} from './game.config.js';

export async function buildNecessaryDOM(): Promise<void> {
	let base = document.createElement('base');
	base.href = `${location.origin}/assets/`;
	document.head.appendChild(base);

	// meta tags have been removed, they appear to not affect anything

	let canvas = document.createElement('canvas');
	canvas.id = 'canvas';
	let div = document.createElement('div');
	div.id = 'game';
	div.appendChild(canvas);

	// By default the game's HTML page also contains a div element for the "option
	// list" described above, but it is useless as described above, so I removed
	// it. Fortunately jQuery functions don't complain when I remove it because
	// they operate on arrays of elements and handle empty arrays perfectly well.

	// The last inline script has been removed because:
	//  a) it contains an `uncaughtException` handler that silently hides all
	//     errors. Possibly a bug, though it is unlikely that it will be fixed soon
	//     if at all;
	//  b) responsibility of `doStartCrossCodePlz` is handled by the modloader
	//     itself.

	document.body.appendChild(div);
	document.body.style.overflow = 'hidden';

	Object.assign(window, IMPACT_CONFIGURATION);

	await Promise.all([
		...REQUIRED_STYLESHEET_URLS.map((url) => loadStylesheet(url)),
		...REQUIRED_SCRIPT_URLS.map((url) =>
			// async is turned off so that these scripts are loaded in the order of
			// addition
			loadScript(url, { async: false }),
		),
	]);
}

declare global {
	namespace ig {
		function _DOMReady(): void;

		interface System {
			setGameNow(this: this, gameClass: unknown): void;
		}

		// eslint-disable-next-line no-var
		var system: System;
	}

	function startCrossCode(): void;
}

export async function loadMainScript(): Promise<() => void> {
	let domReadyCallback: () => void = null!;
	callOnIgInitialization(() => {
		domReadyCallback = window.ig._DOMReady;
		window.ig._DOMReady = () => {};
	});

	// async is turned off so that the main script blocks the UI thread while it
	// is being executed
	await loadScript(MAIN_SCRIPT_URL, { async: false });

	if (domReadyCallback == null) throw new Error('domReadyCallback');

	return domReadyCallback;
}

function callOnIgInitialization(callback: () => void): void {
	Object.defineProperty(window, 'ig', {
		configurable: true,
		enumerable: true,

		get() {
			// eslint-disable-next-line no-undefined
			return undefined;
		},

		set(value: typeof ig) {
			delete window.ig;
			window.ig = value;
			callback();
		},
	});
}

export async function getStartFunction(): Promise<() => void> {
	return new Promise((resolve) => {
		// TODO: this replicates the behavior from the original HTML page, I hope we
		// can find a better solution to catch `window.startCrossCode` immediately.
		// Note that most of the time the `setTimeout` won't be fired since at this
		// time `startCrossCode` is most likely available because of the delays
		// caused by mods and event loop ticks caused by usages of promises in the
		// modloader.
		(function waitForStartFunction() {
			if (typeof window.startCrossCode === 'function') {
				resolve(window.startCrossCode);
			} else {
				console.log('wait');
				setTimeout(waitForStartFunction, 100);
			}
		})();
	});
}

export async function waitForIgGameInitialization(): Promise<void> {
	return new Promise((resolve) => {
		let realSetGameNow = window.ig.system.setGameNow;
		window.ig.system.setGameNow = function (...args) {
			let result = realSetGameNow.apply(this, args);
			resolve();
			return result;
		};
	});
}

function loadStylesheet(url: string): Promise<void> {
	return new Promise((resolve, reject) => {
		let link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = url;
		link.addEventListener('load', () => resolve());
		link.addEventListener('error', () =>
			reject(new Error(`Failed to load stylesheet '${url}'`)),
		);
		document.head.appendChild(link);
	});
}

function loadScript(
	url: string,
	options: { type?: string | null; async?: boolean | null } = {},
): Promise<void> {
	return new Promise((resolve, reject) => {
		let script = document.createElement('script');
		script.src = url;
		if (options.type != null) script.type = options.type;
		if (options.async != null) script.async = options.async;
		script.addEventListener('load', () => resolve());
		script.addEventListener('error', () =>
			reject(new Error(`Failed to load script '${url}'`)),
		);
		document.body.appendChild(script);
	});
}
