import { Buffer } from "buffer";

export function isChunkParsed(chunk) {
  return typeof chunk.parsedSize === "number";
}

export function walkModules(modules, cb) {
  for (const module of modules) {
    if (cb(module) === false) return false;

    if (module.groups) {
      if (walkModules(module.groups, cb) === false) {
        return false;
      }
    }
  }
}

export function elementIsOutside(elem, container) {
  return !(elem === container || container.contains(elem));
}

export function getChunksForPath(path) {
  const pagesData = window.pagesData[path];
  if (!pagesData) {
    return [];
  }

  const assets = window.assetsByChunkName[pagesData.componentChunkName];
  const appAssets = window.assetsByChunkName.app;
  const moduleAssets = pagesData.moduleDependencies
    .map((moduleDepChunkName) => {
      return window.assetsByChunkName[moduleDepChunkName];
    })
    .flat();

  const staticQueriesAssets = pagesData.staticQueryHashes
    .map((sqhash) => {
      return window.staticQueries[sqhash];
    })
    .flat();

  const together = Array.from(
    new Set([...appAssets, ...assets, ...moduleAssets])
  );

  const allChunks = [
    pagesData,
    window.appData,
    ...staticQueriesAssets,
    ...together.map((assetName) => window.chunksDataByChunkName[assetName]),
  ];

  console.log({ allChunks });

  return allChunks;
}

export function createGroupsFromJson(json, module) {
  const groups = [];

  const generateGzip = (parsedSize) => {
    // this is wrong ... but better than none
    const gzipSize = (parsedSize / module.parsedSize) * module.gzipSize;
    return { gzipSize };
  };

  const handleValKey = (val, key) => {
    const content = JSON.stringify(val);
    const parsedSize = Buffer.byteLength(content);

    const group = {
      label: key,
      parsedSize,
      weight: parsedSize,
      ...generateGzip(parsedSize),
      groups: createGroupsFromJson(val, module, key),
    };

    groups.push(group);
  };

  if (Array.isArray(json)) {
    json.forEach((val, key) => {
      handleValKey(val, key);
    });
  } else if (json && typeof json === "object") {
    Object.keys(json).forEach((key) => {
      const val = json[key];
      handleValKey(val, key);
    });
  } else {
  }

  return groups;
}
