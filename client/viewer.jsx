/** @jsx h */
import { h, render } from "preact";

import { store } from "./store";
import { getChunksForPath } from "./utils";
import ModulesTreemap from "./components/ModulesTreemap";
// import App from "./components/App";
/* eslint no-unused-vars: "off" */
import styles from "./viewer.css";

window.addEventListener(
  "load",
  () => {
    store.defaultSize = `${window.defaultSizes}Size`;

    // one time calcs
    window._pages = store.pages = Object.keys(window.pagesData).map((path) => {
      const page = window.pagesData[path];
      const chunks = getChunksForPath(path);

      // 2 = app-data + page-data
      page.chunks = chunks;
      page.numberOfRequests = chunks.length;

      page.assetSizes = {
        app: {
          parsedSize: 0,
          gzipSize: 0,
        },
        appData: {
          parsedSize: 0,
          gzipSize: 0,
        },
        page: {
          parsedSize: 0,
          gzipSize: 0,
        },
        modules: {
          parsedSize: 0,
          gzipSize: 0,
        },
        sqData: {
          parsedSize: 0,
          gzipSize: 0,
        },
      };

      chunks.forEach((chunk) => {
        let where = null;
        if (chunk.type === `app-chunk`) {
          where = page.assetSizes.app;
        } else if (chunk.type === `page-chunk`) {
          where = page.assetSizes.page;
        } else if (chunk.type === `app-data`) {
          where = page.assetSizes.appData;
        } else if (chunk.type === `module-chunk`) {
          where = page.assetSizes.modules;
        } else if (chunk.type === `static-query-data`) {
          where = page.assetSizes.sqData;
        }

        if (where) {
          where.parsedSize += chunk.parsedSize;
          where.gzipSize += chunk.gzipSize;
        }

        // const key = chunk.type ? `si`
      });

      return page;
    });

    store.handleURLparams(location.hash);
    // if (!store.path) {
    //   store.setPath(``);
    // }

    window.addEventListener(`popstate`, (event) => {
      store.handleURLparams(location.hash, { doHistoryAction: false });
    });

    render(<ModulesTreemap />, document.getElementById("app"));
  },
  false
);
