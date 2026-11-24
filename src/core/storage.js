export const CHANNEL = typeof __RH_CHANNEL__ !== 'undefined' ? __RH_CHANNEL__ : 'stable';
export const CORE_KEY = CHANNEL === 'dev' ? 'rh_dev_core' : 'rh_core';
export const FEATURE_KEY = (id) => CHANNEL === 'dev' ? `rh_dev_f_${id}` : `rh_f_${id}`;
export const AUDIO_DB = CHANNEL === 'dev' ? 'rhythmos-audio-dev' : 'rhythmos-audio';
export const SCAN_DB = CHANNEL === 'dev' ? 'rhythmos-scan-dev' : 'rhythmos-scan-v1';
