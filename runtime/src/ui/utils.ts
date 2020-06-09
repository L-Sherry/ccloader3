import { LocalizedString } from '../../../src/public/manifest';
import { Mod } from '../../../src/public/mod';

export function getLocalizedString(
	str: LocalizedString | null | undefined,
): string | null | undefined {
	if (str == null || typeof str === 'string') return str;
	return str[ig.currentLang] ?? str.en_US;
}

export function getModTitle(mod: Mod): string {
	return getLocalizedString(mod.manifest.title) ?? mod.manifest.id;
}
