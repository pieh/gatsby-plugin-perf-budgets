const fs = require(`fs-extra`);
const path = require(`path`);
const { transform, kebabCase } = require(`lodash`);
const gzipSize = require("gzip-size");
const ejs = require("ejs");
const opener = require("opener");

const { getViewerData } = require(`./lib/analyzer`);

// const generateComponentChunkName = (componentPath, store) => {
//   const program = store.getState().program;
//   let directory = `/`;
//   if (program && program.directory) {
//     directory = program.directory;
//   }
//   const name = path.relative(directory, componentPath);
//   return `component---${kebabCase(name)}`;
// };

console.log(`test`);

const fixedPagePath = (pagePath) => (pagePath === `/` ? `index` : pagePath);

const getFilePath = ({ publicDir }, pagePath) =>
  path.join(publicDir, `page-data`, fixedPagePath(pagePath), `page-data.json`);

class GatsbyWebpackPerfBudgetPlugin {
  constructor(options) {
    this.plugin = { name: `GatsbyWebpackPerfBudgetPlugin` };
    this.opts = {
      storeStats: Promise.resolve(),
      ...(options || {}),
    };
  }

  apply(compiler) {
    // console.log("saving meeee");
    compiler.hooks.done.tapAsync(this.plugin.name, (stats, done) => {
      // console.log("saved meeee");
      this.opts.storeStats(stats.toJson()).then(done);
    });
  }
}

const STATS_CACHE_KEY = `stats`;

exports.onCreateWebpackConfig = ({ actions, stage, cache, reporter }) => {
  if (stage === `build-javascript`) {
    reporter.info(`[gatsby-plugin-perf-budgets] hooking into webpack`);
    actions.setWebpackConfig({
      plugins: [
        new GatsbyWebpackPerfBudgetPlugin({
          storeStats: async (stats) => {
            cache.set(STATS_CACHE_KEY, stats);
          },
        }),
      ],
    });
  }
};

const assetsRoot = path.join(__dirname, "public");

function getAssetContent(filename) {
  const assetPath = path.join(assetsRoot, filename);

  if (!assetPath.startsWith(assetsRoot)) {
    throw new Error(`"${filename}" is outside of the assets root`);
  }

  return fs.readFileSync(assetPath, "utf8");
}

// console.log("wat6");

function escapeJson(json) {
  return JSON.stringify(json).replace(/</gu, "\\u003c");
}

