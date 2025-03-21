import { getManagerConfig, mergeChildConfig } from '../../../config';
import type {
  RegexManagerTemplates,
  RenovateConfig,
} from '../../../config/types';
import { allManagersList } from '../../../modules/manager';
import { isCustomManager } from '../../../modules/manager/custom';
import { validMatchFields } from '../../../modules/manager/custom/regex/utils';
import type { CustomExtractConfig } from '../../../modules/manager/types';
import type { WorkerExtractConfig } from '../../types';

export interface FingerprintExtractConfig {
  managerList: Set<string>;
  managers: WorkerExtractConfig[];
}

function getRegexManagerFields(
  config: WorkerExtractConfig
): CustomExtractConfig {
  const regexFields = {} as CustomExtractConfig;
  for (const field of validMatchFields.map(
    (f) => `${f}Template` as keyof RegexManagerTemplates
  )) {
    if (config[field]) {
      regexFields[field] = config[field];
    }
  }

  return {
    autoReplaceStringTemplate: config.autoReplaceStringTemplate,
    matchStrings: config.matchStrings,
    matchStringsStrategy: config.matchStringsStrategy,
    ...regexFields,
  };
}

function getFilteredManagerConfig(
  config: WorkerExtractConfig
): WorkerExtractConfig {
  return {
    ...(isCustomManager(config.manager) && getRegexManagerFields(config)),
    manager: config.manager,
    fileMatch: config.fileMatch,
    npmrc: config.npmrc,
    npmrcMerge: config.npmrcMerge,
    enabled: config.enabled,
    ignorePaths: config.ignorePaths ?? [],
    includePaths: config.includePaths ?? [],
    skipInstalls: config.skipInstalls,
    registryAliases: config.registryAliases,
    fileList: [],
  };
}

export function generateFingerprintConfig(
  config: RenovateConfig
): FingerprintExtractConfig {
  const managerExtractConfigs: WorkerExtractConfig[] = [];
  let managerList: Set<string>;
  const { enabledManagers } = config;
  if (enabledManagers?.length) {
    managerList = new Set(enabledManagers);
  } else {
    managerList = new Set(allManagersList);
  }

  for (const manager of managerList) {
    const managerConfig = getManagerConfig(config, manager);
    if (isCustomManager(manager)) {
      // TODO: filter regexManagers using customType
      for (const regexManager of config.regexManagers ?? []) {
        managerExtractConfigs.push({
          ...mergeChildConfig(managerConfig, regexManager),
          fileList: [],
        });
      }
    } else {
      managerExtractConfigs.push({ ...managerConfig, fileList: [] });
    }
  }

  return {
    managerList,
    managers: managerExtractConfigs.map(getFilteredManagerConfig),
  };
}
