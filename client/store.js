import { observable, computed } from "mobx";
import {
  isChunkParsed,
  walkModules,
  getChunksForPath,
  createGroupsFromJson
} from "./utils";

const initialModules = [];

const pathDefaults = {
  path: null,
  selectedSize: `gzipSize`,
  showConcatenatedModulesContent: false,
  showDetailedQueryResults: false
};

export class Store {
  cid = 0;
  sizes = new Set([/*"statSize",*/ "parsedSize", "gzipSize"]);

  @observable.ref allChunks = initialModules;
  @observable.shallow selectedChunks = initialModules;
  @observable searchQuery = "";
  @observable defaultSize = pathDefaults.selectedSize;
  @observable selectedSize = pathDefaults.selectedSize;
  @observable showConcatenatedModulesContent =
    pathDefaults.showConcatenatedModulesContent;
  @observable path = pathDefaults.path;
  @observable jsonGroups = {};
  @observable showDetailedQueryResults = pathDefaults.showDetailedQueryResults;

  fetchesInProgress = {};

  getURLHash() {
    const params = new URLSearchParams();

    Object.keys(pathDefaults).forEach(key => {
      if (this[key] !== pathDefaults[key]) {
        params.set(key, this[key]);
      }
    });

    return `#` + params.toString();
  }

  handleURLparams(hash, historyArgs) {
    const params = new URLSearchParams(
      hash && hash.length > 1 ? hash.substr(1) : ``
    );

    if (!params.get(`path`)) {
      params.set(`path`, ``);
    }

    for (var [key, value] of params.entries()) {
      // console.log({ key, value });

      if (this[key] !== key) {
        if (key === `path`) {
          this.setPath(value, historyArgs);
        } else if (
          key === `showConcatenatedModulesContent` ||
          key === `showDetailedQueryResults`
        ) {
          this[key] = value === `true`;
        } else {
          this[key] = value;
        }
      }
    }

    this.updateHistory(historyArgs);
  }

  initial = true;

  updateHistory({ doHistoryAction = true } = {}) {
    if (doHistoryAction) {
      const newHash = this.getURLHash();
      if (newHash === location.hash) {
        return;
      }

      const historyAction = (this.initial
        ? history.replaceState
        : history.pushState
      ).bind(history);

      if (this.initial) {
        this.initial = false;
      }

      historyAction(null, null, this.getURLHash());
    }
  }

  setPath(path, historyArgs) {
    if (path === this.path) {
      return;
    }

    const allChunks = getChunksForPath(path);

    this.path = path;
    this.allChunks = allChunks;
    this.selectedChunks = this.allChunks;

    this.updateHistory(historyArgs);
  }

  setShowConcatenatedModulesContent(value) {
    if (this.showConcatenatedModulesContent !== value) {
      this.showConcatenatedModulesContent = value;
      this.updateHistory();
    }
  }

  setShowDetailedQueryResults(value) {
    if (this.showDetailedQueryResults !== value) {
      this.showDetailedQueryResults = value;
      this.updateHistory();
    }
  }

  setSelectedSize(value) {
    if (this.selectedSize !== value) {
      this.selectedSize = value;
      this.updateHistory();
    }
  }

  @computed get hasParsedSizes() {
    return this.allChunks.some(isChunkParsed);
  }

  @computed get activeSize() {
    const activeSize = this.selectedSize || this.defaultSize;

    if (/*!this.hasParsedSizes ||*/ !this.sizes.has(activeSize)) {
      return "statSize";
    }

    return activeSize;
  }

  @computed get visibleChunks() {
    const visibleChunks = this.allChunks.filter(chunk =>
      this.selectedChunks.includes(chunk)
    );

    const filteredChunks = this.filterModulesForSize(
      visibleChunks,
      this.activeSize
    );

    return filteredChunks;
  }

  @computed get allChunksSelected() {
    return this.visibleChunks.length === this.allChunks.length;
  }

  @computed get totalChunksSize() {
    return this.allChunks.reduce(
      (totalSize, chunk) => totalSize + (chunk[this.activeSize] || 0),
      0
    );
  }

  @computed get totalChunksSizeParsed() {
    return this.allChunks.reduce(
      (totalSize, chunk) => totalSize + (chunk.parsedSize || 0),
      0
    );
  }

