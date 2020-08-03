import * as utils from './utils.js';
import * as consoleM from '../../../common/dist/console.js';

const LOG_LEVEL_OPTION_IDS: consoleM.LogLevelsDict<string> = {
  LOG: 'logLevel-log',
  WARN: 'logLevel-warn',
  ERROR: 'logLevel-error',
};

const MOD_ENABLED_OPTION_ID_PREFIX = 'modEnabled-';

ig.module('ccloader-runtime.ui.options')
  .requires(
    'impact.base.font',
    'game.feature.font.font-system',
    'game.feature.model.options-model',
    'game.feature.menu.gui.options.options-list',
    'game.feature.menu.gui.options.options-types',
  )
  .defines(() => {
    utils.addEnumMember(sc.OPTION_CATEGORY, 'MODS');

    for (let [index, level] of consoleM.LOG_LEVEL_NAMES.entries()) {
      let def: sc.OptionDefinition = {
        type: 'CHECKBOX',
        cat: sc.OPTION_CATEGORY.GENERAL,
        init: consoleM.DEFAULT_LOG_LEVELS[level],
        restart: true,
      };
      if (index === 0) {
        def.hasDivider = true;
        def.header = 'logLevel';
      }
      sc.OPTIONS_DEFINITION[LOG_LEVEL_OPTION_IDS[level]] = def;
    }

    if ('OptionInfoBox' in sc) {
      sc.OPTIONS_DEFINITION['mods-description'] = {
        type: 'INFO',
        cat: sc.OPTION_CATEGORY.MODS,
        data: 'options.mods-description.description',
        marginBottom: 6,
      };
    }

    let installedMods = Array.from(modloader.installedMods.values())
      .filter((mod) => mod !== modloader._runtimeMod)
      .sort((mod1, mod2) => utils.compare(mod1.id, mod2.id));
    for (let mod of installedMods) {
      sc.OPTIONS_DEFINITION[`${MOD_ENABLED_OPTION_ID_PREFIX}${mod.id}`] = {
        type: 'CHECKBOX',
        cat: sc.OPTION_CATEGORY.MODS,
        init: true,
        restart: true,
        checkboxRightAlign: true,
      };
    }

    sc.fontsystem.font.pushIconSet(
      new ig.Font('mod://ccloader-runtime/media/icons.png', 16, ig.MultiFont.ICON_START),
      {
        mods: 0,
      },
    );

    sc.OptionsTabBox.prototype.tabs.mods = null!;
    sc.OptionsTabBox.inject({
      init(...args) {
        this.parent(...args);
        this.tabs.mods = this._createTabButton(
          'mods',
          this.tabArray.length,
          sc.OPTION_CATEGORY.MODS,
        );
        this._rearrangeTabs();
      },
    });

    sc.OptionModel.inject({
      onStorageGlobalSave(globalsData, ...args) {
        let result = this.parent(globalsData, ...args);

        let { options } = globalsData;

        let logLevels = {} as consoleM.LogLevelsDict;
        for (let level of consoleM.LOG_LEVEL_NAMES) {
          logLevels[level] = options[LOG_LEVEL_OPTION_IDS[level]] as boolean;
        }
        consoleM.setLogLevels(logLevels);

        const { modDataStorage } = modloader;
        for (let [modID, mod] of modloader.installedMods) {
          if (mod === modloader._runtimeMod) continue;
          let enabled = options[`${MOD_ENABLED_OPTION_ID_PREFIX}${modID}`] as boolean;
          modDataStorage.setModEnabled(modID, enabled);
        }
        modDataStorage.write().catch((err) => {
          console.error('Failed to write mod data and settings:', err);
        });

        return result;
      },
    });
  });