exports.onPostBuild = async ({ cache, store, reporter }) => {
  const stats = await cache.get(STATS_CACHE_KEY);
  const state = store.getState();
  const publicDir = path.join(state.program.directory, `public`);

  const data = getViewerData(stats, publicDir);

  // const componentPathToChunkName = {};
  // state.components.forEach(({ componentPath }) => {
  //   const chunkName = generateComponentChunkName(componentPath, store);
  //   componentPathToChunkName[componentPath] = chunkName;
  // });

  const traverse = (item, fn) => {
    fn(item);

    if (item.groups) {
      item.groups.forEach((subItem) => traverse(subItem, fn));
    }
  };

  // data.forEach((item) =>
  //   traverse(item, (item) => {
  //     if (item.path === `./public/static/d`) {
  //       item.label = "Static Queries Results";
  //     } else if (
  //       item.path &&
  //       item.path.startsWith(`./public/static/d`) &&
  //       item.path.endsWith(".json")
  //     ) {
  //       const hash = path.basename(item.path).replace(".json", "");
  //       const sqc = staticQueries[hash];
  //       item.label = `Static Query result (from "${sqc}")`;
  //       item.type = `static-data`;
  //       item.fetch = `/` + path.relative(`./public`, item.path);
  //     }
  //   })
  // );

  const chunksDataByChunkName = data.reduce((acc, item) => {
    acc[item.label] = {
      ...item,
      type: `module-chunk`,
    };

    return acc;
  }, {});

  const l = fs.readFileSync(
    path.join(publicDir, `webpack.stats.json`),
    `utf-8`
  );
  const webpackStatsJson = JSON.parse(l);

  // const z = (await fs.readJson(path.join(publicDir, `webpack.stats.json`), { encoding: `utf-8`}))
  // console.log({ z, p:path.join(publicDir, `webpack.stats.json`), l })

  const assetsByChunkName = transform(
    webpackStatsJson.assetsByChunkName,
    (result, names, key) => {
      result[key] = names.filter((v) => v.endsWith(`.js`));

      // return
    },
    {}
  );

  Object.keys(assetsByChunkName).forEach((chunkName) => {
    // chunk.forEach(asse)

    if (chunkName.startsWith(`component---`)) {
      const assets = assetsByChunkName[chunkName];
      assets.forEach((asset) => {
        chunksDataByChunkName[asset].type = `page-chunk`;
      });
    }
  });

  assetsByChunkName.app.forEach((appChunk) => {
    chunksDataByChunkName[appChunk].type = `app-chunk`;
  });

  const pagesData = {};
  // const moduleData = {};

  state.pages.forEach(({ componentChunkName, path: pagePath }) => {
    const pageDataStatsPath = getFilePath({ publicDir }, pagePath);

    const content = fs.readFileSync(pageDataStatsPath, `utf-8`);

    const parsedContent = JSON.parse(content);

    const moduleDependencies = parsedContent.moduleDependencies || [];
    const staticQueryHashes = parsedContent.staticQueryHashes || [];

    const result = {
      parsedSize: Buffer.byteLength(content),
      gzipSize: gzipSize.sync(content),
      statSize: 5000,
      label: `Page-data`,
      path: path.relative(state.program.directory, pageDataStatsPath),
      fetch: `/` + path.relative(publicDir, pageDataStatsPath),
      isAsset: true,
      groups: [],
      componentChunkName,
      moduleDependencies,
      staticQueryHashes,
      pagePath,
      // path: pagePath,
      type: `page-data`,
    };

    // moduleDependencies.forEach();

    pagesData[pagePath] = result;
  });

  const staticQueries = {};
  state.staticQueryComponents.forEach((sqc) => {
    const componentPath = path.relative(
      state.program.directory,
      sqc.componentPath
    );

    const staticQueryStatsPath = path.join(
      publicDir,
      `page-data`,
      `sq`,
      `d`,
      `${sqc.hash}.json`
    );

    const content = fs.readFileSync(staticQueryStatsPath, `utf-8`);

    // console.log({ sqc });
    staticQueries[sqc.hash] = {
      path: componentPath,

      parsedSize: Buffer.byteLength(content),
      gzipSize: gzipSize.sync(content),
      statSize: 5000,
      label: `Static query ${sqc.componentPath}`,
      type: `static-query-data`,
      fetch: `/` + path.relative(publicDir, staticQueryStatsPath),
      isAsset: true,
      groups: [],
    };
  });

  const appDataPath = path.join(publicDir, `page-data`, `app-data.json`);
  const content = fs.readFileSync(appDataPath, `utf-8`);

  const appData = {
    parsedSize: Buffer.byteLength(content),
    gzipSize: gzipSize.sync(content),
    statSize: 5000,
    label: `App-data`,
    path: path.relative(state.program.directory, appDataPath),
    fetch: `/` + path.relative(publicDir, appDataPath),
    isAsset: true,
    groups: [],
    // path: path.relative(publicDir, appDataPath),
    type: `app-data`,
  };

  // const { assetsByChunkName } = ;

  const reportFilename = `_report.html`;

  // debugger;

  await new Promise((resolve, reject) => {
    ejs.renderFile(
      `${__dirname}/views/gatsby.ejs`,
      {
        mode: "static",
        title: "Gatsby page resources and bundle analyzer",

        // chartData,
        assetsByChunkName,
        pagesData,
        chunksDataByChunkName,
        appData,
        staticQueries,

        defaultSizes: `gzip`,
        enableWebSocket: false,
        // Helpers
        assetContent: getAssetContent,
        escapeJson,
      },
      (err, reportHtml) => {
        try {
          if (err) {
            reporter.error(err);
            reject(err);
            return;
          }

          const reportFilepath = path.resolve(
            publicDir || process.cwd(),
            reportFilename
          );

          fs.ensureDirSync(path.dirname(reportFilepath));
          fs.writeFileSync(reportFilepath, reportHtml);

          // logger.info(
          //   `${bold("Webpack Bundle Analyzer")} saved report to ${bold(
          //     reportFilepath
          //   )}`
          // );

          // if (openBrowser) {
          // opener(`file://${reportFilepath}`);
          // }
          reporter.info(
            `[gatsby-plugin-perf-budgets] "${reportFilepath}" written`
          );
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    );
  });

  // debugger;
  // //
  await fs.outputJSON(`./public/_stats.json`, stats);
  // console.log("written to file");
};
