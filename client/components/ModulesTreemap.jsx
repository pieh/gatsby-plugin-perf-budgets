/** @jsx h */
import { h, Component } from "preact";
import filesize from "filesize";
import { computed } from "mobx";
import { observer } from "mobx-preact";

import { isChunkParsed } from "../utils";
import Treemap from "./Treemap";
import Tooltip from "./Tooltip";
import Switcher from "./Switcher";
import Sidebar from "./Sidebar";
import Checkbox from "./Checkbox";
import CheckboxList from "./CheckboxList";
import ContextMenu from "./ContextMenu";

import s from "./ModulesTreemap.css";
import Search from "./Search";
import { store } from "../store";
import ModulesList from "./ModulesList";
import PageList from "./App";

const SIZE_SWITCH_ITEMS = [
  // { label: "Stat", prop: "statSize" },
  { label: "Parsed", prop: "parsedSize" },
  { label: "Gzipped", prop: "gzipSize" }
];

const getPageRSize = (page, type) => {
  if (type === `numberOfRequests`) {
    return page.numberOfRequests;
  }

  const activeSize = store.selectedSize || store.defaultSize;

  const jsAppSize = page.assetSizes.app[activeSize];
  const jsPageSize = page.assetSizes.page[activeSize];
  const jsModuleSize = page.assetSizes.modules[activeSize];
  const appDataSize = page.assetSizes.appData[activeSize];
  const pageDataSize = page[activeSize];

  if (type === `total`) {
    return jsAppSize + jsPageSize + jsModuleSize + appDataSize + pageDataSize;
  }

  if (type === `js`) {
    return jsAppSize + jsPageSize + jsModuleSize;
  }

  if (type === `jsPage`) {
    return jsPageSize;
  }

  if (type === `jsModule`) {
    return jsModuleSize;
  }

  if (type === `data`) {
    return appDataSize + pageDataSize;
  }

  if (type === `dataPage`) {
    return pageDataSize;
  }

  return 0;
};

const createCompoarator = (type, mod = 1) => {
  return (a, b) => {
    return (getPageRSize(b, type) - getPageRSize(a, type)) * mod;
  };
};

const sortTypes = [
  {
    label: `By path (ASC)`,
    compare: (a, b) => a.pagePath.localeCompare(b.pagePath),
    key: `path`,
    order: `ASC`
  },
  {
    label: `By path (DESC)`,
    compare: (a, b) => b.pagePath.localeCompare(a.pagePath),
    key: `path`,
    order: `DESV`
  },
  {
    label: `By template (ASC)`,
    compare: (a, b) => a.componentChunkName.localeCompare(b.componentChunkName),
    key: `template`,
    order: `ASC`
  },
  {
    label: `By template (DESC)`,
    compare: (a, b) => b.componentChunkName.localeCompare(a.componentChunkName),
    key: `template`,
    order: `DESC`
  },
  {
    label: `Resources size (total) (DESC)`,
    compare: createCompoarator(`total`, 1),
    key: `total`,
    order: `DESC`
  },
  {
    label: `Resources size (total) (ASC)`,
    compare: createCompoarator(`total`, -1),
    key: `total`,
    order: `ASC`
  },
  {
    label: `JS size (total) (DESC)`,
    compare: createCompoarator(`js`, 1),
    key: `js`,
    order: `DESC`
  },
  {
    label: `JS size (total) (ASC)`,
    compare: createCompoarator(`js`, -1),
    key: `js`,
    order: `ASC`
  },
  {
    label: `JS size (template) (DESC)`,
    compare: createCompoarator(`jsPage`, 1),
    key: `jsPage`,
    order: `DESC`
  },
  {
    label: `JS size (template) (ASC)`,
    compare: createCompoarator(`jsPage`, -1),
    key: `jsPage`,
    order: `ASC`
  },
  {
    label: `JS size (page) (DESC)`,
    compare: createCompoarator(`jsModule`, 1),
    key: `jsModule`,
    order: `DESC`
  },
  {
    label: `JS size (page) (ASC)`,
    compare: createCompoarator(`jsModule`, -1),
    key: `jsModule`,
    order: `ASC`
  },
  {
    label: `Data size (total) (DESC)`,
    compare: createCompoarator(`data`, 1),
    key: `data`,
    order: `DESC`
  },
  {
    label: `Data size (total) (ASC)`,
    compare: createCompoarator(`data`, -1),
    key: `data`,
    order: `ASC`
  },
  {
    label: `Data size (page) (DESC)`,
    compare: createCompoarator(`dataPage`, 1),
    key: `dataPage`,
    order: `DESC`
  },
  {
    label: `Data size (page) (ASC)`,
    compare: createCompoarator(`dataPage`, -1),
    key: `dataPage`,
    order: `ASC`
  },
  {
    label: `Number of requests (DESC)`,
    compare: createCompoarator(`numberOfRequests`, 1),
    key: `numberOfRequests`,
    order: `DESC`
  },
  {
    label: `Number of requests (ASC)`,
    compare: createCompoarator(`numberOfRequests`, -1),
    key: `numberOfRequests`,
    order: `ASC`
  }
];

