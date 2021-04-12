/** @jsx h */
import { h, Component } from "preact";
import ModulesTreemap from "./ModulesTreemap";
import { store } from "../store";
import { observer } from "mobx-preact";
import filesize from "filesize";

import sApp from "./App.css";

import SortableHeader from "./SortableHeader";

@observer
export default class PageList extends Component {
  render() {
    const activeSize = store.selectedSize || store.defaultSize;

    const filter = this.props.filter || ``;

    const sortFn =
      (this.props.sort && this.props.sort.compare) ||
      ((a, b) => a.pagePath.localeCompare(b.pagePath));

    const filteredPages = store.pages
      .filter((page) => {
        return (
          page.pagePath.includes(filter) ||
          page.componentChunkName.includes(filter)
        );
      })
      .sort(sortFn);

    const allPagesL = store.pages.length;
    const filteredPagesL = filteredPages.length;
    const showPagesL = Math.min(filteredPagesL, 50);

    // if (filter) {
    //   const exactMatch = filteredPages.findIndex(page => page.path === filter);
    // }

    console.log({ showPagesL });

    return (
      <div className={sApp.container}>
        <table border="1" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th colSpan={12}>
                Displayed: {showPagesL} / Filtered: {filteredPagesL} / Total:{" "}
                {allPagesL}
              </th>
            </tr>
            <tr>
              <SortableHeader
                rowSpan={3}
                sort={this.props.sort}
                onClick={this.handleSort}
                id="template"
              >
                Template
              </SortableHeader>
              <SortableHeader
                rowSpan={3}
                sort={this.props.sort}
                onClick={this.handleSort}
                id="path"
              >
                Page
              </SortableHeader>
              <SortableHeader
                rowSpan={3}
                sort={this.props.sort}
                onClick={this.handleSort}
                id="numberOfRequests"
              >
                Number of requests
              </SortableHeader>

              <th colSpan={9}>Size of requests</th>
            </tr>
            <tr>
              <th colSpan={4}>.js</th>
              <th colSpan={4}>data</th>
              <SortableHeader
                rowSpan={2}
                sort={this.props.sort}
                onClick={this.handleSort}
                id="total"
              >
                Total
              </SortableHeader>
            </tr>
            <tr>
              <th>App</th>
              <SortableHeader
                sort={this.props.sort}
                onClick={this.handleSort}
                id="jsPage"
              >
                Page
              </SortableHeader>
              <SortableHeader
                sort={this.props.sort}
                onClick={this.handleSort}
                id="jsModule"
              >
                Modules
              </SortableHeader>
              <SortableHeader
                sort={this.props.sort}
                onClick={this.handleSort}
                id="js"
              >
                Total
              </SortableHeader>
              <th>App</th>
              <SortableHeader
                sort={this.props.sort}
                onClick={this.handleSort}
                id="dataPage"
              >
                Page
              </SortableHeader>
              <th>Static query</th>
              <SortableHeader
                sort={this.props.sort}
                onClick={this.handleSort}
                id="data"
              >
                Total
              </SortableHeader>
            </tr>
          </thead>
          <tbody>
            {filteredPages.slice(0, showPagesL).map((page) => {
              const jsAppSize = page.assetSizes.app[activeSize];
              const jsPageSize = page.assetSizes.page[activeSize];
              const jsModuleSize = page.assetSizes.modules[activeSize];
              const appDataSize = page.assetSizes.appData[activeSize];
              const pageDataSize = page[activeSize];
              const sqDataSize = page.assetSizes.sqData[activeSize];

              // console.log(page);

              return (
                <tr
                  key={page.path}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    store.setPath(page.pagePath);
                  }}
                  className={sApp.itemRow}
                >
                  <td>
                    <code>{page.componentChunkName}</code>
                  </td>
                  <td>
                    <code>{page.pagePath}</code>
                  </td>
                  <td>
                    <code>{page.numberOfRequests}</code>
                  </td>
                  <td>
                    <code>{filesize(jsAppSize)}</code>
                  </td>
                  <td>
                    <code>{filesize(jsPageSize)}</code>
                  </td>
                  <td>
                    <code>{filesize(jsModuleSize)}</code>
                  </td>
                  <td>
                    <code>
                      {filesize(jsAppSize + jsPageSize + jsModuleSize)}
                    </code>
                  </td>
                  <td>
                    <code>{filesize(appDataSize)}</code>
                  </td>
                  <td>
                    <code>{filesize(pageDataSize)}</code>
                  </td>
                  <td>
                    <code>{filesize(sqDataSize)}</code>
                  </td>
                  <td>
                    <code>
                      {filesize(appDataSize + pageDataSize + sqDataSize)}
                    </code>
                  </td>
                  <td>
                    <code>
                      {filesize(
                        jsAppSize +
                          jsPageSize +
                          jsModuleSize +
                          pageDataSize +
                          appDataSize
                      )}
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  handleSort = (id) => {
    console.log({ id, b: this.props.sort });
    if (this.props.sort.key === id) {
      const newType = this.props.sortTypes.find((s) => {
        return s.key === id && s.order !== this.props.sort.order;
      });
      // console.log({ newType });
      if (newType) {
        this.props.handleSelectedSortChange(newType);
      }
    } else {
      const newType = this.props.sortTypes.find((s) => {
        return s.key === id;
      });
      // console.log({ newType });
      if (newType) {
        this.props.handleSelectedSortChange(newType);
      }
    }

    // if (this.state.sidebarPinned) {
    //   setTimeout(() => this.treemap.resize());
    // }
  };
}

// @observer
// export default class App extends Component {
//   render() {
//     if (store.path) {
//       return <ModulesTreemap />;
//       return (
//         <div>
//           <button
//             onClick={() => {
//               store.setPath(``);
//             }}
//           >
//             Go to page list
//           </button>
//           <ModulesTreemap />;
//         </div>
//       );
//     } else {
//       return <PageList />;
//     }
//   }
// }
