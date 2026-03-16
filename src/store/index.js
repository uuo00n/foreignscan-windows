import { createStore } from 'vuex';

import * as ui from './modules/ui';
import * as scenes from './modules/scenes';
import * as records from './modules/records';
import * as detectJobs from './modules/detectJobs';

const collectState = (...mods) => () => mods.reduce((acc, mod) => ({
  ...acc,
  ...(typeof mod.state === 'function' ? mod.state() : {})
}), {});

const collect = (key, ...mods) => mods.reduce((acc, mod) => ({
  ...acc,
  ...(mod[key] || {})
}), {});

export default createStore({
  state: collectState(ui, scenes, records, detectJobs),
  getters: collect('getters', ui, scenes, records, detectJobs),
  mutations: collect('mutations', ui, scenes, records, detectJobs),
  actions: collect('actions', ui, scenes, records, detectJobs)
});