@observer
export default class ModulesTreemap extends Component {
  mouseCoords = {
    x: 0,
    y: 0
  };

  state = {
    selectedChunk: null,
    selectedMouseCoords: { x: 0, y: 0 },
    sidebarPinned: true,
    showChunkContextMenu: false,
    showTooltip: false,
    tooltipContent: null,
    pageFilter: ``,
    pageSortType: sortTypes[0]
    // pageSortOrder: `asc`
  };

  componentDidMount() {
    document.addEventListener("mousemove", this.handleMouseMove, true);
  }

  componentWillUnmount() {
    document.removeEventListener("mousemove", this.handleMouseMove, true);
  }

  render() {
    const {
      selectedChunk,
      selectedMouseCoords,
      sidebarPinned,
      showChunkContextMenu,
      showTooltip,
      tooltipContent,
      pageFilter,
      pageSortType
    } = this.state;

    const isRoot = store.path === ``;

    return (
      <div className={s.container}>
        <Sidebar
          pinned={sidebarPinned}
          onToggle={this.handleSidebarToggle}
          onPinStateChange={this.handleSidebarPinStateChange}
          onResize={this.handleSidebarResize}
        >
          <div className={s.sidebarGroup}>
            <Switcher
              label="Treemap sizes"
              items={this.sizeSwitchItems}
              activeItem={this.activeSizeItem}
              onSwitch={this.handleSizeSwitch}
            />
            {store.hasConcatenatedModules && (
              <div className={s.showOption}>
                <Checkbox
                  checked={store.showConcatenatedModulesContent}
                  onChange={this.handleConcatenatedModulesContentToggle}
                >
                  {`Show content of concatenated modules${
                    store.activeSize === "statSize" ? "" : " (inaccurate)"
                  }`}
                </Checkbox>
              </div>
            )}
            {!isRoot && (
              <div className={s.showOption}>
                <Checkbox
                  checked={store.showDetailedQueryResults}
                  onChange={this.handleDetailedQueryResultToggle}
                >
                  Show details of query results
                </Checkbox>
              </div>
            )}
          </div>
          {isRoot ? (
            <div className={s.sidebarGroup}>
              <Search
                label="Search pages"
                query={pageFilter}
                placeholder="Enter part of page path or template"
                autofocus
                onQueryChange={this.handlePageQueryChange}
              />
            </div>
          ) : (
            <div className={s.sidebarGroup}>
              <Search
                label="Search modules"
                query={store.searchQuery}
                autofocus
                onQueryChange={this.handleQueryChange}
              />
              <div className={s.foundModulesInfo}>{this.foundModulesInfo}</div>
              {store.isSearching && store.hasFoundModules && (
                <div className={s.foundModulesContainer}>
                  {store.foundModulesByChunk.map(({ chunk, modules }) => (
                    <div key={chunk.cid} className={s.foundModulesChunk}>
                      <div
                        className={s.foundModulesChunkName}
                        onClick={() => this.treemap.zoomToGroup(chunk)}
                      >
                        {chunk.label}
                      </div>
                      <ModulesList
                        className={s.foundModulesList}
                        modules={modules}
                        showSize={store.activeSize}
                        highlightedText={store.searchQueryRegexp}
                        isModuleVisible={this.isModuleVisible}
                        onModuleClick={this.handleFoundModuleClick}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {this.chunkItems.length > 1 && (
            <div className={s.sidebarGroup}>
              <CheckboxList
                label="Show chunks"
                group={true}
                activeSize={store.activeSize}
                items={this.chunkItems}
                checkedItems={store.selectedChunks}
                renderLabel={this.renderChunkItemLabel}
                onChange={this.handleSelectedChunksChange}
              />
            </div>
          )}
          {isRoot && (
            <div className={s.sidebarGroup}>
              <Switcher
                label="Sort pages"
                items={sortTypes}
                activeItem={pageSortType}
                separateLines
                onSwitch={this.handleSelectedSortChange}
              />
            </div>
          )}
          {!isRoot && (
            <div className={s.sidebarGroup}>
              <button
                onClick={() => {
                  store.setPath(``);
                }}
              >
                Go to page list
              </button>
              {/* <div style={{ fontWeight: "bold" }}>Pages</div>
            <ul style={{ margin: 0, paddingLeft: `2em` }}>
              {Object.keys(window.pagesData).map(path => (
                <li
                  key={path}
                  style={{
                    color: "blue",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    store.setPath(path);
                  }}
                >
                  {path}
                </li>
              ))}
            </ul> */}
            </div>
          )}
        </Sidebar>
        {isRoot ? (
          <PageList
            filter={pageFilter}
            sort={pageSortType}
            handleSelectedSortChange={this.handleSelectedSortChange}
            sortTypes={sortTypes}
          />
        ) : (
          [
            <Treemap
              ref={this.saveTreemapRef}
              className={s.map}
              data={store.visibleChunks}
              highlightGroups={this.highlightedModules}
              weightProp={store.activeSize}
              onMouseLeave={this.handleMouseLeaveTreemap}
              onGroupHover={this.handleTreemapGroupHover}
              onGroupSecondaryClick={this.handleTreemapGroupSecondaryClick}
              onResize={this.handleResize}
            />,
            <Tooltip visible={showTooltip}>{tooltipContent}</Tooltip>,
            <ContextMenu
              visible={showChunkContextMenu}
              chunk={selectedChunk}
              coords={selectedMouseCoords}
              onHide={this.handleChunkContextMenuHide}
            />
          ]
        )}
      </div>
    );
  }

  renderModuleSize(module, sizeType) {
    const sizeProp = `${sizeType}Size`;
    const size = module[sizeProp];
    const sizeLabel = SIZE_SWITCH_ITEMS.find(item => item.prop === sizeProp)
      .label;
    const isActive = store.activeSize === sizeProp;

    return typeof size === "number" ? (
      <div className={isActive ? s.activeSize : ""}>
        {sizeLabel} size: <strong>{filesize(size)}</strong>
      </div>
    ) : null;
  }

  renderSortItemLabel = item => {
    return [item.label];
  };

  renderChunkItemLabel = item => {
    const isAllItem = item === CheckboxList.ALL_ITEM;
    const label = isAllItem ? "All" : item.label;
    const size = isAllItem ? store.totalChunksSize : item[store.activeSize];

    return [`${label} (`, <strong>{filesize(size)}</strong>, ")"];
  };

  @computed get sizeSwitchItems() {
    return SIZE_SWITCH_ITEMS;
    // return store.hasParsedSizes
    //   ? SIZE_SWITCH_ITEMS
    //   : SIZE_SWITCH_ITEMS.slice(0, 1);
  }

  @computed get activeSizeItem() {
    return this.sizeSwitchItems.find(item => item.prop === store.activeSize);
  }

  @computed get chunkItems() {
    const { allChunks, activeSize } = store;
    let chunkItems = [...allChunks];

    if (activeSize !== "statSize") {
      chunkItems = chunkItems.filter(isChunkParsed);
    }

    chunkItems.sort(
      (chunk1, chunk2) => chunk2[activeSize] - chunk1[activeSize]
    );

    return chunkItems;
  }

  @computed get highlightedModules() {
    return new Set(store.foundModules);
  }

  @computed get foundModulesInfo() {
    if (!store.isSearching) {
      // `&nbsp;` to reserve space
      return "\u00A0";
    }

    if (store.hasFoundModules) {
      return [
        <div className={s.foundModulesInfoItem}>
          Count: <strong>{store.foundModules.length}</strong>
        </div>,
        <div className={s.foundModulesInfoItem}>
          Total size: <strong>{filesize(store.foundModulesSize)}</strong>
        </div>
      ];
    } else {
      return (
        "Nothing found" + (store.allChunksSelected ? "" : " in selected chunks")
      );
    }
  }

  handleConcatenatedModulesContentToggle = flag => {
    store.setShowConcatenatedModulesContent(flag);
  };

  handleDetailedQueryResultToggle = flag => {
    store.setShowDetailedQueryResults(flag);
  };

  handleChunkContextMenuHide = () => {
    this.setState({
      showChunkContextMenu: false
    });
  };

  handleResize = () => {
    // Close any open context menu when the report is resized,
    // so it doesn't show in an incorrect position
    if (this.state.showChunkContextMenu) {
      this.setState({
        showChunkContextMenu: false
      });
    }
  };

  handleSidebarToggle = () => {
    if (this.state.sidebarPinned) {
      setTimeout(() => this.treemap.resize());
    }
  };

  handleSidebarPinStateChange = pinned => {
    this.setState({ sidebarPinned: pinned });
    setTimeout(() => this.treemap.resize());
  };

  handleSidebarResize = () => {
    this.treemap.resize();
  };

  handleSizeSwitch = sizeSwitchItem => {
    store.setSelectedSize(sizeSwitchItem.prop);
    // store.selectedSize = sizeSwitchItem.prop;
  };

  handleQueryChange = query => {
    store.searchQuery = query;
  };

  handlePageQueryChange = pageFilter => {
    this.setState({ pageFilter });
  };

  handleSelectedChunksChange = selectedChunks => {
    store.selectedChunks = selectedChunks;
  };

  handleSelectedSortChange = pageSortType => {
    this.setState({
      pageSortType
    });
  };

  handleMouseLeaveTreemap = () => {
    this.setState({ showTooltip: false });
  };

  handleTreemapGroupSecondaryClick = event => {
    const { group } = event;

    if (group && group.isAsset) {
      this.setState({
        selectedChunk: group,
        selectedMouseCoords: { ...this.mouseCoords },
        showChunkContextMenu: true
      });
    } else {
      this.setState({
        selectedChunk: null,
        showChunkContextMenu: false
      });
    }
  };

  handleTreemapGroupHover = event => {
    const { group } = event;

    if (group) {
      this.setState({
        showTooltip: true,
        tooltipContent: this.getTooltipContent(group)
      });
    } else {
      this.setState({ showTooltip: false });
    }
  };

  handleFoundModuleClick = module => this.treemap.zoomToGroup(module);

  handleMouseMove = event => {
    Object.assign(this.mouseCoords, {
      x: event.pageX,
      y: event.pageY
    });
  };

  isModuleVisible = module => this.treemap.isGroupRendered(module);

  saveTreemapRef = treemap => (this.treemap = treemap);

  getTooltipContent(module) {
    if (!module) return null;
    const round = num => (Math.round(num * 100) / 100).toFixed(2);
    return (
      <div>
        <div>
          <strong>{module.label}</strong>
        </div>
        <br />
        {this.renderModuleSize(module, "parsed")} (
        {round((100 * module.parsedSize) / store.totalChunksSizeParsed)}% of
        total)
        {/* {!module.inaccurateSizes && this.renderModuleSize(module, "parsed")} */}
        {!module.inaccurateSizes && (
          <span>
            {this.renderModuleSize(module, "gzip")} (
            {round((100 * module.gzipSize) / store.totalChunksSizeGzip)}% of
            total)
          </span>
        )}
        {module.path && (
          <div>
            Path: <strong>{module.path}</strong>
          </div>
        )}
        {module.isAsset && (
          <div>
            <br />
            <strong>
              <em>Right-click to view options related to this chunk</em>
            </strong>
          </div>
        )}
      </div>
    );
  }
}