  @computed get totalChunksSizeGzip() {
    return this.allChunks.reduce(
      (totalSize, chunk) => totalSize + (chunk.gzipSize || 0),
      0
    );
  }

  @computed get searchQueryRegexp() {
    const query = this.searchQuery.trim();

    if (!query) {
      return null;
    }

    try {
      return new RegExp(query, "iu");
    } catch (err) {
      return null;
    }
  }

  @computed get isSearching() {
    return !!this.searchQueryRegexp;
  }

  @computed get foundModulesByChunk() {
    if (!this.isSearching) {
      return [];
    }

    const query = this.searchQueryRegexp;

    return this.visibleChunks
      .map(chunk => {
        let foundGroups = [];

        walkModules(chunk.groups, module => {
          let weight = 0;

          /**
           * Splitting found modules/directories into groups:
           *
           * 1) Module with matched label (weight = 4)
           * 2) Directory with matched label (weight = 3)
           * 3) Module with matched path (weight = 2)
           * 4) Directory with matched path (weight = 1)
           */
          if (query.test(module.label)) {
            weight += 3;
          } else if (module.path && query.test(module.path)) {
            weight++;
          }

          if (!weight) return;

          if (!module.groups) {
            weight += 1;
          }

          const foundModules = (foundGroups[weight - 1] =
            foundGroups[weight - 1] || []);
          foundModules.push(module);
        });

        const { activeSize } = this;

        // Filtering out missing groups
        foundGroups = foundGroups.filter(Boolean).reverse();
        // Sorting each group by active size
        foundGroups.forEach(modules =>
          modules.sort((m1, m2) => m2[activeSize] - m1[activeSize])
        );

        return {
          chunk,
          modules: [].concat(...foundGroups)
        };
      })
      .filter(result => result.modules.length > 0)
      .sort((c1, c2) => c1.modules.length - c2.modules.length);
  }

  @computed get foundModules() {
    return this.foundModulesByChunk.reduce(
      (arr, chunk) => arr.concat(chunk.modules),
      []
    );
  }

  @computed get hasFoundModules() {
    return this.foundModules.length > 0;
  }

  @computed get hasConcatenatedModules() {
    let result = false;

    walkModules(this.visibleChunks, module => {
      if (module.concatenated) {
        result = true;
        return false;
      }
    });

    return result;
  }

  @computed get foundModulesSize() {
    return this.foundModules.reduce(
      (summ, module) => summ + module[this.activeSize],
      0
    );
  }

  filterModulesForSize(modules, sizeProp) {
    return modules.reduce((filteredModules, module) => {
      if (module[sizeProp]) {
        if (module.groups) {
          const showContent =
            !module.concatenated || this.showConcatenatedModulesContent;

          module = {
            ...module,
            groups: showContent
              ? this.filterModulesForSize(module.groups, sizeProp)
              : null
          };
        }

        if (
          this.showDetailedQueryResults &&
          module.fetch &&
          (!module.groups || module.groups.length === 0)
        ) {
          // if we have results -> show them
          // if we don't have results:
          //   - if we are already fetching -> do nothing
          //   - otherwise -> fetch

          if (this.jsonGroups[module.fetch]) {
            module = {
              ...module,
              groups: this.jsonGroups[module.fetch]
            };
          } else if (!this.fetchesInProgress[module.fetch]) {
            this.fetchesInProgress[module.fetch] = true;

            fetch(module.fetch)
              .then(res => res.json())
              .then(json => {
                this.fetchesInProgress[module.fetch] = false;
                this.jsonGroups[module.fetch] = createGroupsFromJson(
                  json,
                  module
                );
              })
              .catch(e => {
                this.fetchesInProgress[module.fetch] = false;
                console.log("no bueno for fetching some json", module.fetch, e);
              });
          }
        }

        if (
          this.showDetailedQueryResults &&
          module.fetch &&
          (!module.groups || module.groups.length === 0) &&
          this.jsonGroups[module.fetch]
        ) {
          // console.log(
          //   "we are in filterModulesForSize and and have",
          //   module.fetch,
          //   this.jsonGroups[module.fetch]
          // );
          module = {
            ...module,
            groups: this.jsonGroups[module.fetch]
          };
        }

        module.weight = module[sizeProp];
        filteredModules.push(module);
      }

      return filteredModules;
    }, []);
  }
}

export const store = new Store();
